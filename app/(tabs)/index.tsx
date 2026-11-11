// Dashboard principal de Cleanly
// Affiche les réseaux connectés et les statistiques

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

// Liste des réseaux supportés (Phase 1)
const NETWORKS = [
  { id: 'discord',  name: 'Discord',          icon: '🟣', color: '#5865F2' },
  { id: 'twitter',  name: 'X / Twitter',       icon: '🐦', color: '#000000' },
  { id: 'reddit',   name: 'Reddit',            icon: '🟠', color: '#FF4500' },
  { id: 'bluesky',  name: 'Bluesky',           icon: '🦋', color: '#0085FF' },
  { id: 'mastodon', name: 'Mastodon',          icon: '🐘', color: '#6364FF' },
  { id: 'threads',  name: 'Threads',           icon: '🧵', color: '#000000' },
  { id: 'youtube',  name: 'YouTube',           icon: '▶️', color: '#FF0000' },
  { id: 'teams',    name: 'Microsoft Teams',   icon: '💜', color: '#6264A7' },
];

export default function DashboardScreen() {
  // Pour l'instant : aucun compte connecté (sera géré par authStore)
  const connectedNetworks = 0;
  const deletionsInProgress = 0;

  return (
    <ScrollView style={styles.page}>
      {/* En-tête statistiques */}
      <View style={styles.statsRow}>
        <StatCard
          label="Réseaux connectés"
          value={connectedNetworks}
          color="#6C63FF"
        />
        <StatCard
          label="En cours"
          value={deletionsInProgress}
          color="#F59E0B"
        />
      </View>

      {/* Message de bienvenue si rien de connecté */}
      {connectedNetworks === 0 && (
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeEmoji}>🧹</Text>
          <Text style={styles.welcomeTitle}>Bienvenue sur Cleanly !</Text>
          <Text style={styles.welcomeText}>
            Connectez un réseau social pour supprimer vos anciens posts automatiquement.
          </Text>
          <TouchableOpacity style={styles.connectButton}>
            <Text style={styles.connectButtonText}>Connecter un réseau →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Liste des réseaux disponibles */}
      <Text style={styles.sectionLabel}>RÉSEAUX DISPONIBLES</Text>
      {NETWORKS.map((network) => (
        <TouchableOpacity key={network.id} style={styles.networkRow}>
          {/* Icône */}
          <Text style={styles.networkIcon}>{network.icon}</Text>

          {/* Nom du réseau */}
          <View style={styles.networkInfo}>
            <Text style={styles.networkName}>{network.name}</Text>
            <Text style={styles.networkStatus}>Non connecté</Text>
          </View>

          {/* Bouton de connexion */}
          <View style={[styles.connectBadge, { backgroundColor: network.color }]}>
            <Text style={styles.connectBadgeText}>Connecter</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// Composant : carte statistique
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statNumber, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  // Page principale (fond noir)
  page: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 16,
  },

  // Ligne de statistiques
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#13131A',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
  },
  statLabel: {
    color: '#9B9BB0',
    fontSize: 13,
    marginTop: 4,
  },

  // Boite de bienvenue
  welcomeBox: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  welcomeEmoji: { fontSize: 48 },
  welcomeTitle: {
    color: '#F8F8FF',
    fontSize: 20,
    fontWeight: '700',
  },
  welcomeText: {
    color: '#9B9BB0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  connectButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
  },
  connectButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Label de section
  sectionLabel: {
    color: '#5A5A70',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Ligne réseau
  networkRow: {
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
  networkIcon: { fontSize: 28 },
  networkInfo: { flex: 1 },
  networkName: {
    color: '#F8F8FF',
    fontSize: 16,
    fontWeight: '600',
  },
  networkStatus: {
    color: '#5A5A70',
    fontSize: 13,
    marginTop: 2,
  },
  connectBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
