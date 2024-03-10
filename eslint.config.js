// @ts-check
import eslint from '@eslint/js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Linter } from 'eslint';
import tslint from 'typescript-eslint';

/** @type {Linter.FlatConfig} */
const config = {
  ignores: ['ecosystem.config.cjs'],
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/require-await': 'warn',

    '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
    '@typescript-eslint/consistent-type-imports': 'warn',
  },
};

export default tslint.config(
  eslint.configs.recommended,
  ...tslint.configs.strictTypeChecked,
  ...tslint.configs.stylisticTypeChecked,
  config,
);
