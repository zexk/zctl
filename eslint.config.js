export default [
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'prefer-const': 'error',
    },
  },
];
