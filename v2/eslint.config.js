import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `dist` and `dist-ssr` are vite build outputs (both git-ignored); `.claude`
  // holds vendored skill scripts. None are ours to lint — keep `eslint .` off them
  // so a post-build lint run can't go red on generated / third-party code.
  globalIgnores(['dist', 'dist-ssr', '.claude/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // react-hooks 7.x promoted these React-Compiler advisory rules to errors.
      // They flag correct, intentional pre-existing animation code (setState in
      // rAF-driven effects, ref reads for down-tick styling). Keep them as
      // advisory warnings — no runtime code is touched.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
])
