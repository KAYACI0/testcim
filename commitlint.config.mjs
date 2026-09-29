/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      [
        'repo',
        'tooling',
        'ci',
        'web',
        'shared',
        'layout',
        'renderers',
        'omr',
        'image-tools',
        'scripts',
        'supabase',
        'docs',
        'deps',
      ],
    ],
    'subject-case': [0],
  },
};
