module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['deps', 'keybase-notifications', 'automatic-releases']],
    'footer-max-line-length': [0, 'never'],
    'body-max-line-length': [0, 'never'],
  },
};
