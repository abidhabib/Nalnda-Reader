export const ReaderPreferenceOptions = {
  fontSize: { min: 50, max: 250, step: 10, offset: 50 }, // Changed min from 100 to 50
  lineHeight: {
    options: [
      { id: "compact", value: 1.4, label: "Compact" },
      { id: "normal", value: 1.6, label: "Normal" },
      { id: "relaxed", value: 1.8, label: "Relaxed" },
    ],
  },
  margin: {
    options: [
      { id: "narrow", value: 4, label: "Narrow" },
      { id: "normal", value: 8, label: "Normal" },
      { id: "wide", value: 16, label: "Wide" },
    ],
    unit: "%",
  },
  fontFamily: [
    { id: "reader-font-family-arial", name: "Arial", value: "'Arial', sans-serif" },
    { id: "reader-font-family-times", name: "Times", value: "'Times New Roman', serif" },
    { id: "reader-font-family-roboto", name: "Roboto", value: "'Roboto', sans-serif" },
    { id: "reader-font-family-baskerville", name: "Baskerville", value: "'Baskerville', serif" },
    { id: "reader-font-family-bookerly", name: "Bookerly", value: "'Bookerly', serif" },
    { id: "reader-font-family-cecilia", name: "Cecilia", value: "'Cecilia', serif" },
  ],
  themes: [
    { id: "reader-theme-light", name: "Light", backgroundColor: "#ffffff", color: "#000000", bodyTheme: "light" },
    { id: "reader-theme-dark", name: "Dark", backgroundColor: "#1a1a1a", color: "#ffffff", bodyTheme: "dark" },
    { id: "reader-theme-sepia", name: "Reader", backgroundColor: "#f4f1ea", color: "#5c4b37", bodyTheme: "sepia" },
  ],
}

export const ReaderDefault = {
  fontSize: 60, // This is now 60% which is above the new minimum of 50
  lineHeight: 1.6,
  margin: 8,
  fontFamily: ReaderPreferenceOptions.fontFamily.find((ff) => ff.id === "reader-font-family-roboto"),
  theme: ReaderPreferenceOptions.themes.find((t) => t.id === "reader-theme-light"),
}

export const ReaderBaseTheme = {
  body: {
    "--font-family": ReaderDefault.fontFamily.value,
    "--font-size": ReaderDefault.fontSize + "%",
    "--line-height": ReaderDefault.lineHeight,
    "--margin": ReaderDefault.margin + "%",
    "--background-color": ReaderDefault.theme.backgroundColor,
    "--color": ReaderDefault.theme.color,

    "background-color": "var(--background-color) !important",
    color: "var(--color) !important",
    "font-size": "var(--font-size) !important",
    "margin-left": "var(--margin) !important",
    "margin-right": "var(--margin) !important",
    // Removed transition to prevent book content animations
  },
  p: {
    "text-align": "justify",
    "font-family": "var(--font-family) !important",
    "line-height": "var(--line-height) !important",
  },
}
