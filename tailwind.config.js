/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neubrutalism Light Palette
        nb: {
          cream: '#FFFDF5',
          white: '#FFFFFF',
          black: '#000000',
          coral: '#FF5C35',
          yellow: '#FFDA56',
          emerald: '#00E599',
          indigo: '#5B61FF',
          pink: '#FF3366',
          cyan: '#00D8F6',
          purple: '#B872FF',
          muted: '#4A4A4A',
          border: '#000000',
        },
        // Neubrutalism Dark Palette
        nbdark: {
          canvas: '#121214',
          surface: '#1E1E22',
          surfaceHover: '#28282D',
          border: '#000000',
          borderWhite: '#FFFFFF',
          text: '#EDEDED',
          muted: '#A1A1AA',
          coral: '#FF6E4A',
          yellow: '#FFE066',
          emerald: '#00F5A0',
          indigo: '#757BFF',
          pink: '#FF4D7D',
          cyan: '#38E1FF',
        }
      },
      boxShadow: {
        'nb': '4px 4px 0px #000000',
        'nb-lg': '6px 6px 0px #000000',
        'nb-sm': '2px 2px 0px #000000',
        'nb-white': '4px 4px 0px #FFFFFF',
        'nb-lg-white': '6px 6px 0px #FFFFFF',
        'nb-yellow': '4px 4px 0px #FFDA56',
        'nb-coral': '4px 4px 0px #FF5C35',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
      }
    },
  },
  plugins: [],
}
