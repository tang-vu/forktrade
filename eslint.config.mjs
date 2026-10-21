import {defineConfig, globalIgnores} from 'eslint/config';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default defineConfig([js.configs.recommended, ...ts.configs.recommended,
  {files:['feedback/repro/**/*.mjs'],languageOptions:{globals:{
    URL:'readonly',fetch:'readonly',AbortSignal:'readonly',process:'readonly',
    TextDecoder:'readonly',setTimeout:'readonly',clearTimeout:'readonly',
  }}},
  {files:['**/*.tsx'],plugins:{'react-hooks':hooks},rules:hooks.configs.recommended.rules},
  globalIgnores(['.next/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '.local/**', 'next-env.d.ts'])]);
