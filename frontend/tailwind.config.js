/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nms-bg': '#0B0F14',
        'nms-sidebar': '#070A0F',
        'nms-surface': '#111821',
        'nms-surface-raised': '#17202B',
        'nms-hover': '#1D2835',
        'nms-border': '#243244',
        'nms-border-strong': '#34465C',
        'nms-text': '#F4F7FB',
        'nms-text-secondary': '#AAB6C5',
        'nms-text-muted': '#768497',
        'nms-brand': '#2F80ED',
        'nms-cyan': '#22D3EE',
        'nms-green': '#22C55E',
        'nms-amber': '#F59E0B',
        'nms-red': '#EF4444',
        'nms-critical': '#B91C1C',
        'nms-violet': '#8B5CF6',
      },
      fontFamily: {
        'vietnam': ['"Be Vietnam Pro"', 'Inter', 'Roboto', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'page-title': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'section-title': ['18px', { lineHeight: '28px', fontWeight: '600' }],
        'card-title': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'table': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'status': ['12px', { lineHeight: '18px', fontWeight: '600' }],
        'metric': ['28px', { lineHeight: '36px', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
}
