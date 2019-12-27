import express from 'express';
import path from 'path';

const server = express();

// API call to opensentinel
server.post('/kb/webhooks', (req, res) => {
  res.status(202).json({
    message: 'Thanks!',
  });
});

// API call to git.io
server.post('/', (req, res) => {
  res.set('location', 'https://git.io/fake1234').json({});
});

export const setupEnv = {
  INPUT_OPENSENTINEL_OWNER: 'fakeoslowner',
  INPUT_OPENSENTINEL_TOKEN: 'abcd1234fake',
  INPUT_JOB_STATUS: 'Success',
  INPUT_JOB_NAME: 'Testing Production Deployment',
  INPUT_ON_SUCCESS: 'always',
  INPUT_ON_FAILURE: 'always',

  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: 'f6f40d9fbd1130f7f2357bb54225567dbd7a3793',
  GITHUB_REF: 'refs/tags/v0.0.1',
  GITHUB_WORKFLOW: 'keybase',
  GITHUB_ACTION: 'self',
  GITHUB_ACTOR: 'marvinpinto',
  GITHUB_EVENT_PATH: path.join(__dirname, '../payloads', 'force-push.json'),
  GITHUB_REPOSITORY: 'marvinpinto/private-actions-tester',
};

export {server};
