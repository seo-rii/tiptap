import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import svelteConfig from './svelte.config.js';

const ignores = ['node_modules/**', 'dist/**', 'build/**', '.svelte-kit/**', 'package/**'];

export default [
	{ ignores },
	js.configs.recommended,
	ts.configs['flat/base'],
	ts.configs['flat/eslint-recommended'],
	...svelte.configs['flat/base'],
	{
		rules: {
			'no-unused-vars': 'off',
			'prefer-const': 'off',
			'no-unsafe-optional-chaining': 'off',
			'no-prototype-builtins': 'off'
		}
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: tsParser,
				svelteConfig
			}
		}
	},
	prettier,
	...svelte.configs['flat/prettier']
];
