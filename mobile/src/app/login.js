import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { Button, colors, Loading } from '../components/ui';

export default function LoginScreen() {
  const { user, ready, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!ready) return <Loading />;
  if (user) return <Redirect href="/" />;

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (e) {
      setError(e?.status === 401 ? 'Wrong username or password.' : e?.message ?? 'Could not log in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.brand}>ToshaCity</Text>
          <Text style={styles.subtitle}>Owner app</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Username or email</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            returnKeyType="next"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={busy ? 'Logging in…' : 'Log in'} onPress={submit} disabled={busy} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  wrap: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  brand: { color: '#fff', fontSize: 32, fontWeight: '800' },
  subtitle: { color: '#BFDBFE', fontSize: 16, marginTop: 4 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 8 },
  label: { fontSize: 14, color: colors.muted, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  error: { color: colors.red, marginVertical: 4 },
});
