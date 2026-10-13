import { randomUUID } from "node:crypto";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.TABLE_NAME ?? "";
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "";
const itemsIndexName = process.env.ITEMS_INDEX_NAME ?? "";

if (!tableName || !frontendOrigin || !itemsIndexName) {
  throw new Error(
    "TABLE_NAME, FRONTEND_ORIGIN, and ITEMS_INDEX_NAME must be configured."
  );
}

interface Item {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

function response(statusCode: number, body?: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": frontendOrigin,
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Content-Type": "application/json"
    },
    body: body === undefined ? "" : JSON.stringify(body)
  };
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
    typeof value !== "object" ||
    value === null ||
    !("title" in value) ||
    typeof value.title !== "string" ||
    value.title.trim().length === 0 ||
    value.title.length > 200 ||
    ("description" in value &&
      value.description !== undefined &&
      typeof value.description !== "string")
  ) {
    return null;
  }

  return {
    title: value.title.trim(),
    ...("description" in value && typeof value.description === "string"
      ? { description: value.description }
      : {})
  };
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const id = event.pathParameters?.id;
  const userId = event.requestContext.authorizer?.claims?.sub;

  if (!userId) {
    return response(401, { message: "Authentication is required." });
  }

  if (method === "GET" && !id) {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: itemsIndexName,
        KeyConditionExpression: "GSI1PK = :itemType",
        ExpressionAttributeValues: { ":itemType": `USER#${userId}` },
        ScanIndexForward: false,
        Limit: 50
      })
    );
    const items = (result.Items ?? []).map(
      ({ PK: _PK, SK: _SK, GSI1PK: _GSI1PK, GSI1SK: _GSI1SK, ...item }) =>
        item
    );
    return response(200, items);
  }

  if (method === "POST" && !id) {
    const input = parseItemBody(event.body);
    if (!input) return response(400, { message: "A valid title is required." });

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
    return response(201, item);
  }

  if (id && method === "GET") {
    const result = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: `USER#${userId}`, SK: `ITEM#${id}` }
      })
    );
    if (!result.Item) return response(404, { message: "Item not found." });
    const { PK: _PK, SK: _SK, GSI1PK: _GSI1PK, GSI1SK: _GSI1SK, ...item } =
      result.Item;
    return response(200, item);
  }

  if (id && method === "PUT") {
    const input = parseItemBody(event.body);
    if (!input) return response(400, { message: "A valid title is required." });

    const key = { PK: `USER#${userId}`, SK: `ITEM#${id}` };
    const existing = await client.send(
      new GetCommand({ TableName: tableName, Key: key })
    );
    if (!existing.Item) return response(404, { message: "Item not found." });

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
    return response(200, item);
  }

  if (id && method === "DELETE") {
    const result = await client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { PK: `USER#${userId}`, SK: `ITEM#${id}` },
        ReturnValues: "ALL_OLD"
      })
    );
    if (!result.Attributes) return response(404, { message: "Item not found." });
    return response(204);
  }

  return response(405, { message: "Method not allowed." });
}
