import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      'no-relative-import-paths': noRelativeImportPaths,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-relative-import-paths/no-relative-import-paths': [
        'warn',
        { allowSameFolder: true, rootDir: 'packages/cli', prefix: '@' },
      ],
    },
  },

  prettier,

  { ignores: ['node_modules/**', '**/*.d.ts'] },
)
