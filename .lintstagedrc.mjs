export default {
  '*.{ts,tsx,mts,mjs,js,jsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,md,css,yml,yaml}': ['prettier --write'],
};
