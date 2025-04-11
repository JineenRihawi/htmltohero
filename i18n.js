const i18n = require('i18next');
const Backend = require('i18next-fs-backend');

i18n.use(Backend).init({
  fallbackLng: 'en',
  preload: ["en", "tr", "es", "fr", "de", "pt", "ar", "ru"],
  backend: {
    loadPath: __dirname + '/languages/{{lng}}.json'
  },
  initImmediate: false
});

module.exports = i18n;