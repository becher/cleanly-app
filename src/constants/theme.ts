// Design tokens Cleanly — thème "Clean Light"
// Style : Facebook · Instagram · LinkedIn — familier, clair, lisible

export const theme = {
  bg: {
    base:    '#F0F2F5',   // Fond général — gris clair Facebook
    surface: '#FFFFFF',   // Cards / écrans
    raised:  '#E4E6EB',   // Hover / input
    overlay: '#FFFFFF',   // Modal
  },
  border: {
    subtle:  '#E4E6EB',
    default: '#CED0D4',
    focus:   '#1877F244',
    glow:    '#1877F2',
  },
  accent: {
    primary:  '#1877F2',  // Bleu Facebook — action principale
    primaryL: '#3A8FF5',  // Hover
    cyan:     '#0099E6',  // Lien / data
    green:    '#31A24C',  // Succès
    amber:    '#E8720C',  // Warning
    red:      '#FA3E3E',  // Erreur / danger
  },
  text: {
    primary:  '#1C1E21',  // Quasi-noir
    secondary:'#65676B',  // Gris moyen
    muted:    '#8A8D91',  // Très discret
    onAccent: '#FFFFFF',  // Texte sur bouton bleu
  },
  font: {
    mono: undefined,      // Pas de monospace en mode light
    ui:   undefined,      // Font système
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 10, lg: 14, xl: 20, full: 999 },
} as const;

// Couleurs par plateforme
export const PLATFORM_COLORS: Record<string, string> = {
  discord:  '#5865F2',
  twitter:  '#1D9BF0',
  reddit:   '#FF4500',
  bluesky:  '#0085FF',
  mastodon: '#6364FF',
  threads:  '#000000',
  youtube:  '#FF0000',
  teams:    '#6264A7',
};
