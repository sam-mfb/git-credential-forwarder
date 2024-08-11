import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
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
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: false
        }
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          // Unused function arguments often indicate a mistake in JavaScript code.  However in TypeScript code,
          // the compiler catches most of those mistakes, and unused arguments are fairly common for type signatures
          // that are overriding a base class method or implementing an interface.
          args: "none"
        }
      ],
      "dot-notation": [
        "warn",
        {
          allowPattern: "^_"
        }
      ]
    }
  }
)
