import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { addDaysYmd, kes, prettyDay, titleCase, todayYmd } from '../../lib/format';
import { Badge, Card, colors, Divider, ErrorBox, Loading, Row, Screen, SectionTitle } from '../../components/ui';

const STOCK_COLORS = { SHORT: colors.red, EXCESS: colors.amber, BALANCED: colors.green, PENDING: colors.muted };

export default function TodayScreen() {
  const params = useLocalSearchParams();
  const paramDate = typeof params.date === 'string' ? params.date : null;
  const [date, setDate] = useState(paramDate ?? todayYmd());
  const [seenParam, setSeenParam] = useState(paramDate);
  if (paramDate !== seenParam) {
    setSeenParam(paramDate);
    if (paramDate) setDate(paramDate);
  }

  const { data, error, loading, refreshing, refresh, reload } = useApi(() => api.dailySummary(date), [date]);
  const isToday = date >= todayYmd();

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.dateBar}>
        <Pressable hitSlop={12} onPress={() => setDate(addDaysYmd(date, -1))} style={styles.dateBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setDate(todayYmd())}>
          <Text style={styles.dateText}>{prettyDay(date)}</Text>
          <Text style={styles.dateSub}>{date}</Text>
        </Pressable>
        <Pressable
          hitSlop={12}
          disabled={isToday}
          onPress={() => setDate(addDaysYmd(date, 1))}
          style={[styles.dateBtn, isToday && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {data && !loading && !error ? <Summary data={data} /> : null}
    </Screen>
  );
}

function Summary({ data }) {
  const { sales, collected, expenses, drawer, stockCheck, sessionStatus } = data;
  return (
    <>
      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>Cash that should be in the drawer</Text>
        <Text style={[styles.heroValue, drawer.expectedCash < 0 && { color: '#FCA5A5' }]}>{kes(drawer.expectedCash)}</Text>
        <Text style={styles.heroSub}>
          Cash received {kes(collected.cash)} − cash expenses {kes(expenses.cash)}
        </Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroSmall}>M-Pesa after expenses</Text>
          <Text style={styles.heroSmallValue}>{kes(drawer.netMpesa)}</Text>
        </View>
        <Text style={styles.session}>
          {sessionStatus === 'OPEN' ? 'Session still open' : sessionStatus === 'CLOSED' ? 'Session closed' : 'No session this day'}
        </Text>
      </Card>

      <SectionTitle>Sales ({sales.count})</SectionTitle>
      <Card>
        <Row label="Total sold" value={kes(sales.total)} bold />
        <Divider />
        <Row label="Paid in cash" value={kes(sales.cash)} />
        <Row label="Paid by M-Pesa" value={kes(sales.mpesa)} />
        <Row label="On credit (not yet paid)" value={kes(sales.credit)} valueColor={sales.credit > 0 ? colors.amber : undefined} />
      </Card>

      <SectionTitle>Money received</SectionTitle>
      <Card>
        <Row label="Cash" value={kes(collected.cash)} />
        <Row label="M-Pesa" value={kes(collected.mpesa)} />
        <Divider />
        <Row label="Total received" value={kes(collected.total)} bold />
        {collected.fromOldCredit > 0 ? (
          <Row label="Includes old credit paid back" value={kes(collected.fromOldCredit)} valueColor={colors.green} />
        ) : null}
      </Card>

      <SectionTitle>Expenses</SectionTitle>
      <Card>
        {expenses.byCategory.length === 0 ? (
          <Text style={{ color: colors.muted }}>No expenses recorded.</Text>
        ) : (
          expenses.byCategory.map((c) => (
            <Row key={c.category} label={titleCase(c.category)} sub={`${c.count} ${c.count === 1 ? 'entry' : 'entries'}`} value={kes(c.amount)} />
          ))
        )}
        <Divider />
        <Row label="Paid from cash" value={kes(expenses.cash)} />
        <Row label="Paid by M-Pesa" value={kes(expenses.mpesa)} />
        <Row label="Total expenses" value={kes(expenses.total)} bold />
      </Card>

      <SectionTitle>Stock check</SectionTitle>
      <Card>
        {!stockCheck ? (
          <Text style={{ color: colors.muted }}>No stock session this day.</Text>
        ) : stockCheck.status === 'PENDING' ? (
          <Text style={{ color: colors.muted }}>Waiting for closing stock to be counted.</Text>
        ) : (
          <>
            <View style={styles.stockHead}>
              <Badge label={stockCheck.status} color={STOCK_COLORS[stockCheck.status]} />
              <Text style={[styles.stockDiff, { color: STOCK_COLORS[stockCheck.status] }]}>
                {stockCheck.status === 'BALANCED' ? 'All meat accounted for' : kes(Math.abs(stockCheck.difference))}
              </Text>
            </View>
            {stockCheck.shortProducts.map((p) => (
              <Row key={p.product} label={p.product} value={`${kes(Math.abs(p.difference))} short`} valueColor={colors.red} />
            ))}
          </>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBtn: { padding: 8 },
  dateText: { fontSize: 17, fontWeight: '700', textAlign: 'center', color: colors.text },
  dateSub: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  hero: { backgroundColor: colors.primary, borderColor: colors.primary },
  heroLabel: { color: '#BFDBFE', fontSize: 14 },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 4, fontVariant: ['tabular-nums'] },
  heroSub: { color: '#DBEAFE', fontSize: 12 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  heroSmall: { color: '#DBEAFE', fontSize: 14 },
  heroSmallValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  session: { color: '#93C5FD', fontSize: 12, marginTop: 10 },
  stockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  stockDiff: { fontSize: 18, fontWeight: '700' },
});
