import { randomUUID } from 'node:crypto';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import archetypes from '../../data-management/data/archetypes.json';
import apocalypses from '../../data-management/data/apocalypses.json';
import ages from '../../data-management/data/ages.json';
import skills from '../../data-management/data/skills.json';
import specialAbilities from '../../data-management/data/special-abilities.json';
import luckyMutations from '../../data-management/data/lucky-mutation.json';
import negativeTraits from '../../data-management/data/negative-traits.json';
import gear from '../../data-management/data/gear.json';
import bugOutKits from '../../data-management/data/bug-out-kits.json';
import otherRules from '../../data-management/data/other-rules.json';
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED'
});
const tableName = process.env.TABLE_NAME ?? '';
const frontendOriginsValue = process.env.FRONTEND_ORIGINS ?? '';
const itemsIndexName = process.env.ITEMS_INDEX_NAME ?? '';
const characterImagesBucket = process.env.CHARACTER_IMAGES_BUCKET ?? '';
const characterImagesBaseUrl = (
  process.env.CHARACTER_IMAGES_BASE_URL ?? ''
).replace(/\/+$/, '');

const CHARACTER_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
const MAX_CHARACTER_IMAGE_BYTES = 4 * 1024 * 1024;

if (
  !tableName ||
  !frontendOriginsValue ||
  !itemsIndexName ||
  !characterImagesBucket ||
  !characterImagesBaseUrl
) {
  throw new Error(
    'TABLE_NAME, FRONTEND_ORIGINS, ITEMS_INDEX_NAME, CHARACTER_IMAGES_BUCKET, and CHARACTER_IMAGES_BASE_URL must be configured.'
  );
}

let frontendOrigins: string[];
try {
  const configuredOrigins: unknown = JSON.parse(frontendOriginsValue);
  if (
    !Array.isArray(configuredOrigins) ||
    configuredOrigins.length === 0 ||
    configuredOrigins.some((origin) => typeof origin !== 'string')
  ) {
    throw new Error('FRONTEND_ORIGINS must be a JSON array of origin strings.');
  }
  frontendOrigins = configuredOrigins;
} catch (error) {
  if (error instanceof SyntaxError) {
    throw new Error('FRONTEND_ORIGINS must be valid JSON.', { cause: error });
  }
  throw error;
}

interface Item {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

type JsonObject = Record<string, unknown>;

function response(
  statusCode: number,
  body?: unknown,
  requestOrigin?: string
): APIGatewayProxyResult {
  const allowOrigin =
    requestOrigin && frontendOrigins.includes(requestOrigin)
      ? requestOrigin
      : frontendOrigins[0];

  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      Vary: 'Origin',
      'Content-Type': 'application/json'
    },
    body: body === undefined ? '' : JSON.stringify(body)
  };
}

function parseJsonObject(body: string | null): JsonObject | null {
  if (!body) return null;

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as JsonObject;
}

function parseItemBody(body: string | null): {
  title: string;
  description?: string;
} | null {
  if (!body) return null;

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    !('title' in value) ||
    typeof value.title !== 'string' ||
    value.title.trim().length === 0 ||
    value.title.length > 200 ||
    ('description' in value &&
      value.description !== undefined &&
      typeof value.description !== 'string')
  ) {
    return null;
  }

  return {
    title: value.title.trim(),
    ...('description' in value && typeof value.description === 'string'
      ? { description: value.description }
      : {})
  };
}

function isAdmin(claims: unknown): boolean {
  if (!claims || typeof claims !== 'object') return false;
  const groups = (claims as Record<string, unknown>)['cognito:groups'];
  if (Array.isArray(groups)) return groups.includes('admin');
  return typeof groups === 'string' && groups.split(',').includes('admin');
}

function withoutStorageKeys(item: Record<string, unknown>): JsonObject {
  const {
    ...record
  } = item;
  return record;
}

function requireStoredJsonObject(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Stored resource data is invalid.');
  }
  return value as JsonObject;
}

function requireStoredAgeData(value: unknown): unknown[] {
  const statKeys = ['str', 'for', 'agi', 'int', 'ins', 'cha', 'fs', 'bs', 'luck'];
  const isModifierSet = (candidate: unknown) =>
    typeof candidate === 'object' &&
    candidate !== null &&
    !Array.isArray(candidate) &&
    statKeys.every(
      (key) =>
        typeof (candidate as Record<string, unknown>)[key] === 'number'
    );

  if (
    !Array.isArray(value) ||
    value.some((age) => {
      if (typeof age !== 'object' || age === null || Array.isArray(age)) {
        return true;
      }
      const record = age as Record<string, unknown>;
      return [
        'range',
        'category',
        'skillProf'
      ].some((field) => typeof record[field] !== 'string') ||
        !isModifierSet(record.modifiers);
    })
  ) {
    throw new Error('Stored age data is invalid.');
  }
  return value;
}

function requireStoredSkillData(value: unknown): unknown[] {
  if (
    !Array.isArray(value) ||
    value.some((skill) => {
      if (
        typeof skill !== 'object' ||
        skill === null ||
        Array.isArray(skill)
      ) {
        return true;
      }
      const record = skill as Record<string, unknown>;
      return (
        typeof record.name !== 'string' ||
        typeof record.baseStat !== 'string' ||
        typeof record.combat !== 'boolean' ||
        (record.apocalypseSkill !== undefined &&
          typeof record.apocalypseSkill !== 'boolean')
      );
    })
  ) {
    throw new Error('Stored skill data is invalid.');
  }
  return value;
}

function isStoredBugOutKitEntry(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  if (typeof entry.quantity !== 'number') {
    return false;
  }
  if (Array.isArray(entry.options)) {
    return entry.options.every(
      (option) =>
        typeof option === 'object' &&
        option !== null &&
        typeof (option as { slug?: unknown }).slug === 'string'
    );
  }
  return typeof entry.slug === 'string';
}

function requireStoredBugOutKits(value: unknown): unknown[] {
  if (
    !Array.isArray(value) ||
    value.some((kit) => {
      if (typeof kit !== 'object' || kit === null || Array.isArray(kit)) {
        return true;
      }
      const record = kit as Record<string, unknown>;
      return (
        typeof record.slug !== 'string' ||
        typeof record.name !== 'string' ||
        !Array.isArray(record.items) ||
        !record.items.every(isStoredBugOutKitEntry)
      );
    })
  ) {
    throw new Error('Stored bug-out kit data is invalid.');
  }
  return value;
}

function requireStoredGearCatalog(value: unknown): {
  gear: unknown[];
  bugOutKits: unknown[];
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Stored gear data is invalid.');
  }
  const record = value as Record<string, unknown>;
  return {
    gear: requireStoredStartingGearData(record.gear),
    bugOutKits: requireStoredBugOutKits(record.bugOutKits)
  };
}

function requireStoredStartingGearData(value: unknown): unknown[] {
  const categories = new Set(['armor', 'weapon', 'gear', 'ammo']);
  if (
    !Array.isArray(value) ||
    value.some((gear) => {
      if (typeof gear !== 'object' || gear === null || Array.isArray(gear)) {
        return true;
      }
      const record = gear as Record<string, unknown>;
      return (
        typeof record.slug !== 'string' ||
        typeof record.name !== 'string' ||
        typeof record.category !== 'string' ||
        !categories.has(record.category) ||
        typeof record.cp !== 'number' ||
        (record.description !== undefined &&
          typeof record.description !== 'string') ||
        (record.dc !== undefined &&
          (record.category !== 'weapon' || typeof record.dc !== 'string')) ||
        (record.skill !== undefined &&
          (record.category !== 'weapon' || typeof record.skill !== 'string')) ||
        'bugOutKit' in record ||
        'items' in record
      );
    })
  ) {
    throw new Error('Stored starting gear data is invalid.');
  }
  return value;
}

function isStoredDamageCode(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const code = value as Record<string, unknown>;
  return (
    typeof code.degree === 'number' &&
    typeof code.code === 'string' &&
    typeof code.description === 'string' &&
    typeof code.dice === 'string'
  );
}

function requireStoredOtherRulesData(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Stored other rules data is invalid.');
  }
  const record = value as Record<string, unknown>;
  const build = record.build;
  const damageCodes = record.damageCodes;
  if (
    !Array.isArray(build) ||
    build.some((band) => {
      if (typeof band !== 'object' || band === null || Array.isArray(band)) {
        return true;
      }
      const entry = band as Record<string, unknown>;
      return (
        typeof entry.min !== 'number' ||
        typeof entry.max !== 'number' ||
        typeof entry.dcMod !== 'number' ||
        typeof entry.foodMod !== 'number' ||
        typeof entry.contortMod !== 'number'
      );
    }) ||
    !Array.isArray(damageCodes) ||
    !damageCodes.every(isStoredDamageCode)
  ) {
    throw new Error('Stored other rules data is invalid.');
  }
  return value;
}

function requireStoredNegativeTraitData(value: unknown): unknown[] {
  if (
    !Array.isArray(value) ||
    value.some((trait) => {
      if (
        typeof trait !== 'object' ||
        trait === null ||
        Array.isArray(trait)
      ) {
        return true;
      }
      const record = trait as Record<string, unknown>;
      return (
        typeof record.name !== 'string' ||
        typeof record.description !== 'string'
      );
    })
  ) {
    throw new Error('Stored negative trait data is invalid.');
  }
  return value;
}

function requireStoredLuckyMutationData(value: unknown): unknown[] {
  if (
    !Array.isArray(value) ||
    value.some((mutation) => {
      if (
        typeof mutation !== 'object' ||
        mutation === null ||
        Array.isArray(mutation)
      ) {
        return true;
      }
      const record = mutation as Record<string, unknown>;
      const powers = record.powers;
      const powersInvalid =
        powers !== undefined &&
        (!Array.isArray(powers) ||
          powers.some((power) => {
            if (
              typeof power !== 'object' ||
              power === null ||
              Array.isArray(power)
            ) {
              return true;
            }
            const powerRecord = power as Record<string, unknown>;
            return (
              typeof powerRecord.name !== 'string' ||
              typeof powerRecord.description !== 'string'
            );
          }));
      return (
        typeof record.roll !== 'number' ||
        typeof record.name !== 'string' ||
        typeof record.description !== 'string' ||
        powersInvalid
      );
    })
  ) {
    throw new Error('Stored lucky mutation data is invalid.');
  }
  return value;
}

function requireStoredSpecialAbilityData(value: unknown): unknown[] {
  if (
    !Array.isArray(value) ||
    value.some((ability) => {
      if (
        typeof ability !== 'object' ||
        ability === null ||
        Array.isArray(ability)
      ) {
        return true;
      }
      const record = ability as Record<string, unknown>;
      return (
        typeof record.name !== 'string' ||
        typeof record.description !== 'string' ||
        typeof record.source !== 'string'
      );
    })
  ) {
    throw new Error('Stored special ability data is invalid.');
  }
  return value;
}

function requireStoredSelectionData(
  value: unknown,
  kind: 'archetype' | 'apocalypse'
): unknown[] {
  const statKeys = ['str', 'for', 'agi', 'int', 'ins', 'cha', 'fs', 'bs', 'luck'];
  const isStringArray = (candidate: unknown) =>
    Array.isArray(candidate) &&
    candidate.every((entry) => typeof entry === 'string');
  const isModifierSet = (candidate: unknown) =>
    typeof candidate === 'object' &&
    candidate !== null &&
    !Array.isArray(candidate) &&
    statKeys.every(
      (key) =>
        typeof (candidate as Record<string, unknown>)[key] === 'number'
    );

  if (
    !Array.isArray(value) ||
    value.some((option) => {
      if (
        typeof option !== 'object' ||
        option === null ||
        Array.isArray(option)
      ) {
        return true;
      }
      const record = option as Record<string, unknown>;
      const description = record.description;
      return (
        typeof record.name !== 'string' ||
        !(typeof description === 'string' ||
          (Array.isArray(description) &&
            description.every((paragraph) => typeof paragraph === 'string'))) ||
        !isStringArray(record.skills) ||
        (record.bestStats !== undefined && !isStringArray(record.bestStats)) ||
        (record.commonSkills !== undefined &&
          !isStringArray(record.commonSkills)) ||
        (record.imageUrl !== undefined && typeof record.imageUrl !== 'string') ||
        (kind === 'archetype' &&
          (!isModifierSet(record.primaryModifiers) ||
            !isModifierSet(record.secondaryModifiers))) ||
        (kind === 'apocalypse' && !isModifierSet(record.modifiers))
      );
    })
  ) {
    throw new Error('Stored character creation data is invalid.');
  }
  return value;
}

async function getCharacterCreationData(
  sortKey:
    | 'ARCHETYPES'
    | 'APOCALYPSES'
    | 'AGES'
    | 'SKILLS'
    | 'SPECIAL_ABILITIES'
    | 'LUCKY_MUTATION'
    | 'NEGATIVE_TRAITS'
    | 'GEAR'
    | 'OTHER_RULES',
  defaultData: unknown,
  validate: (value: unknown) => unknown
): Promise<unknown> {
  const key = {
    PK: 'DATA#CHARACTER_CREATION',
    SK: sortKey
  };
  const readStoredData = async () => {
    const result = await client.send(
      new GetCommand({ TableName: tableName, Key: key })
    );
    return result.Item ? validate(result.Item.data) : null;
  };

  const existingData = await readStoredData();
  if (existingData) return existingData;

  try {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: { ...key, data: defaultData },
        ConditionExpression: 'attribute_not_exists(PK)'
      })
    );
    return defaultData;
  } catch (error) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('name' in error) ||
      error.name !== 'ConditionalCheckFailedException'
    ) {
      throw error;
    }
  }

  const storedData = await readStoredData();
  if (!storedData) {
    throw new Error(
      `Character creation data (${sortKey}) was not available after initialization.`
    );
  }
  return storedData;
}

function characterImagePrefix(userId: string, characterId: string): string {
  return `characters/${userId}/${characterId}/`;
}

function matchesImageSignature(contentType: string, bytes: Buffer): boolean {
  if (contentType === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  if (contentType === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (contentType === 'image/gif') {
    if (bytes.length < 6) {
      return false;
    }
    const header = bytes.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (contentType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function readCharacterImage(
  body: string | null
):
  | { ok: true; contentType: string; extension: string; bytes: Buffer }
  | { ok: false; message: string } {
  const invalid = {
    ok: false as const,
    message: 'Choose a JPEG, PNG, WebP, or GIF image.'
  };
  const data = parseJsonObject(body);
  if (
    !data ||
    typeof data.contentType !== 'string' ||
    typeof data.image !== 'string'
  ) {
    return invalid;
  }
  const extension = CHARACTER_IMAGE_EXTENSIONS[data.contentType];
  if (!extension || data.image.length % 4 !== 0) {
    return invalid;
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data.image)) {
    return invalid;
  }
  const bytes = Buffer.from(data.image, 'base64');
  if (bytes.length === 0) {
    return invalid;
  }
  if (bytes.length > MAX_CHARACTER_IMAGE_BYTES) {
    return { ok: false, message: 'Image must be 4 MB or smaller.' };
  }
  if (!matchesImageSignature(data.contentType, bytes)) {
    return invalid;
  }
  return { ok: true, contentType: data.contentType, extension, bytes };
}

async function characterExists(
  userId: string,
  characterId: string
): Promise<boolean> {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `CHARACTER#${characterId}`
      }
    })
  );
  return Boolean(result.Item);
}

async function deleteCharacterImageObjects(
  userId: string,
  characterId: string,
  keepKey?: string
): Promise<void> {
  const prefix = characterImagePrefix(userId, characterId);
  let continuationToken: string | undefined;
  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: characterImagesBucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    );
    const keys = (listed.Contents ?? [])
      .map((item) => item.Key)
      .filter(
        (key): key is string => typeof key === 'string' && key !== keepKey
      );
    if (keys.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: characterImagesBucket,
          Delete: { Objects: keys.slice(0, 1000).map((Key) => ({ Key })) }
        })
      );
    }
    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

const MAX_BUG_REPORT_DESCRIPTION_LENGTH = 2000;
const MAX_BUG_REPORT_PATH_LENGTH = 300;

async function handleBugReport(
  event: APIGatewayProxyEvent,
  userId: string,
  requestOrigin: string | undefined
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod !== 'POST') {
    return response(405, { message: 'Method not allowed.' }, requestOrigin);
  }

  const body = parseJsonObject(requestBody(event));
  const description =
    typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return response(400, { message: 'Describe the bug.' }, requestOrigin);
  }
  if (description.length > MAX_BUG_REPORT_DESCRIPTION_LENGTH) {
    return response(
      400,
      { message: 'Bug reports must be 2000 characters or fewer.' },
      requestOrigin
    );
  }

  const path = body?.path;
  if (
    path !== undefined &&
    (typeof path !== 'string' || path.length > MAX_BUG_REPORT_PATH_LENGTH)
  ) {
    return response(400, { message: 'The page path is invalid.' }, requestOrigin);
  }

  const emailValue = event.requestContext.authorizer?.claims?.email;
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: 'BUG_REPORT',
        SK: `${createdAt}#${id}`,
        id,
        userId,
        ...(typeof emailValue === 'string' && emailValue.trim()
          ? { email: emailValue.trim() }
          : {}),
        description,
        ...(typeof path === 'string' && path ? { path } : {}),
        createdAt
      }
    })
  );
  return response(201, { id }, requestOrigin);
}

function requestBody(event: APIGatewayProxyEvent): string | null {
  if (!event.body) {
    return null;
  }
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64').toString('utf8');
  }
  return event.body;
}

async function handleCharacterImage(
  event: APIGatewayProxyEvent,
  userId: string,
  requestOrigin: string | undefined
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const characterId = event.pathParameters?.characterId;
  if (!characterId) {
    return response(
      400,
      { message: 'A character ID is required.' },
      requestOrigin
    );
  }
  if (!(await characterExists(userId, characterId))) {
    return response(404, { message: 'Character not found.' }, requestOrigin);
  }

  if (method === 'DELETE') {
    await deleteCharacterImageObjects(userId, characterId);
    return response(204, undefined, requestOrigin);
  }
  if (method !== 'POST') {
    return response(405, { message: 'Method not allowed.' }, requestOrigin);
  }

  const image = readCharacterImage(requestBody(event));
  if (!image.ok) {
    return response(400, { message: image.message }, requestOrigin);
  }
  const key = `${characterImagePrefix(userId, characterId)}${randomUUID()}.${image.extension}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: characterImagesBucket,
      Key: key,
      Body: image.bytes,
      ContentType: image.contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
  await deleteCharacterImageObjects(userId, characterId, key);
  return response(
    200,
    { avatar: `${characterImagesBaseUrl}/${key}` },
    requestOrigin
  );
}

async function handleRequest(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const id = event.pathParameters?.id;
  const resource = event.resource;
  const userId = event.requestContext.authorizer?.claims?.sub;
  const requestOrigin =
    event.headers?.origin ?? event.headers?.Origin;

  if (!userId) {
    return response(401, { message: 'Authentication is required.' }, requestOrigin);
  }

  if (method === 'GET') {
    switch (resource) {
      case '/data/archetypes':
        return response(
          200,
          await getCharacterCreationData(
            'ARCHETYPES',
            archetypes,
            (value) => requireStoredSelectionData(value, 'archetype')
          ),
          requestOrigin
        );
      case '/data/apocalypses':
        return response(
          200,
          await getCharacterCreationData(
            'APOCALYPSES',
            apocalypses,
            (value) => requireStoredSelectionData(value, 'apocalypse')
          ),
          requestOrigin
        );
      case '/data/ages':
        return response(
          200,
          await getCharacterCreationData('AGES', ages, requireStoredAgeData),
          requestOrigin
        );
      case '/data/skills': {
        return response(
          200,
          await getCharacterCreationData(
            'SKILLS',
            skills,
            requireStoredSkillData
          ),
          requestOrigin
        );
      }
      case '/data/special-abilities':
        return response(
          200,
          await getCharacterCreationData(
            'SPECIAL_ABILITIES',
            specialAbilities,
            requireStoredSpecialAbilityData
          ),
          requestOrigin
        );
      case '/data/lucky-mutation':
        return response(
          200,
          await getCharacterCreationData(
            'LUCKY_MUTATION',
            luckyMutations,
            requireStoredLuckyMutationData
          ),
          requestOrigin
        );
      case '/data/negative-traits':
        return response(
          200,
          await getCharacterCreationData(
            'NEGATIVE_TRAITS',
            negativeTraits,
            requireStoredNegativeTraitData
          ),
          requestOrigin
        );
      case '/data/gear':
        return response(
          200,
          await getCharacterCreationData(
            'GEAR',
            { gear, bugOutKits },
            requireStoredGearCatalog
          ),
          requestOrigin
        );
      case '/data/other-rules':
        return response(
          200,
          await getCharacterCreationData(
            'OTHER_RULES',
            otherRules,
            requireStoredOtherRulesData
          ),
          requestOrigin
        );
      default:
        break;
    }
  }

  if (resource === '/admin/campaign') {
    if (!isAdmin(event.requestContext.authorizer?.claims)) {
      return response(403, { message: 'Administrator access is required.' }, requestOrigin);
    }

    const key = {
      PK: 'ADMIN',
      SK: 'CAMPAIGN'
    };

    if (method === 'GET') {
      const result = await client.send(
        new GetCommand({ TableName: tableName, Key: key })
      );
      if (!result.Item) {
        return response(404, { message: 'Resource not found.' }, requestOrigin);
      }
      return response(200, requireStoredJsonObject(result.Item.data), requestOrigin);
    }

    if (method === 'PUT') {
      const data = parseJsonObject(event.body);
      if (!data) {
        return response(400, {
          message: 'A valid JSON object is required.'
        }, requestOrigin);
      }
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...key, data }
        })
      );
      return response(200, data, requestOrigin);
    }

    return response(405, { message: 'Method not allowed.' }, requestOrigin);
  }

  if (resource === '/bug-reports') {
    return handleBugReport(event, userId, requestOrigin);
  }

  if (
    resource === '/user/{userId}/characters' ||
    resource === '/user/{userId}/character/{characterId}' ||
    resource === '/user/{userId}/character/{characterId}/image'
  ) {
    const requestedUserId = event.pathParameters?.userId;
    if (!requestedUserId || requestedUserId !== userId) {
      return response(
        403,
        { message: 'You can only access your own characters.' },
        requestOrigin
      );
    }

    if (resource === '/user/{userId}/characters' && method === 'GET') {
      const result = await client.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':skPrefix': 'CHARACTER#'
          }
        })
      );
      const characters = (result.Items ?? []).map((item) => {
        const record = withoutStorageKeys(item);
        if (typeof record.id !== 'string') {
          throw new Error('Stored character record is invalid.');
        }
        return {
          ...requireStoredJsonObject(record.data),
          id: record.id,
          userId
        };
      });
      return response(200, characters, requestOrigin);
    }

    if (resource === '/user/{userId}/character/{characterId}/image') {
      return handleCharacterImage(event, userId, requestOrigin);
    }

    if (
      resource === '/user/{userId}/character/{characterId}' &&
      (method === 'GET' || method === 'PUT' || method === 'DELETE')
    ) {
      const characterId = event.pathParameters?.characterId;
      if (!characterId) {
        return response(
          400,
          { message: 'A character ID is required.' },
          requestOrigin
        );
      }

      const key = {
        PK: `USER#${userId}`,
        SK: `CHARACTER#${characterId}`
      };

      if (method === 'GET') {
        const result = await client.send(
          new GetCommand({ TableName: tableName, Key: key })
        );
        if (!result.Item) {
          return response(
            404,
            { message: 'Character not found.' },
            requestOrigin
          );
        }
        const record = withoutStorageKeys(result.Item);
        return response(
          200,
          {
            ...requireStoredJsonObject(record.data),
            id: characterId,
            userId
          },
          requestOrigin
        );
      }

      if (method === 'DELETE') {
        if (!(await characterExists(userId, characterId))) {
          return response(
            404,
            { message: 'Character not found.' },
            requestOrigin
          );
        }
        await deleteCharacterImageObjects(userId, characterId);
        await client.send(
          new DeleteCommand({
            TableName: tableName,
            Key: key
          })
        );
        return response(204, undefined, requestOrigin);
      }

      const data = parseJsonObject(event.body);
      if (!data) {
        return response(
          400,
          { message: 'A valid JSON object is required.' },
          requestOrigin
        );
      }
      const character = { ...data, id: characterId, userId };
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...key, id: characterId, userId, data: character }
        })
      );
      return response(200, character, requestOrigin);
    }

    return response(405, { message: 'Method not allowed.' }, requestOrigin);
  }

  if (method === 'GET' && !id) {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: itemsIndexName,
        KeyConditionExpression: 'GSI1PK = :itemType',
        ExpressionAttributeValues: { ':itemType': `USER#${userId}` },
        ScanIndexForward: false,
        Limit: 50
      })
    );
    const items = (result.Items ?? []).map(
      (item) => withoutStorageKeys(item)
    );
    return response(200, items, requestOrigin);
  }

  if (method === 'POST' && !id) {
    const input = parseItemBody(event.body);
    if (!input) return response(400, { message: 'A valid title is required.' }, requestOrigin);

    const now = new Date().toISOString();
    const itemId = randomUUID();
    const item: Item = {
      id: itemId,
      ...input,
      createdAt: now,
      updatedAt: now
    };
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          ...item,
          PK: `USER#${userId}`,
          SK: `ITEM#${itemId}`,
          GSI1PK: `USER#${userId}`,
          GSI1SK: `${now}#${itemId}`
        }
      })
    );
    return response(201, item, requestOrigin);
  }

  if (id && method === 'GET') {
    const result = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: `USER#${userId}`, SK: `ITEM#${id}` }
      })
    );
    if (!result.Item) return response(404, { message: 'Item not found.' }, requestOrigin);
    const item = withoutStorageKeys(result.Item);
    return response(200, item, requestOrigin);
  }

  if (id && method === 'PUT') {
    const input = parseItemBody(event.body);
    if (!input) return response(400, { message: 'A valid title is required.' }, requestOrigin);

    const key = { PK: `USER#${userId}`, SK: `ITEM#${id}` };
    const existing = await client.send(
      new GetCommand({ TableName: tableName, Key: key })
    );
    if (!existing.Item) return response(404, { message: 'Item not found.' }, requestOrigin);

    const updatedAt = new Date().toISOString();
    const item: Item = {
      id,
      ...input,
      createdAt: String(existing.Item.createdAt),
      updatedAt
    };
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          ...item,
          ...key,
          GSI1PK: `USER#${userId}`,
          GSI1SK: `${item.createdAt}#${id}`
        }
      })
    );
    return response(200, item, requestOrigin);
  }

  if (id && method === 'DELETE') {
    const result = await client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { PK: `USER#${userId}`, SK: `ITEM#${id}` },
        ReturnValues: 'ALL_OLD'
      })
    );
    if (!result.Attributes) return response(404, { message: 'Item not found.' }, requestOrigin);
    return response(204, undefined, requestOrigin);
  }

  return response(405, { message: 'Method not allowed.' }, requestOrigin);
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId;
  console.info('API request received', {
    requestId,
    method: event.httpMethod,
    resource: event.resource
  });

  try {
    const result = await handleRequest(event);
    console.info('API request completed', {
      requestId,
      method: event.httpMethod,
      resource: event.resource,
      statusCode: result.statusCode
    });
    return result;
  } catch (error) {
    console.error('API request failed', {
      requestId,
      method: event.httpMethod,
      resource: event.resource,
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error)
    });
    return response(
      500,
      { message: 'An internal server error occurred.', requestId },
      event.headers?.origin ?? event.headers?.Origin
    );
  }
}
