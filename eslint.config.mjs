// Single flat config for the whole monorepo.
//
// Flat config does not cascade and ESLint resolves it from the current working
// directory, so one root config keeps `eslint .`, lint-staged and editors in agreement.
//
// Pinned versions: ESLint 9 and TypeScript 6. ESLint 10 is available but
// eslint-plugin-import@2 (a dependency of eslint-config-next) declares eslint ^9 as its
// maximum, and typescript-eslint@8 declares typescript <6.1.0. See docs/backlog.md.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/**
 * eslint-config-next already registers the @typescript-eslint plugin, and a plugin may
 * only be registered once in a flat config. So take the type-checked rule list from
 * typescript-eslint without re-registering its plugin.
 */
const typeCheckedRules = Object.assign(
  {},
  ...tseslint.configs.recommendedTypeChecked.map((config) => config.rules ?? {}),
);

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/next-env.d.ts',
    'packages/shared/src/database.types.ts',
  ]),

  js.configs.recommended,
  ...nextVitals,
  ...nextTs,

  {
    settings: {
      // The Next.js plugin lives in a monorepo here, so tell it where the app is.
      next: { rootDir: 'apps/web/' },
      // React is a dependency of apps/web, not of the repo root, so state the version.
      react: { version: '19.3' },
    },
  },

  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: {
        // Resolves the nearest tsconfig.json per file, so every workspace is covered.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: typeCheckedRules,
  },

  {
    plugins: { import: importPlugin },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          pathGroups: [{ pattern: '@testcim/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    // React and Next must not leak into the pure TypeScript packages.
    files: ['packages/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'next', 'next/*'],
              message: 'packages/* must stay free of React and Next dependencies.',
            },
          ],
        },
      ],
    },
  },

  {
    // Config files conventionally export an anonymous object literal.
    files: ['**/*.config.{ts,mts,mjs}', '**/.lintstagedrc.mjs'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },

  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    // Tooling files at the repo root are outside every tsconfig project.
    files: ['*.mjs', '*.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
]);
