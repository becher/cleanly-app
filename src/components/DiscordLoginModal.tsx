// Modale de connexion Discord avec interception automatique du User Token
// Permet d'obtenir les droits complets pour lister les salons et supprimer les messages

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../constants/theme';

type Props = {
  visible: boolean;
  onSuccess: (userToken: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
};

// Script injecté avant tout chargement pour capturer le jeton d'autorisation Discord
const INJECTED_INTERCEPTOR = `
(function() {
  function sendToken(token) {
    if (token && typeof token === 'string' && token.length > 20) {
      // Nettoyer les guillemets éventuels
      var clean = token.replace(/^"(.*)"$/, '$1');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN', token: clean }));
    }
  }

  // 1. Intercepter XMLHttpRequest
  var origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    if (header && header.toLowerCase() === 'authorization') {
      sendToken(value);
    }
    return origSetRequestHeader.apply(this, arguments);
  };

  // 2. Intercepter fetch
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (init && init.headers) {
      var auth = null;
      if (init.headers instanceof Headers) {
        auth = init.headers.get('authorization') || init.headers.get('Authorization');
      } else if (typeof init.headers === 'object') {
        auth = init.headers['authorization'] || init.headers['Authorization'];
      }
      if (auth) sendToken(auth);
    }
    return origFetch.apply(this, arguments);
  };

  // 3. Polling localStorage pour sécurité
  setInterval(function() {
    try {
      var t = window.localStorage.getItem('token');
      if (t) sendToken(t);
    } catch(e) {}
  }, 1000);
})();
true;
`;

export function DiscordLoginModal({ visible, onSuccess, onError, onClose }: Props) {
  const [loading, setLoading] = useState(true);

  if (!visible) return null;

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'TOKEN' && data.token) {
        onSuccess(data.token);
        onClose();
      }
    } catch (e) {
      // Message non JSON, ignorer
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Connexion Discord</Text>
            <Text style={styles.headerSub}>Autorisation complète requise pour les salons</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Loader */}
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#5865F2" />
          </View>
        )}

        {/* WebView Discord */}
        <WebView
          source={{ uri: 'https://discord.com/login' }}
          injectedJavaScriptBeforeContentLoaded={INJECTED_INTERCEPTOR}
          onMessage={handleMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          userAgent="Mozilla/5.0 (Linux; Android 14; 22101316G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
          domStorageEnabled={true}
          javaScriptEnabled={true}
          sharedCookiesEnabled={true}
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
    backgroundColor: '#FFF',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text.primary,
  },
  headerSub: {
    fontSize: 11,
    color: theme.text.muted,
  },
  closeBtn: {
    padding: 4,
  },
  loader: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    padding: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 10,
  },
  webview: {
    flex: 1,
  },
});
