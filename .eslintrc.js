module.exports = {
  root: true,
  env: {
    es2021: true,
    jest: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint', 'prettier', 'jest'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
      },
    ],
    '@typescript-eslint/no-explicit-any': ['off'],
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  reportUnusedDisableDirectives: true,
};
