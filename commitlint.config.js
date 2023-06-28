module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['deps', 'deps-dev', 'automatic-releases', 'keybase-notifications', 'automatic-releases'],
    ],
    'footer-max-line-length': [0, 'never'],
    'body-max-line-length': [0, 'never'],
  },
  ignores: [
    (message) =>
      message.startsWith('chore(deps): ') ||
      message.includes('Update Github Runner Node version and deprecate set-output'),
  ],
};
