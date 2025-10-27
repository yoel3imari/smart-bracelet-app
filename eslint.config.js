// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

export default defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
