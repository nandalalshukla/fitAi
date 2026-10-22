/**
 * Compose Reanimated's Jest resolver (which wraps the worklets resolver and
 * picks web/JS fallbacks instead of native modules) with the React Native preset resolver.
 */
const reanimatedResolver = require('react-native-reanimated/jest/resolver.js');
const rnResolver = require('@react-native/jest-preset/jest/resolver.js');

module.exports = (request, options) => {
  const { defaultResolver } = options;
  return reanimatedResolver(request, {
    ...options,
    defaultResolver: (req, opts) => rnResolver(req, { ...opts, defaultResolver }),
  });
};
