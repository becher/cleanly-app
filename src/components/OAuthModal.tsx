// Modale OAuth intégrée avec WebView
// Intercepte instantanément les redirections OAuth avant qu'elles n'atteignent le réseau

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../constants/theme';
import type { OAuthResult } from '../api/oauth';

type OAuthModalProps = {
  visible: boolean;
  title: string;
  authUrl: string;
  redirectUri: string;
  onSuccess: (result: OAuthResult) => void;
  onError: (error: Error) => void;
  onClose: () => void;
};

export function OAuthModal({
  visible,
  title,
  authUrl,
  redirectUri,
  onSuccess,
  onError,
  onClose,
}: OAuthModalProps): React.JSX.Element | null {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef<any>(null);

  // Gestion du bouton retour physique Android (Hardware Back Button)
  useEffect(() => {
    if (!visible) return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // Empêche React Navigation de sauter à l'accueil
      }
      onClose();
      return true; // Empêche React Navigation de sauter à l'accueil
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, canGoBack, onClose]);

  if (!visible || !authUrl) return null;

  const handleInterceptUrl = (url: string): boolean => {
    // Si l'URL commence par le redirectUri ou contient les paramètres de retour
    if (url.startsWith(redirectUri) || url.includes('/oauth#') || url.includes('/oauth?')) {
      try {
        const hashOrQuery = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
        const params = new URLSearchParams(hashOrQuery);

        // 1. Implicit grant (#access_token=...)
        const accessToken = params.get('access_token');
        if (accessToken) {
          onSuccess({
            accessToken,
            expiresIn: params.has('expires_in') ? Number(params.get('expires_in')) : undefined,
            scope: params.get('scope') ?? undefined,
          });
          onClose();
          return false; // Bloquer la requête réseau vers GoDaddy
        }

        // 2. Erreur OAuth Discord (ex: access_denied)
        const error = params.get('error');
        if (error) {
          onError(new Error(params.get('error_description') ?? error));
          onClose();
          return false;
        }

        // 3. Code grant (?code=...)
        const code = params.get('code');
        if (code) {
          onSuccess({
            accessToken: code,
          });
          onClose();
          return false;
        }
      } catch (err) {
        onError(err instanceof Error ? err : new Error('Erreur parsing OAuth'));
        onClose();
        return false;
      }
    }
    return true; // Continuer la navigation normale (ex: login Discord)
  };

  const handleShouldStartLoad = (request: ShouldStartLoadRequest) => {
    return handleInterceptUrl(request.url);
  };

  const handleModalClose = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleModalClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Header Cleanly */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Loader */}
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.accent.primary} />
          </View>
        )}

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: authUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onNavigationStateChange={(navState: WebViewNavigation): void => {
            setCanGoBack(navState.canGoBack);
            handleInterceptUrl(navState.url);
          }}
          userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          incognito={true}
          style={styles.webview}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text.primary,
  },
  closeBtn: {
    padding: 4,
  },
  loader: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    padding: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 10,
  },
  webview: {
    flex: 1,
  },
});
