/* 
  This is a workaround for https://github.com/eslint/eslint/issues/3458

  TLDR; eslint requires you to know and declare all eslint plugins that are being used in the plugin you 
  are consuming as peer dependencies. This patch fixes that so you don't have to add to your peer 
  dependencies and is [recommended](https://github.com/microsoft/rushstack/tree/main/eslint/eslint-config#2-choose-one-profile) by the rush stack eslint-config package.
*/
require("@rushstack/eslint-config/patch/modern-module-resolution")

module.exports = {
  extends: ["@rushstack/eslint-config/profile/node"],
  rules: {
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/consistent-type-definitions": [1, "type"],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "parameter",
        format: ["camelCase"],
        leadingUnderscore: "allow"
      }
    ],
    "@typescript-eslint/typedef": 0,
    "@rushstack/no-new-null": 0,
    "@rushstack/typedef-var": 0,
    "@rushstack/hoist-jest-mock": 0
  },
  parserOptions: { tsconfigRootDir: __dirname }
}
