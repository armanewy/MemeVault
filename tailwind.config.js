/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0D10',
        panel: '#11151B',
        panelAlt: '#171C23',
        border: '#26303A',
        textPrimary: '#F4F7FA',
        textSecondary: '#9AA7B4',
        accent: '#8B5CF6',
        danger: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B'
      },
      boxShadow: {
        palette: '0 24px 80px rgba(0, 0, 0, 0.45)'
      }
    }
  },
  plugins: []
};
