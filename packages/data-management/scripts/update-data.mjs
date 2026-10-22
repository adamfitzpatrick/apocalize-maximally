import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getProfile(args) {
  let profile;
  for (let i = 0; i < args.length; i += 1) {
    const argument = args[i];
    if (argument === '--profile') {
      profile = args[i + 1];
      if (!profile || profile.startsWith('--')) {
        throw new Error('Usage: yarn update:db [--profile <name>].');
      }
      i += 1;
    } else if (argument.startsWith('--profile=')) {
      profile = argument.slice('--profile='.length);
      if (!profile) {
        throw new Error('Usage: yarn update:db [--profile <name>].');
      }
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return profile;
}

const profile = getProfile(process.argv.slice(2));
const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

dotenv.config({
  path: path.resolve(packageDirectory, '../backend/.env')
});

const environment = process.env.ENVIRONMENT ?? 'dev';
if (environment !== 'dev' && environment !== 'prd') {
  throw new Error("ENVIRONMENT must be either 'dev' or 'prd'.");
}

const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
if (!region) {
  throw new Error(
    'Set AWS_REGION in packages/backend/.env or in the environment.'
  );
}

const tableName =
  process.env.TABLE_NAME ?? `${environment}-apocalize-items`;
const datasets = [
  ['ARCHETYPES', 'archetypes.json'],
  ['APOCALYPSES', 'apocalypses.json'],
  ['AGES', 'ages.json'],
  ['SKILLS', 'skills.json'],
  ['SPECIAL_ABILITIES', 'special-abilities.json'],
  ['LUCKY_MUTATION', 'lucky-mutation.json'],
  ['NEGATIVE_TRAITS', 'negative-traits.json'],
  ['GEAR', ['gear.json', 'bug-out-kits.json']],
  ['OTHER_RULES', 'other-rules.json']
];
const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region,
    ...(profile ? { credentials: fromIni({ profile }) } : {})
  })
);

try {
  for (const [sortKey, filename] of datasets) {
    const data = Array.isArray(filename)
      ? {
          gear: JSON.parse(
            await readFile(path.join(packageDirectory, 'data', filename[0]), 'utf8')
          ),
          bugOutKits: JSON.parse(
            await readFile(path.join(packageDirectory, 'data', filename[1]), 'utf8')
          )
        }
      : JSON.parse(
          await readFile(path.join(packageDirectory, 'data', filename), 'utf8')
        );
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: 'DATA#CHARACTER_CREATION',
          SK: sortKey,
          data
        }
      })
    );
    console.log(`Updated ${sortKey} in ${tableName}.`);
  }
} finally {
  client.destroy();
}
