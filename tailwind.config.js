/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary, #2563eb)',
        luxury: {
          cream: '#F8F7F5',
          ink: '#1A1A1A',
          bronze: '#8A7356',
          sand: '#C8B59A',
        },
      },
      maxWidth: {
        luxury: '1440px',
      },
    },
  },
  plugins: [],
}
