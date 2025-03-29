// Local storage keys for better state persistence
export const LOCAL_STORAGE_KEYS = {
  LAST_PATH: "deep-research.last-path",
  REASONING_PATH_CACHE: "deep-research.reasoning-path-cache",
  FINDINGS_CACHE: "deep-research.findings-cache",
  SOURCES_CACHE: "deep-research.sources-cache",
  OUTPUT_CACHE: "deep-research.output-cache",
  ACTIVE_TAB: "deep-research.active-tab"
};

// Session-specific keys
export const getSessionStorageKey = (baseKey: string, sessionId: string) => {
  return `${baseKey}.${sessionId}`;
};

export const BRAND_COLORS = {
  primary: {
    light: "#4F46E5", // Indigo-600
    DEFAULT: "#4338CA", // Indigo-700
    dark: "#3730A3", // Indigo-800
  },
  secondary: {
    light: "#3B82F6", // Blue-500 
    DEFAULT: "#2563EB", // Blue-600
    dark: "#1D4ED8", // Blue-700
  },
  accent: {
    light: "#C4B5FD", // Violet-300
    DEFAULT: "#A78BFA", // Violet-400
    dark: "#8B5CF6", // Violet-500
  },
  success: "#10B981", // Emerald-500
  warning: "#F59E0B", // Amber-500
  error: "#EF4444", // Red-500
  gray: {
    light: "#F1F5F9", // Slate-100
    DEFAULT: "#94A3B8", // Slate-400
    dark: "#334155", // Slate-700
  }
};
