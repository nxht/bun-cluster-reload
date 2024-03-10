// @ts-check
import eslint from '@eslint/js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Linter } from 'eslint';
import tslint from 'typescript-eslint';

/** @type {Linter.FlatConfig} */
const config = {
  ignores: ['ecosystem.config.cjs'],
  languageOptions: {
    parserOptions: { project: true, tsconfigRootDir: import.meta.dirname },
  },
  rules: { '@typescript-eslint/consistent-type-definitions': ['warn', 'type'] },
};

export default tslint.config(
  eslint.configs.recommended,
  ...tslint.configs.strictTypeChecked,
  ...tslint.configs.stylisticTypeChecked,
  config,
);
