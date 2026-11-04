const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Start from Expo's default Metro config, then add NativeWind's CSS pipeline.
const config = getDefaultConfig(__dirname);

// `input` is the Tailwind entry stylesheet imported from App.js
module.exports = withNativeWind(config, { input: './global.css' });
