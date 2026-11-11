import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'warung_token';

// Penyimpanan JSON umum (sesi, keranjang, database mock).
export const kv = {
  async get(key) {
    try {
      const v = await AsyncStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

// Token JWT: SecureStore di HP, localStorage di web.
export const tokenStorage = {
  async get() {
    try {
      if (Platform.OS === 'web') return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(token) {
    try {
      if (Platform.OS === 'web') localStorage.setItem(TOKEN_KEY, token);
      else await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {}
  },
  async clear() {
    try {
      if (Platform.OS === 'web') localStorage.removeItem(TOKEN_KEY);
      else await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {}
  },
};
