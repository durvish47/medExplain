module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource 'nativewind' lets className props work on RN components
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      // Compiles Tailwind classes into React Native styles at build time
      'nativewind/babel',
    ],
  };
};
