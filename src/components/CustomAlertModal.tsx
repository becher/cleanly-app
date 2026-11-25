// Composant de Dialogue / Alerte personnalisé 100% Cross-Platform (iOS & Android)
// Remplace Alert.alert avec alignement parfait des icônes et boutons thématiques

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../constants/theme';

export interface CustomAlertButton {
  text: string;
  style?: 'cancel' | 'destructive' | 'primary' | 'secondary' | 'default';
  icon?: string;
  onPress?: () => void;
}

export interface CustomAlertProps {
  visible: boolean;
  type?: 'info' | 'warning' | 'danger' | 'success';
  icon?: string;
  title: string;
  message: string;
  buttons: CustomAlertButton[];
  onClose: () => void;
}

export function CustomAlertModal({
  visible,
  type = 'info',
  icon,
  title,
  message,
  buttons,
  onClose,
}: CustomAlertProps) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const defaultIconName =
    icon ||
    (type === 'danger'
      ? 'trash-outline'
      : type === 'warning'
      ? 'warning-outline'
      : type === 'success'
      ? 'checkmark-circle-outline'
      : 'information-circle-outline');

  const defaultIconColor =
    type === 'danger'
      ? '#EF4444'
      : type === 'warning'
      ? '#F59E0B'
      : type === 'success'
      ? '#10B981'
      : '#5865F2';

  const isVertical = buttons.length > 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Cercle d'icône principal */}
          <View style={[styles.iconCircle, { backgroundColor: `${defaultIconColor}15` }]}>
            <Ionicons name={defaultIconName} size={32} color={defaultIconColor} />
          </View>

          {/* Titre */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Liste des boutons */}
          <View style={[styles.buttonsContainer, isVertical && styles.buttonsContainerVertical]}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimary = btn.style === 'primary';
              const isSecondary = btn.style === 'secondary' || btn.style === 'default';

              let btnBgColor: string = theme.bg.raised;
              let btnBorderColor: string = theme.border.default;
              let textColor: string = theme.text.primary;
              let iconColor: string = theme.text.primary;

              if (isDestructive) {
                btnBgColor = '#EF4444';
                btnBorderColor = '#EF4444';
                textColor = '#FFF';
                iconColor = '#FFF';
              } else if (isPrimary) {
                btnBgColor = '#5865F2';
                btnBorderColor = '#5865F2';
                textColor = '#FFF';
                iconColor = '#FFF';
              } else if (isSecondary) {
                btnBgColor = '#5865F212';
                btnBorderColor = '#5865F235';
                textColor = '#5865F2';
                iconColor = '#5865F2';
              } else if (isCancel) {
                btnBgColor = '#F0F2F5';
                btnBorderColor = '#CED0D4';
                textColor = theme.text.secondary;
                iconColor = theme.text.secondary;
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.btn,
                    isVertical ? styles.btnVertical : styles.btnHorizontal,
                    {
                      backgroundColor: btnBgColor,
                      borderColor: btnBorderColor,
                      borderWidth: isCancel || isSecondary ? 1 : 0,
                    },
                  ]}
                  onPress={() => {
                    onClose();
                    btn.onPress?.();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.btnContent}>
                    {btn.icon && (
                      <Ionicons
                        name={btn.icon}
                        size={18}
                        color={iconColor}
                        style={styles.btnIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.btnText,
                        { color: textColor },
                        (isPrimary || isDestructive) && { fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {btn.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFF',
    borderRadius: theme.radius.lg,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  buttonsContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  buttonsContainerVertical: {
    flexDirection: 'column',
    gap: 8,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
  },
  btnHorizontal: {
    flex: 1,
  },
  btnVertical: {
    width: '100%',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    marginRight: 8,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
