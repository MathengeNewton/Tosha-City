import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../../lib/auth';
import { api, API_URL } from '../../lib/api';
import { disablePush, enablePush, isPushEnabled } from '../../lib/push';
import { Button, Card, colors, Row, Screen, SectionTitle } from '../../components/ui';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    isPushEnabled().then(setPushOn);
  }, []);

  const togglePush = async (next) => {
    setBusy(true);
    setMessage(null);
    try {
      if (next) {
        const result = await enablePush();
        setPushOn(result.ok);
        setMessage(result.message);
      } else {
        await disablePush();
        setPushOn(false);
        setMessage('Notifications are off.');
      }
    } catch (e) {
      setMessage(e?.message ?? 'Could not change notifications.');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    try {
      const { sent } = await api.testPush();
      setMessage(sent ? 'Test notification sent.' : 'Turn notifications on first.');
    } catch (e) {
      setMessage(e?.message ?? 'Could not send a test notification.');
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will stop getting notifications on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  return (
    <Screen>
      <SectionTitle>Account</SectionTitle>
      <Card>
        <Row label="Logged in as" value={user?.username ?? ''} />
        {user?.email ? <Row label="Email" value={user.email} /> : null}
      </Card>

      <SectionTitle>Notifications</SectionTitle>
      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Evening summary and serious warnings</Text>
            <Text style={styles.switchSub}>Sent when the day is closed (or at 9 pm) and when a sale is deleted or sold far below price.</Text>
          </View>
          <Switch value={pushOn} onValueChange={togglePush} disabled={busy} trackColor={{ true: colors.primary }} />
        </View>
        {pushOn ? <Button title="Send a test notification" variant="outline" onPress={sendTest} /> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        <Row label="App version" value={Constants.expoConfig?.version ?? ''} />
        <Row label="Server" value={API_URL.replace(/^https?:\/\//, '')} />
      </Card>

      <Button title="Log out" variant="outline" onPress={confirmLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  switchLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  switchSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  message: { marginTop: 10, color: colors.muted, fontSize: 13 },
});
