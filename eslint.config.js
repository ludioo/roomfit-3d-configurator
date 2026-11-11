import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  history: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  requestIdleCallback: 'readonly',
  cancelIdleCallback: 'readonly',
  performance: 'readonly',
  CustomEvent: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  Image: 'readonly',
  HTMLElement: 'readonly',
  customElements: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
};

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  exports: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  localStorage: 'readonly',
  navigator: 'readonly',
  document: 'readonly',
  window: 'readonly',
  getComputedStyle: 'readonly',
};

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'docs/**',
      'coverage/**',
      'public/decoders/**',
      '.tmp/**',
      '.vite/**',
    ],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals,
    },
  },
  {
    files: [
      'tests/**/*.js',
      'e2e/**/*.js',
      'scripts/**/*.{js,mjs}',
      'vite.config.js',
      'vitest.config.js',
      'playwright.config.js',
      'playwright.baseline.config.js',
      'eslint.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: nodeGlobals,
    },
  },
];
