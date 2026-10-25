/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:    '#1a1614',
        paper:  '#f5f0e8',
        madder: '#a33d2a',
        stone:  '#7c6f67',
        saffron:'#e8873a',
        turmeric:'#d4a017',
        indigo: '#3d4f8a',
        teal:   '#2a7f6f',
        cream:  '#fdf8ef',
        dark:   '#0f0c0b',
      },
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      maxWidth: {
        measure: '65ch',
      },
    },
  },
  plugins: [],
};
