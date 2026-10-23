import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'node:path';

interface BackendStackProps extends cdk.StackProps {
  environment: 'dev' | 'prd';
  frontendOrigin: string;
}

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const prefix = props.environment;
    const allowedFrontendOrigins = [
      props.frontendOrigin,
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${prefix}-apocalize-users`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      signInCaseSensitive: false,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true }
      },
      userVerification: {
        emailSubject: 'Your Apocalize sign-in code',
        emailBody: 'Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE
      },
      signInPolicy: {
        allowedFirstAuthFactors: {
          password: true,
          emailOtp: true
        }
      }
    });

    const userPoolClient = userPool.addClient('FrontendClient', {
      userPoolClientName: `${prefix}-apocalize-frontend`,
      generateSecret: false,
      authFlows: { user: true },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO
      ]
    });

    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admin',
      description: 'Administrators authorized to manage shared settings and campaigns.'
    });

    const table = new dynamodb.Table(this, 'ItemsTable', {
      tableName: `${prefix}-apocalize-items`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    table.addGlobalSecondaryIndex({
      indexName: `${prefix}-GSI1`,
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    const handlerLogGroup = new logs.LogGroup(this, 'ItemsHandlerLogs', {
      logGroupName: `/aws/lambda/${prefix}-apocalize-items-handler`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    const handlerRole = new iam.Role(this, 'ItemsHandlerRole', {
      roleName: `${prefix}-apocalize-items-handler`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    handlerLogGroup.grantWrite(handlerRole);

    const handler = new lambda.Function(this, 'ItemsHandler', {
      functionName: `${prefix}-apocalize-items-handler`,
      role: handlerRole,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '../../dist/handler')
      ),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
        FRONTEND_ORIGINS: JSON.stringify(allowedFrontendOrigins),
        ITEMS_INDEX_NAME: `${prefix}-GSI1`
      },
      logGroup: handlerLogGroup
    });

    table.grantReadWriteData(handler);

    const characterImagesBucket = new s3.Bucket(this, 'CharacterImagesBucket', {
      bucketName: `${prefix}-apocalize-character-images-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
    const characterImagesDistribution = new cloudfront.Distribution(
      this,
      'CharacterImagesDistribution',
      {
        comment: `${prefix}-apocalize-character-images`,
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            characterImagesBucket
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        }
      }
    );
    characterImagesBucket.grantPut(handler);
    characterImagesBucket.grantDelete(handler);
    characterImagesBucket.grantRead(handler);
    handler.addEnvironment(
      'CHARACTER_IMAGES_BUCKET',
      characterImagesBucket.bucketName
    );
    handler.addEnvironment(
      'CHARACTER_IMAGES_BASE_URL',
      `https://${characterImagesDistribution.distributionDomainName}`
    );

    const api = new apigateway.RestApi(this, 'ItemsApi', {
      restApiName: `${prefix}-Apocalize Items API`,
      defaultCorsPreflightOptions: {
        allowOrigins: allowedFrontendOrigins,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Authorization', 'Content-Type']
      },
      deployOptions: {
        stageName: prefix,
        throttlingRateLimit: 20,
        throttlingBurstLimit: 40
      }
    });
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'ApiAuthorizer',
      {
        authorizerName: `${prefix}-apocalize-api-authorizer`,
        cognitoUserPools: [userPool]
      }
    );
    const integration = new apigateway.LambdaIntegration(handler);
    const items = api.root.addResource('items');
    const authorizedMethodOptions: apigateway.MethodOptions = {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer
    };
    const data = api.root.addResource('data');
    data.addResource('archetypes').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );
    data.addResource('apocalypses').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );
    data.addResource('ages').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );
    data.addResource('skills').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );
    data.addResource('special-abilities').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );
    data.addResource('lucky-mutation').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );
    data.addResource('negative-traits').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );
    data.addResource('gear').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );
    data.addResource('other-rules').addMethod(
      'GET',
      integration,
      authorizedMethodOptions
    );

    items.addMethod('GET', integration, authorizedMethodOptions);
    items.addMethod('POST', integration, authorizedMethodOptions);

    const item = items.addResource('{id}');
    item.addMethod('GET', integration, authorizedMethodOptions);
    item.addMethod('PUT', integration, authorizedMethodOptions);
    item.addMethod('DELETE', integration, authorizedMethodOptions);

    api.root
      .addResource('bug-reports')
      .addMethod('POST', integration, authorizedMethodOptions);

    const admin = api.root.addResource('admin');
    const adminCampaign = admin.addResource('campaign');
    adminCampaign.addMethod('GET', integration, authorizedMethodOptions);
    adminCampaign.addMethod('PUT', integration, authorizedMethodOptions);

    const user = api.root.addResource('user').addResource('{userId}');
    const characters = user.addResource('characters');
    characters.addMethod('GET', integration, authorizedMethodOptions);

    const character = user
      .addResource('character')
      .addResource('{characterId}');
    character.addMethod('GET', integration, authorizedMethodOptions);
    character.addMethod('PUT', integration, authorizedMethodOptions);
    character.addMethod('DELETE', integration, authorizedMethodOptions);
    const characterImage = character.addResource('image');
    characterImage.addMethod('POST', integration, authorizedMethodOptions);
    characterImage.addMethod('DELETE', integration, authorizedMethodOptions);

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Copy this URL to VITE_API_URL in packages/frontend/.env'
    });
    new cdk.CfnOutput(this, 'AuthUserPoolId', {
      value: userPool.userPoolId,
      description: 'Copy to VITE_COGNITO_USER_POOL_ID in packages/frontend/.env'
    });
    new cdk.CfnOutput(this, 'AuthUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description:
        'Copy to VITE_COGNITO_USER_POOL_CLIENT_ID in packages/frontend/.env'
    });
    new cdk.CfnOutput(this, 'ItemsTableName', {
      value: table.tableName
    });

    cdk.Tags.of(this).add('Environment', prefix);
  }
}
