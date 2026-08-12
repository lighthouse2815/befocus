import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactNative from 'eslint-plugin-react-native'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'dist-web-check/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { globals: globals.node },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.es2022, ...globals.browser, ...globals.node, ...globals.jest },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-native': reactNative },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-native/no-inline-styles': 'off',
      'react-native/no-unused-styles': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
)
