import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Alamat API dideteksi otomatis agar langsung jalan di web & HP (satu jaringan WiFi).
export function getApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:4000/api`;
  }
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '';
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  return `http://${host}:4000/api`;
}
