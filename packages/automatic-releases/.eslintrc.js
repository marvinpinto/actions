/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
  extends: [path.join(__dirname, '../../.eslintrc.js')],
  parserOptions: {
    project: path.join(__dirname, 'tsconfig.eslint.json'),
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: __dirname,
      },
    },
  },
};
