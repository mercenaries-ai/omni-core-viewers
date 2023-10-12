/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

export default {

  content: [
    "./index.html",
    "./login.html",
    "./main.ts",
    "../public/app.html",
    "./*.{js,ts,jsx,tsx,hbs}",
  ],
  safelist:[
    'border-2', 'hidden', 'font-semibold', 'font-bold', 'font-normal',
    {
      pattern: /bg-(red|green|blue|orange|grey|gray)-(50|100|600|800)/,
      variants: ['lg', 'hover', 'focus', 'lg:hover'],
    },
    'block', 'flex', 'inline-flex',

    {
      pattern: /translate-/,
    },
    {
      pattern: /h-(5|6)/,
    },
    {
      pattern: /w-(5|10)/,
    },
    {
      pattern: /py-(0.5)/,
    },
    {
      pattern: /rounded/,
    },
    {
      pattern: /ml-(4)/,
    }
  ],
  theme: {
    extend: {
      fontSize:
      {
        'xxs': '0.65rem'
      },
      screens: {
        'xs': '375px',
        ...defaultTheme.screens,
      },
      minHeight:
      {
        '6': '24px',
        '7': '28px',
        '8': '2rem',
      },
      minWidth: {
        '2': '2px',
        '32': '32px',
        '64': '64px',
        '128': '128px',
        '250': '250px',

      },
    },
  },
  plugins: ['@tailwindcss/forms'],
}