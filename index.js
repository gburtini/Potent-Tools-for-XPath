/* eslint-disable global-require */

module.exports = {
  cssToXPath: require('css-xpath'),
  evaluators: require('./src/evaluators'),
  generators: require('./src/generators'),
  patterns: require('./src/patterns'),
  types: {
    XPathNode: require('./src/types/XPathNode'),
    XPathQuery: require('./src/types/XPathQuery'),
  },
};
