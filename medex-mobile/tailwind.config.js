/** @type {import('tailwindcss').Config} */
module.exports = {
  // Every file that may contain className strings; Tailwind only generates classes it finds here
  content: ['./App.js', './src/**/*.{js,jsx}'],
  // NativeWind's preset maps Tailwind utilities to React Native styles
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Mirrors src/theme/colors.js so the auth flow matches the rest of the app
      colors: {
        primary: { DEFAULT: '#087F78', dark: '#075E59', light: '#D9F4EF' },
        secondary: { DEFAULT: '#5D78D6', light: '#E9EEFF' },
        accent: '#155dfc', // active role-card border + check badge
        ink: '#173A39', // primary text
        subtle: '#58716E', // secondary text
        faint: '#849994', // placeholders / muted text
        line: '#DFEBE7', // default borders
        canvas: '#F3F8F6', // page background
        surface: '#FFFFFF',
        danger: '#D95D5D',
      },
    },
  },
  plugins: [],
};
