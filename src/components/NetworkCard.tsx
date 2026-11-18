// NetworkCard — carte réseau réutilisable
// Affiche : icône, nom, statut, bouton action

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  icon: string;
  name: string;
  color: string;
  isConnected: boolean;
  deletionCount?: number;   // Nombre de suppressions en cours
  onConnect: () => void;
  onClean?: () => void;     // Lancer une suppression
};

export function NetworkCard({
  icon,
  name,
  color,
  isConnected,
  deletionCount = 0,
  onConnect,
  onClean,
}: Props) {
  return (
    <View style={[styles.card, isConnected && styles.cardConnected]}>
      {/* En-tête : icône + nom */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{name}</Text>
          <Text style={[styles.status, isConnected && styles.statusConnected]}>
            {isConnected ? '● Connecté' : '○ Non connecté'}
          </Text>
        </View>
      </View>

      {/* Badge suppressions en cours */}
      {isConnected && deletionCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{deletionCount} en cours...</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isConnected ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: color }]}
            onPress={onClean}
          >
            <Text style={styles.btnText}>🧹 Nettoyer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnOutline} onPress={onConnect}>
            <Text style={[styles.btnOutlineText, { color }]}>Connecter →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#13131A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    gap: 12,
  },
  cardConnected: {
    borderColor: '#6C63FF44',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  nameBlock: { flex: 1 },
  name: {
    color: '#F8F8FF',
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    color: '#5A5A70',
    fontSize: 13,
    marginTop: 2,
  },
  statusConnected: {
    color: '#22C55E', // vert
  },
  badge: {
    backgroundColor: '#F59E0B22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btn: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnOutline: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#2A2A3A',
  },
  btnOutlineText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
