import {defineConfig, globalIgnores} from 'eslint/config';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default defineConfig([js.configs.recommended, ...ts.configs.recommended,
  {files:['**/*.tsx'],plugins:{'react-hooks':hooks},rules:hooks.configs.recommended.rules},
  globalIgnores(['.next/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '.local/**', 'next-env.d.ts'])]);
