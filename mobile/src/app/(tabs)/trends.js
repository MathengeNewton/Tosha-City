import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { kes, pct, titleCase } from '../../lib/format';
import { BarChart, Card, colors, Divider, ErrorBox, Loading, Row, Screen, SectionTitle, Segmented } from '../../components/ui';

const RANGES = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export default function TrendsScreen() {
  const [days, setDays] = useState(30);
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => api.trends(days), [days]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Segmented options={RANGES} value={days} onChange={setDays} />
      {loading ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {data && !loading && !error ? <Trends data={data} /> : null}
    </Screen>
  );
}

function Change({ label, item }) {
  const up = (item.changePct ?? 0) >= 0;
  return (
    <Card style={styles.changeCard}>
      <Text style={styles.changeLabel}>{label}</Text>
      <Text style={styles.changeValue}>{kes(item.current)}</Text>
      <Text style={[styles.changePct, { color: item.changePct == null ? colors.muted : up ? colors.green : colors.red }]}>
        {pct(item.changePct)} vs before
      </Text>
    </Card>
  );
}

function Trends({ data }) {
  const { comparison, daily, products, expensesByCategory, range } = data;
  const labelEvery = range.days <= 7 ? 1 : range.days <= 30 ? 5 : 15;
  const chartData = range.days > 30 ? weekly(daily) : daily;

  return (
    <>
      <View style={styles.changes}>
        <Change label="Sales" item={comparison.salesTotal} />
        <Change label="Received" item={comparison.collected} />
      </View>
      <View style={styles.changes}>
        <Change label="Expenses" item={comparison.expenses} />
        <Card style={styles.changeCard}>
          <Text style={styles.changeLabel}>Number of sales</Text>
          <Text style={styles.changeValue}>{comparison.salesCount.current}</Text>
          <Text style={[styles.changePct, { color: colors.muted }]}>{pct(comparison.salesCount.changePct)} vs before</Text>
        </Card>
      </View>

      <SectionTitle>{range.days > 30 ? 'Week by week' : 'Day by day'}</SectionTitle>
      <Card>
        <BarChart
          data={chartData}
          labelEvery={range.days > 30 ? 2 : labelEvery}
          series={[
            { key: 'salesTotal', color: colors.primary, label: 'Sales' },
            { key: 'collected', color: '#60A5FA', label: 'Received' },
            { key: 'expenses', color: '#F59E0B', label: 'Expenses' },
          ]}
        />
      </Card>

      <SectionTitle>Best sellers</SectionTitle>
      <Card>
        {products.best.length === 0 ? (
          <Text style={{ color: colors.muted }}>No sales in this period.</Text>
        ) : (
          products.best.map((p, i) => (
            <Row key={p.productId} label={`${i + 1}. ${p.product}`} sub={`${p.qty} ${p.unit}`} value={kes(p.amount)} />
          ))
        )}
      </Card>

      <SectionTitle>Slowest sellers</SectionTitle>
      <Card>
        {products.worst.length === 0 ? (
          <Text style={{ color: colors.muted }}>Nothing to show.</Text>
        ) : (
          products.worst.map((p) => (
            <Row
              key={p.productId}
              label={p.product}
              sub={p.qty > 0 ? `${p.qty} ${p.unit}` : 'No sales'}
              value={kes(p.amount)}
              valueColor={p.amount === 0 ? colors.red : undefined}
            />
          ))
        )}
      </Card>

      <SectionTitle>Expenses by category</SectionTitle>
      <Card>
        {expensesByCategory.length === 0 ? (
          <Text style={{ color: colors.muted }}>No expenses in this period.</Text>
        ) : (
          <>
            {expensesByCategory.map((c) => (
              <Row key={c.category} label={titleCase(c.category)} sub={`${c.count} entries`} value={kes(c.amount)} />
            ))}
            <Divider />
            <Row label="Total" value={kes(expensesByCategory.reduce((s, c) => s + c.amount, 0))} bold />
          </>
        )}
      </Card>
    </>
  );
}

/** Roll daily rows into 7-day buckets so 90 days stays readable. */
function weekly(daily) {
  const out = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    out.push({
      date: chunk[0].date,
      salesTotal: chunk.reduce((s, d) => s + d.salesTotal, 0),
      collected: chunk.reduce((s, d) => s + d.collected, 0),
      expenses: chunk.reduce((s, d) => s + d.expenses, 0),
    });
  }
  return out;
}

const styles = StyleSheet.create({
  changes: { flexDirection: 'row', gap: 8 },
  changeCard: { flex: 1, padding: 14 },
  changeLabel: { fontSize: 13, color: colors.muted },
  changeValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginVertical: 2 },
  changePct: { fontSize: 12, fontWeight: '600' },
});
