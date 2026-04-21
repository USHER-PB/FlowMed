/** @type {import('next-i18next').UserConfig} */
const i18nConfig = {
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
  },
  defaultNS: 'common',
  localePath: './public/locales',
};

module.exports = i18nConfig;
