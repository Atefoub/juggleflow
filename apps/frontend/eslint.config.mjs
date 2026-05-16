import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  // Service worker scripts in public/ (imported by Workbox) — `self` is valid here.
  {
    files: ['public/sw-*.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
      },
    },
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
];
