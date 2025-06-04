import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:prettier/recommended"
  ),
  {
    rules: {
      "no-console": ["error", { allow: ["info", "warn", "error"] }],
      "tailwindcss/classnames-order": "error",
      "tailwindcss/no-custom-classname": "warn",
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
    overrides: [
      {
        files: ["*.ts", "*.tsx", "*.js"],
        parser: "@typescript-eslint/parser",
      },
    ],
  },
]

export default eslintConfig
