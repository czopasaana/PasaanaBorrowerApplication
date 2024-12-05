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
    'bg-red-50',
    'bg-yellow-50',
    'bg-green-50',
    'bg-gray-50',
    'hover:bg-red-100',
    'hover:bg-yellow-100',
    'hover:bg-green-100',
    'hover:bg-gray-100',

    // Border Colors
    'border-red-200',
    'border-yellow-200',
    'border-green-200',
    'border-gray-200',

    // Text Colors
    'text-red-700',
    'text-yellow-700',
    'text-green-700',
    'text-gray-700',

    // Transition and Transform
    'transition-all',
    'duration-200',
    'hover:shadow-md',

    // Flex and Spacing
    'space-x-2',
    'space-x-3',
    'space-y-2',

    // Other utility classes used
    'rounded-lg',
    'rounded-full',
    'border',
    'p-4',
    'mb-3',
    'text-sm',
    'font-medium'
  ],
};

