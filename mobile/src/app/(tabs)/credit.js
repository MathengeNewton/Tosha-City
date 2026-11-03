import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { kes, prettyDateTime } from '../../lib/format';
import { Card, colors, Empty, ErrorBox, Loading, Screen } from '../../components/ui';

export default function CreditScreen() {
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => api.credit(), []);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {loading && !data ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <Card style={styles.total}>
            <Text style={styles.totalLabel}>Total owed to you</Text>
            <Text style={styles.totalValue}>{kes(data.totalOwed)}</Text>
            <Text style={styles.totalSub}>
              {data.customers.length} {data.customers.length === 1 ? 'customer' : 'customers'}
            </Text>
          </Card>

          {data.customers.length === 0 ? <Empty>Nobody owes you money right now.</Empty> : null}

          {data.customers.map((c) => (
            <Card key={c.customerId ?? 'walk-in'}>
              <View style={styles.head}>
                <Text style={styles.name}>{c.customer}</Text>
                <Text style={styles.owed}>{kes(c.owed)}</Text>
              </View>
              <Text style={styles.meta}>
                {c.sales} unpaid {c.sales === 1 ? 'sale' : 'sales'} · oldest {prettyDateTime(c.oldestUnpaid)}
              </Text>
              {c.phone ? (
                <Pressable style={styles.call} onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                  <Ionicons name="call-outline" size={16} color={colors.primary} />
                  <Text style={styles.callText}>{c.phone}</Text>
                </Pressable>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { backgroundColor: colors.primary, borderColor: colors.primary },
  totalLabel: { color: '#BFDBFE', fontSize: 14 },
  totalValue: { color: '#fff', fontSize: 30, fontWeight: '800', marginVertical: 4 },
  totalSub: { color: '#DBEAFE', fontSize: 13 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  owed: { fontSize: 16, fontWeight: '800', color: colors.amber },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  call: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', paddingVertical: 4 },
  callText: { color: colors.primary, fontWeight: '600' },
});
