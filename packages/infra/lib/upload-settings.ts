import * as AWS from 'aws-sdk';
import {S3, CloudFormation} from 'aws-sdk';
import {STACK_NAME} from "./stack-name";
import {OUTPUTS} from "./outputs";

const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
AWS.config.update({region, credentials: new AWS.EnvironmentCredentials('AWS')});

const cloudFormation = new CloudFormation();
const s3 = new S3();

export async function getOutputValue(name: string): Promise<string> {
    const response = await cloudFormation.describeStacks({StackName: STACK_NAME}).promise();

    const stack = (response?.Stacks || [])[0];
    if (!stack) {
        throw new Error(`Failed to find stack ${STACK_NAME}`);
    }
    const outputs = stack.Outputs || [];
    const output = outputs.find(o => o.OutputKey === name);
    if (!output) {
        throw new Error(`Failed to find output with name ${name} in stack ${STACK_NAME}`);
    }

    if (!output.OutputValue) {
        throw new Error(`Output of ${name} was ${output.OutputValue}`);
    }

    return output.OutputValue;
}

export async function uploadSettings(): Promise<void> {
    const apiUrl = await getOutputValue(OUTPUTS.TODO_REST_API_URL);
    const bucketName = await getOutputValue(OUTPUTS.TODO_WEB_APP_BUCKET_NAME);
    await s3.upload({
        Bucket: bucketName,
        Key: 'settings.json',
        Body: JSON.stringify({apiUrl}),
        ContentType: 'application/json'
    }).promise();
}

export async function main() {
    await uploadSettings();
}

main()
    .catch(err => {
        console.error(err);
        process.exit(1);
    });