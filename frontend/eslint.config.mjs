import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"
import parser from "@typescript-eslint/parser" // 👈 import parser đúng

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
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "**/*.config.js",
      "scripts/**",
      "public/**",
      ".next",
    ],
  },
  {
    rules: {
      "no-console": ["error", { allow: ["info", "warn", "error"] }],
      // "tailwindcss/classnames-order": "error",
      // "tailwindcss/no-custom-classname": "warn",
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    files: ["*.ts", "*.tsx", "*.js"],
    languageOptions: {
      parser,
    },
  },
]

export default eslintConfig
