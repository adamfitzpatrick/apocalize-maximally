# Apocalize Maximally

This repository is a Yarn-workspaces monorepo with independently deployable React and AWS backend packages:

- `packages/frontend` — React, Vite, and a CloudFront/S3 site with a Route 53 custom domain.
- `packages/backend` — API Gateway, a TypeScript Lambda, and a DynamoDB single-table design.

## Requirements

- Node.js 22 or later and Corepack
- AWS CLI credentials with permission to deploy the stacks
- An existing Route 53 hosted zone for the frontend domain

This repository uses Yarn Berry with Plug'n'Play and zero-installs. Dependencies
are stored in `.yarn/cache`, with the generated `.pnp.cjs` and required native
package files in `.yarn/unplugged`. Keep these files checked in. After cloning,
run this from the repository root to verify the lockfile and offline cache:

```bash
yarn install --immutable
```

Copy each package's `.env.example` to `.env` and fill in the values. Do not commit `.env` files.

### Backend

The backend provisions a self-service Cognito user pool with passwordless
email one-time codes. Email is the only required user attribute; there is no
administrator approval step. The API requires a valid Cognito token, and
DynamoDB items are scoped to the authenticated user.

Set `AWS_ACCOUNT_ID`, `AWS_REGION`, and `FRONTEND_DOMAIN_NAME` in
`packages/backend/.env`. Set `ENVIRONMENT` to
`dev` or `prd` in both package `.env` files; it defaults to `dev` when omitted.
The backend derives its allowed frontend origin as
`https://<ENVIRONMENT>.<FRONTEND_DOMAIN_NAME>`. It also allows
`http://localhost:5173` and `http://127.0.0.1:5173` for local frontend
development.

Build and deploy the backend independently:

```sh
yarn workspace @apocalize/backend build
yarn deploy:backend
```

Copy `ApiUrl`, `AuthUserPoolId`, and `AuthUserPoolClientId` from the backend
stack outputs to `VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, and
`VITE_COGNITO_USER_POOL_CLIENT_ID` in `packages/frontend/.env`.

### Frontend

Set `AWS_ACCOUNT_ID`, `FRONTEND_DOMAIN_NAME`, `HOSTED_ZONE_ID`, and
`HOSTED_ZONE_NAME` in `packages/frontend/.env`. The frontend CDK stack runs in
`us-east-1`, as required for CloudFront certificates. Set `VITE_API_URL` to the
backend API URL and the two `VITE_COGNITO_*` values from the backend stack
before building. `FRONTEND_DOMAIN_NAME` is the base domain; CDK prepends the
environment as a subdomain (`dev.app.example.com` or `prd.app.example.com` for
`app.example.com`). The frontend package and backend package must use the same
environment and base domain. The frontend domain must be within the configured
Route 53 hosted zone; `http://localhost:5173` is also allowed for local development.

Stack names, named AWS resources, and the frontend domain are
environment-prefixed. Deploying `dev` and `prd` therefore creates separate
stacks and distinct frontend domains. To deploy a selected environment,
set the same `ENVIRONMENT=dev` or `ENVIRONMENT=prd` in both package `.env`
files before running that environment's synth or deploy command.

```sh
yarn workspace @apocalize/frontend build
yarn deploy:frontend
```

Each package can also be synthesized without deploying:

```sh
yarn synth:backend
yarn synth:frontend
```

Bootstrap each target AWS environment with AWS CDK before the first deploy.
Deploy the backend before the frontend so the frontend build can use the API URL.
The frontend certificate stack is in `us-east-1`, so bootstrap that region as well
as `AWS_REGION` when they differ.

### Continuous deployment

A push to `main` deploys the dev environment. You can also run it by hand from the Actions tab with **Run workflow** on `main`. The workflow deploys the asset
stack, the backend, the frontend, and then writes the game-data JSON into the
dev table. It reads the backend stack outputs and passes them to the frontend
build, so those values are not stored in GitHub.

Create these variables on the GitHub Actions environment named `dev`:

- `AWS_ACCOUNT_ID`
- `AWS_REGION`
- `FRONTEND_DOMAIN_NAME`
- `HOSTED_ZONE_ID`
- `HOSTED_ZONE_NAME`

Create a secret named `AWS_DEPLOY_ROLE_ARN` on that same environment. Its value
is an IAM role that GitHub Actions can assume with OIDC, trusted for this
repository on `main`, with permission to deploy the dev stacks. The role must
be able to deploy in both `AWS_REGION` and `us-east-1`.

## Local frontend development

From the repository root, run:

```sh
yarn workspace @apocalize/frontend dev
```

The React app expects the backend API URL and Cognito outputs in
`packages/frontend/.env`.

## Archetype image assets

Archetype images are maintained outside the React app in
`packages/data-management/assets/archetypes/`. The asset stack uploads files
from `packages/data-management/assets/` to a private S3 bucket and serves them
through CloudFront; the images are not bundled into the frontend build.

Set `AWS_ACCOUNT_ID`, `AWS_REGION`, and `ENVIRONMENT` in
`packages/backend/.env`, then deploy the asset stack from the repository root:

```sh
yarn synth:assets
yarn deploy:assets
```

The deployment outputs `AssetsBaseUrl`. Use that CloudFront URL in archetype
data, followed by `/archetypes/<filename>`, for example:
`https://<distribution-domain>/archetypes/archetype-1.webp`. Redeploy after
adding, replacing, or removing image files; deployment synchronizes the folder
and invalidates the CloudFront cache.

## API specification

### Models

#### Character creation data

The authenticated API provides the selection lists and age modifiers used
during character creation:

- `GET /data/archetypes` — array of archetypes with a `name` and a
  `description` that is either a string or an array of paragraph strings.
  `bestStats`, `commonSkills`, and `imageUrl` are optional. Every archetype
  must include a `skills` string array and `primaryModifiers` and
  `secondaryModifiers` objects.
- `GET /data/apocalypses` — array of apocalypses with `name`, a `description`
  string or paragraph array, a required `modifiers` object, and a required
  `skills` string array.
- Modifier objects map the `str`, `for`, `agi`, `int`, `ins`, `cha`, `fs`, `bs`,
  and `luck` stat keys to numeric values.
- `GET /data/ages` — array of age categories with `range`, `category`, a
  numeric `modifiers` object keyed by stat, and a `skillProf` string.

The default data is stored in JSON files in
`packages/data-management/data/`. The API reads each dataset from the shared
DynamoDB table using `PK=DATA#CHARACTER_CREATION` and an `SK` of `ARCHETYPES`,
`APOCALYPSES`, or `AGES`. If a record is missing, the API initializes it from
the corresponding JSON file.

To update all three records in the deployed table, configure
`packages/backend/.env` with the target `ENVIRONMENT` and `AWS_REGION`, and
ensure your AWS credentials can write to that environment's items table. Then
run this from the repository root:

```sh
yarn update:db --profile my-aws-profile
```

Omit `--profile` to use the AWS SDK's default credential provider chain.
The option also accepts `--profile=my-aws-profile`.

The script overwrites the three shared records in
`<ENVIRONMENT>-apocalize-items`. You can override the target table by setting
`TABLE_NAME` in the environment. Changes in DynamoDB take effect without
rebuilding the backend.

#### Campaign

```json
{
  "required": ["id", "name", "characters"],
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "name": {
      "type": "string"
    },
    "characters": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uuid"
      }
    }
  }
}
```

#### Character

```json
{
  "type": "object",
  "required": [
    "id",
    "userId",
    "name",
    "primaryArchetype",
    "secondaryArchetype",
    "personalApocalypse",
    "age",
    "stats",
    "skills",
    "armor",
    "health",
    "infection",
    "creationStage",
    "experience"
  ],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "userId": {
      "type": "string"
    },
    "avatar": {
      "type": "string",
      "format": "url"
    },
    "name": {
      "type": "string"
    },
    "primaryArchetype": {
      "type": "string"
    },
    "secondaryArchetype": {
      "type": "string"
    },
    "personalApocalypse": {
      "type": "string"
    },
    "age": {
      "type": "integer"
    },
    "stats": {
      "type": "object",
      "required": ["str", "for", "agi", "int", "ins", "cha", "fs", "bs", "luck"],
      "properties": {
        "str": { "type": "integer" },
        "for": { "type": "integer" },
        "agi": { "type": "integer" },
        "int": { "type": "integer" },
        "ins": { "type": "integer" },
        "cha": { "type": "integer" },
        "fs": { "type": "integer" },
        "bs": { "type": "integer" },
        "luck": { "type": "integer" }
      }
    },
    "skills": {
      "type": "object",
      "additionalProperties": {
        "type": "string",
        "enum": ["", "P", "S", "T", "M"]
      }
    },
    "armor": {
      "type": "object",
      "additionalProperties": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["ap", "cp"],
          "properties": {
            "ap": { "type": "integer" },
            "cp": { "type": "integer" }
          }
        }
      }
    },
    "health": {
      "type": "integer"
    },
    "infection": {
      "type": "integer",
      "minimum": 0,
      "maximum": 6
    },
    "creationStage": {
      "type": "object",
      "nullable": true,
      "required": ["phase", "step"],
      "properties": {
        "phase": { "type": "integer" },
        "step": { "type": "integer" }
      }
    },
    "experience": {
      "type": "object",
      "required": ["total", "unused"],
      "properties": {
        "total": { "type": "integer" },
        "unused": { "type": "integer" }
      }
    }
  }
}
```