// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      // Add any other rules you need
    },
  },
];
