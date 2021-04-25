module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
  ],
  plugins: ['prettier', 'jest'],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 0,
    'prettier/prettier': [
      'error',
      {
        semi: true,
        trailingComma: 'all',
        bracketSpacing: false,
        singleQuote: true,
        printWidth: 120,
      },
    ],
  },
  env: {
    'jest/globals': true,
  },
  reportUnusedDisableDirectives: true,
};
