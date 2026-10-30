import js from "@eslint/js";
import globals from "globals";

// Konfigurasi dasar tanpa plugin tambahan: menangkap variabel tak terpakai,
// impor yatim, dan salah ketik. Aturan khusus React hooks butuh
// eslint-plugin-react-hooks -- pasang kalau sudah bisa akses npm.
export default [
  { ignores: ["dist/**", "node_modules/**", "design-system/**", "src/design/bundle.css"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Nama berhuruf besar biasanya komponen JSX; tanpa eslint-plugin-react,
      // aturan inti tidak melihat pemakaiannya di dalam JSX.
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z]", destructuredArrayIgnorePattern: "^[A-Z]" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["warn", "smart"],
    },
  },
];
