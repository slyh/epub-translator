/* eslint-env node */
module.exports = {
  extends: [
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:@typescript-eslint/strict-type-checked'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    "@typescript-eslint/dot-notation": "off"
  }
};