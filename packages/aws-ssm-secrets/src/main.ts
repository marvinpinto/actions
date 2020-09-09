import * as core from '@actions/core';
import SSM from 'aws-sdk/clients/ssm';

type ActionParams = {
  envVariable: string;
  ssmParameter: string;
};

const getAndValidateArgs = (): ActionParams => {
  core.startGroup('Validating action arguments');

  const ssmParameter = core.getInput('ssm_parameter', {required: true});
  const envVariable = core.getInput('env_variable_name', {required: true});

  const param: ActionParams = {
    envVariable,
    ssmParameter,
  };
  core.debug(`Final actionParam: ${JSON.stringify(param)}`);

  core.info('Validation successful');
  core.endGroup();

  return param;
};

export const main = async () => {
  const actionParam = getAndValidateArgs();
  const ssm = new SSM();
  core.startGroup('Injecting secret environment variables');

  const result = await ssm
    .getParameter({
      Name: actionParam.ssmParameter,
      WithDecryption: true, // NOTE: this flag is ignored for String and StringList parameter types
    })
    .promise();

  const envVar = actionParam.envVariable.toUpperCase();
  const secret = result?.Parameter?.Value;
  // istanbul ignore next
  if (!secret) {
    core.warning(`Secret value for environment variable ${envVar} appears to be empty`);
  }

  core.setSecret(secret || '');
  core.exportVariable(envVar, secret);
  core.info(`Successfully set secret environment variable: ${envVar}`);

  core.endGroup();
};
