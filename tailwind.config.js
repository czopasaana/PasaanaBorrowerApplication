/**
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/**/*.html',
    './public/**/*.js',
    './src/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        'pas-blue': '#1e3a8a',
        'pas-orange': '#f97316',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    // ...other plugins
  ],
  safelist: [
    'max-h-0',
    'transition-all',
    'duration-300',
    'ease-in-out',
    'open',
    'text-blue-500',
    'bg-blue-500',
  ],
};

