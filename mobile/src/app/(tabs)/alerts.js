import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { addDaysYmd, kes, prettyDateTime, todayYmd } from '../../lib/format';
import { Badge, Card, colors, Empty, ErrorBox, Loading, Screen, Segmented } from '../../components/ui';

const RANGES = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
];

const SEVERITY_COLOR = { HIGH: colors.high, MEDIUM: colors.medium, LOW: colors.low };

const TYPE_LABEL = {
  SALE_DELETED: 'Sale deleted',
  SALE_UPDATED: 'Sale changed',
  STOCK_ENTRY_DELETED: 'Stock entry deleted',
  STOCK_ENTRY_UPDATED: 'Stock entry edited',
  EXPENSE_DELETED: 'Expense deleted',
  EXPENSE_UPDATED: 'Expense edited',
  PRICE_BELOW_EXPECTED: 'Low price',
  STOCK_SHORT: 'Stock short',
  HIGH_WASTAGE: 'High wastage',
};

export default function AlertsScreen() {
  const [days, setDays] = useState(7);
  const [open, setOpen] = useState(null);
  const to = todayYmd();
  const from = addDaysYmd(to, -(days - 1));
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => api.alerts(from, to), [from, to]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Segmented options={RANGES} value={days} onChange={setDays} />

      {loading ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {data && !loading && !error ? (
        <>
          <View style={styles.counts}>
            {['HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <Card key={s} style={styles.countCard}>
                <Text style={[styles.countValue, { color: SEVERITY_COLOR[s] }]}>{data.counts[s]}</Text>
                <Text style={styles.countLabel}>{s.toLowerCase()}</Text>
              </Card>
            ))}
          </View>

          {data.alerts.length === 0 ? <Empty>No warnings in this period.</Empty> : null}

          {data.alerts.map((a) => {
            const expanded = open === a.id;
            return (
              <Pressable key={a.id} onPress={() => setOpen(expanded ? null : a.id)}>
                <Card style={[styles.alert, { borderLeftColor: SEVERITY_COLOR[a.severity] }]}>
                  <View style={styles.alertHead}>
                    <Badge label={TYPE_LABEL[a.type] ?? a.type} color={SEVERITY_COLOR[a.severity]} />
                    <Text style={styles.when}>{prettyDateTime(a.date)}</Text>
                  </View>
                  <Text style={styles.title}>{a.title}</Text>
                  {a.user ? <Text style={styles.meta}>By {a.user}</Text> : null}
                  {expanded && a.detail ? <Text style={styles.detail}>{a.detail}</Text> : null}
                  {!expanded && a.detail ? <Text style={styles.more}>Tap for details</Text> : null}
                  {expanded && a.amount != null ? <Text style={styles.meta}>Amount: {kes(a.amount)}</Text> : null}
                </Card>
              </Pressable>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  counts: { flexDirection: 'row', gap: 8 },
  countCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  countValue: { fontSize: 24, fontWeight: '800' },
  countLabel: { fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  alert: { borderLeftWidth: 4 },
  alertHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  when: { fontSize: 12, color: colors.muted },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  detail: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 20 },
  more: { fontSize: 12, color: colors.primary, marginTop: 6 },
});
