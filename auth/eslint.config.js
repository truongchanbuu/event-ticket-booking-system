import eslint from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended"; // Import the recommended config directly

export default [
    eslint.configs.recommended,
    prettierRecommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                process: "readonly",
                console: "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["warn", { varsIgnorePattern: "^_" }],
            "no-console": "off",
            "prettier/prettier": "error",
        },
        ignores: ["node_modules", "dist", "build", "coverage"],
    },
    {
        files: ["*.cjs"],
        languageOptions: {
            sourceType: "commonjs",
        },
        rules: {
            "no-undef": "off",
        },
    },
];
