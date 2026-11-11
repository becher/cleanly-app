// Écran Réseaux — connexion des comptes sociaux
// Affiche les 8 réseaux Phase 1 avec leur statut

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

// Config des réseaux Phase 1
const PHASE1_NETWORKS = [
  { id: 'discord',  name: 'Discord',          icon: '🟣', color: '#5865F2' },
  { id: 'twitter',  name: 'X / Twitter',       icon: '🐦', color: '#000000' },
  { id: 'reddit',   name: 'Reddit',            icon: '🟠', color: '#FF4500' },
  { id: 'bluesky',  name: 'Bluesky',           icon: '🦋', color: '#0085FF' },
  { id: 'mastodon', name: 'Mastodon',          icon: '🐘', color: '#6364FF' },
  { id: 'threads',  name: 'Threads',           icon: '🧵', color: '#000000' },
  { id: 'youtube',  name: 'YouTube',           icon: '▶️', color: '#FF0000' },
  { id: 'teams',    name: 'Microsoft Teams',   icon: '💜', color: '#6264A7' },
];

// Config des réseaux Phase 2 (bientôt)
const PHASE2_NETWORKS = [
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E1306C' },
  { id: 'facebook',  name: 'Facebook',  icon: '📘', color: '#1877F2' },
  { id: 'linkedin',  name: 'LinkedIn',  icon: '💼', color: '#0A66C2' },
  { id: 'tiktok',   name: 'TikTok',    icon: '🎵', color: '#010101' },
  { id: 'slack',    name: 'Slack',     icon: '💬', color: '#4A154B' },
];

export default function NetworksScreen() {
  const { t } = useTranslation();

  // Connexion → à implémenter avec OAuth (expo-auth-session)
  function handleConnect(networkName: string) {
    Alert.alert(
      `Connecter ${networkName}`,
      'L\'authentification OAuth sera bientôt disponible.',
      [{ text: 'OK' }]
    );
  }

  return (
    <ScrollView style={styles.page}>
      {/* Phase 1 — Disponible */}
      <Text style={styles.sectionLabel}>{t('networks.phase1')}</Text>
      {PHASE1_NETWORKS.map((network) => (
        <NetworkRow
          key={network.id}
          network={network}
          isAvailable={true}
          onConnect={() => handleConnect(network.name)}
        />
      ))}

      {/* Phase 2 — Bientôt */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{t('networks.phase2')}</Text>
      {PHASE2_NETWORKS.map((network) => (
        <NetworkRow
          key={network.id}
          network={network}
          isAvailable={false}
          onConnect={() => {}}
        />
      ))}
    </ScrollView>
  );
}

// Composant : ligne d'un réseau
function NetworkRow({
  network,
  isAvailable,
  onConnect,
}: {
  network: { id: string; name: string; icon: string; color: string };
  isAvailable: boolean;
  onConnect: () => void;
}) {
  return (
    <View style={[styles.row, !isAvailable && styles.rowDisabled]}>
      {/* Icône */}
      <Text style={styles.icon}>{network.icon}</Text>

      {/* Nom */}
      <View style={styles.info}>
        <Text style={styles.name}>{network.name}</Text>
        <Text style={styles.status}>
          {isAvailable ? 'Non connecté' : 'Bientôt disponible'}
        </Text>
      </View>

      {/* Bouton */}
      {isAvailable ? (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: network.color }]}
          onPress={onConnect}
        >
          <Text style={styles.btnText}>Connecter</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.btnSoon}>
          <Text style={styles.btnSoonText}>Bientôt</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 16,
  },
  sectionLabel: {
    color: '#5A5A70',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    gap: 12,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  icon: { fontSize: 28 },
  info: { flex: 1 },
  name: {
    color: '#F8F8FF',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    color: '#5A5A70',
    fontSize: 13,
    marginTop: 2,
  },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  btnSoon: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2A2A3A',
  },
  btnSoonText: {
    color: '#5A5A70',
    fontSize: 13,
    fontWeight: '600',
  },
});
