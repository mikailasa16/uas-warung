import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { colors, STORE_NAME } from '../src/theme';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { Button, Card, Input, Loading } from '../src/components/ui';
import { Text } from '../src/components/Typography';

export default function LoginScreen() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!ready) return <Loading />;
  if (user) return <Redirect href="/" />;

  const submit = async () => {
    const e = {};
    if (!username.trim()) e.username = 'Nama pengguna harus diisi.';
    if (!password) e.password = 'Kata sandi harus diisi.';
    setErrors(e);
    setError('');
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const r = await login(username, password);
      if (r.mode === 'mock') toast.show('Server tidak tersedia. Aplikasi berjalan dalam mode demo offline.', 'info');
      router.replace('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 420 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 1 }}>WR</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 12 }}>{STORE_NAME}</Text>
            <Text style={{ color: colors.muted }}>Kasir dan pengelolaan stok</Text>
          </View>

          <Card style={{ padding: 20 }}>
            <Input label="Nama pengguna" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} error={errors.username} />
            <Input label="Kata sandi" value={password} onChangeText={setPassword} secureTextEntry error={errors.password} onSubmitEditing={submit} />
            {error ? <Text style={{ color: colors.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
            <Button title="Masuk" onPress={submit} loading={loading} />

            <Text style={{ color: colors.muted, marginTop: 18, marginBottom: 8, fontWeight: '600' }}>Akun demo</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button small variant="outline" title="Admin" style={{ flex: 1 }} onPress={() => { setUsername('admin'); setPassword('password123'); }} />
              <Button small variant="outline" title="Kasir" style={{ flex: 1 }} onPress={() => { setUsername('kasir'); setPassword('password123'); }} />
            </View>
            <Text style={{ color: colors.muted, marginTop: 8, fontSize: 12 }}>Kata sandi untuk kedua akun: password123</Text>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
