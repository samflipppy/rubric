/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF7',
        surface: '#FFFFFF',
        ink: '#0A0A0A',
        muted: '#737373',
        border: '#E5E5E5',
        hover: '#F5F5F0',
        intent: '#D97706',
        behavioral: '#2563EB',
        invariant: '#7C3AED',
        approve: '#16A34A',
        changes: '#EA580C',
        'needs-human': '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['18px', '28px'],
        xl: ['22px', '32px'],
        '2xl': ['28px', '36px'],
        '3xl': ['36px', '44px'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
      },
    },
  },
  plugins: [],
};
