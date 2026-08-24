import js from "@eslint/js";

export default [
  { ignores: ["_site/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Blob: "readonly",
        URL: "readonly",
        FileReader: "readonly",
        localStorage: "readonly",
        document: "readonly",
        window: "readonly",
        location: "readonly",
        confirm: "readonly",
        fetch: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      eqeqeq: ["error", "smart"],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^(?:_|REQUIREMENT_GROUPS$)",
        },
      ],
      "prefer-const": "error",
    },
  },
];
