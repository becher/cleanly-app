// Stub SQLite — utilisé par Metro quand expo-sqlite n'est pas disponible (Expo Go)
// En production (dev build / EAS), Metro utilisera le vrai expo-sqlite

console.warn('[Cleanly] Running without SQLite (Expo Go). Use a dev build for full features.');

module.exports = {
  openDatabaseSync: () => ({
    execSync: () => {},
    runSync: () => {},
    getAllSync: () => [],
    getFirstSync: () => null,
  }),
};

