import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0e0d',
          soft: '#0f1513',
          card: '#121a17',
          elevated: '#16201c',
        },
        accent: {
          DEFAULT: '#22c55e',
          soft: '#4ade80',
          dim: '#16a34a',
          glow: 'rgba(34,197,94,0.35)',
        },
        muted: '#7a8a83',
        line: 'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(34,197,94,0.45)',
        card: '0 8px 32px -12px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'green-gradient': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'dark-radial': 'radial-gradient(120% 120% at 50% 0%, #16201c 0%, #0a0e0d 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
