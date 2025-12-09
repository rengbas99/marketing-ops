/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        surface: 'var(--color-surface)',
        background: 'var(--color-surface-alt)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
      },
      spacing: {
        'space-1': 'var(--space-1)',
        'space-2': 'var(--space-2)',
        'space-3': 'var(--space-3)',
        'space-4': 'var(--space-4)',
        'space-5': 'var(--space-5)',
        'space-6': 'var(--space-6)',
        'space-7': 'var(--space-7)',
        'space-8': 'var(--space-8)',
      },
      height: {
        'screen-safe': 'calc(var(--vh) * 100)',
      },
      maxHeight: {
        'screen-safe': 'calc(var(--vh) * 100)',
      },
      zIndex: {
        base: 'var(--z-base)',
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        header: 'var(--z-header)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
      transitionTimingFunction: {
        'ease-fast': 'var(--ease-fast)',
        'ease-medium': 'var(--ease-medium)',
        'ease-slow': 'var(--ease-slow)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        medium: 'var(--dur-medium)',
        slow: 'var(--dur-slow)',
      },
      animation: {
        'fade-md': 'fadeIn var(--dur-medium) var(--ease-medium) both',
        'slide-up-md': 'slideInUp var(--dur-medium) var(--ease-medium) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideInUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

