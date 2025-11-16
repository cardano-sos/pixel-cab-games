// Theme colors configuration
export const colors = {
  primary: '#000000',      // Black
  secondary: '#04d9ff',    // Blue
  accent: '#ff6ec7',       // Pink
  highlight: '#a3f1ff',    // Blue Highlight
  white: '#ffffff',
  
  // Semantic colors
  background: '#000000',
  card: '#ffffff',
  text: {
    primary: '#000000',
    secondary: '#ffffff',
    muted: '#6b7280',      // gray-600
  },
  border: {
    default: '#e5e7eb',    // gray-200
    active: '#04d9ff',
    error: '#ff6ec7',
  },
  button: {
    primary: {
      bg: '#04d9ff',
      hoverBg: '#a3f1ff',
      text: '#000000',
    },
    secondary: {
      bg: 'transparent',
      hoverBg: '#ff6ec7',
      text: '#ff6ec7',
      hoverText: '#ffffff',
      border: '#ff6ec7',
    },
    danger: {
      bg: 'transparent',
      hoverBg: '#ff6ec7',
      text: '#ff6ec7',
      hoverText: '#ffffff',
      border: '#ff6ec7',
    }
  },
  status: {
    success: {
      bg: 'rgba(4, 217, 255, 0.1)',
      border: '#04d9ff',
      text: '#000000',
    },
    error: {
      bg: 'rgba(255, 110, 199, 0.1)',
      border: '#ff6ec7',
      text: '#000000',
    },
    info: {
      bg: 'rgba(163, 241, 255, 0.1)',
      border: '#04d9ff',
      text: '#000000',
    }
  }
} as const;

// Tailwind CSS class utilities
export const tw = {
  // Layout
  page: `min-h-screen bg-[${colors.background}]`,
  card: `bg-[${colors.card}] rounded-lg shadow-lg border border-[${colors.border.active}]`,
  
  // Typography
  heading: `text-[${colors.text.secondary}]`,
  bodyText: `text-[${colors.text.primary}]`,
  mutedText: `text-gray-400`,
  
  // Buttons
  button: {
    primary: `bg-[${colors.button.primary.bg}] text-[${colors.button.primary.text}] hover:bg-[${colors.button.primary.hoverBg}] font-medium rounded transition-colors`,
    secondary: `text-[${colors.button.secondary.text}] border border-[${colors.button.secondary.border}] hover:bg-[${colors.button.secondary.hoverBg}] hover:text-[${colors.button.secondary.hoverText}] rounded transition-colors`,
    danger: `text-[${colors.button.danger.text}] border border-[${colors.button.danger.border}] hover:bg-[${colors.button.danger.hoverBg}] hover:text-[${colors.button.danger.hoverText}] rounded transition-colors`,
  },
  
  // Status
  status: {
    success: `bg-[${colors.status.success.bg}] border border-[${colors.status.success.border}] text-[${colors.status.success.text}]`,
    error: `bg-[${colors.status.error.bg}] border border-[${colors.status.error.border}] text-[${colors.status.error.text}]`,
    info: `bg-[${colors.status.info.bg}] border border-[${colors.status.info.border}] text-[${colors.status.info.text}]`,
  },
  
  // Loading
  spinner: `animate-spin rounded-full border-b-2 border-[${colors.secondary}]`,
} as const;

// CSS-in-JS style objects (for libraries that don't support Tailwind)
export const styles = {
  colors,
  button: {
    primary: {
      backgroundColor: colors.button.primary.bg,
      color: colors.button.primary.text,
      ':hover': {
        backgroundColor: colors.button.primary.hoverBg,
      }
    },
    secondary: {
      backgroundColor: colors.button.secondary.bg,
      color: colors.button.secondary.text,
      border: `1px solid ${colors.button.secondary.border}`,
      ':hover': {
        backgroundColor: colors.button.secondary.hoverBg,
        color: colors.button.secondary.hoverText,
      }
    }
  }
} as const;
