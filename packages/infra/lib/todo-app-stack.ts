import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as cloudFront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as lambda from '@aws-cdk/aws-lambda';
import * as nodeLambda from '@aws-cdk/aws-lambda-nodejs';
import * as logs from "@aws-cdk/aws-logs";
import * as apiGateway from '@aws-cdk/aws-apigateway';
import {OUTPUTS} from "./outputs";

const WEB_CLIENT_PATH = path.resolve(__dirname, '..', '..', 'web-client', 'build');
const API_ENTRY_PATH = path.resolve(__dirname, '..', '..', 'api', 'index.ts');
const HTTP_STATUS_CODES = {
    OK: 200,
    FORBIDDEN: 403,
    NOT_FOUND: 404
}

function generateResourceId(id: string, type: string): string {
    return `${id}-${type}`;
}

export class TodoAppStack extends cdk.Stack {
    private readonly bucket: s3.Bucket;
    private readonly distribution: cloudFront.Distribution;
    private readonly webAppDeployment: s3Deployment.BucketDeployment;
    private readonly apiLambda: lambda.Function;
    private readonly restApi: apiGateway.LambdaRestApi;
    private readonly outputs: Array<cdk.CfnOutput>;

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.bucket = new s3.Bucket(this, generateResourceId(id, 'bucket'), {
            bucketName: generateResourceId(id, 'bucket')
        });

        this.webAppDeployment = new s3Deployment.BucketDeployment(this, generateResourceId(id, 'webclientdeployment'), {
            sources: [s3Deployment.Source.asset(WEB_CLIENT_PATH)],
            destinationBucket: this.bucket
        });

        this.distribution = new cloudFront.Distribution(this, generateResourceId(id, 'distribution'), {
            defaultBehavior: {
                origin: new origins.S3Origin(this.bucket)
            },
            enabled: true,
            errorResponses: [
                {
                    httpStatus: HTTP_STATUS_CODES.NOT_FOUND,
                    responsePagePath: '/index.html',
                    responseHttpStatus: HTTP_STATUS_CODES.OK
                },
                {
                    httpStatus: HTTP_STATUS_CODES.FORBIDDEN,
                    responsePagePath: '/index.html',
                    responseHttpStatus: HTTP_STATUS_CODES.OK
                }
            ]
        })

        this.apiLambda = new nodeLambda.NodejsFunction(this, generateResourceId(id, 'lambda'), {
            entry: API_ENTRY_PATH,
            logRetention: logs.RetentionDays.ONE_WEEK,
            bundling: {
                logLevel: nodeLambda.LogLevel.ERROR
            }
        });

        this.restApi = new apiGateway.LambdaRestApi(this, generateResourceId(id, 'rest-api'), {
            handler: this.apiLambda,
            proxy: true
        });

        this.outputs = [
            new cdk.CfnOutput(this, OUTPUTS.TODO_REST_API_URL, {
                value: this.restApi.url
            }),
            new cdk.CfnOutput(this, OUTPUTS.TODO_WEB_APP_URL, {
                value: `https://${this.distribution.domainName}`
            }),
            new cdk.CfnOutput(this, OUTPUTS.TODO_WEB_APP_BUCKET_NAME, {
                value: this.bucket.bucketName
            })
        ]
    }
}
