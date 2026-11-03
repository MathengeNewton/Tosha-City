import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export const colors = {
  primary: '#0D47A1',
  bg: '#F3F5F9',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  green: '#15803D',
  red: '#B91C1C',
  amber: '#B45309',
  high: '#B91C1C',
  medium: '#B45309',
  low: '#4B5563',
};

export function Screen({ children, refreshing, onRefresh }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Row({ label, value, valueColor, bold, sub }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.rowValue, bold && styles.bold, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Badge({ label, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A`, borderColor: `${color}55` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <Card style={{ borderColor: '#FCA5A5' }}>
      <Text style={{ color: colors.red, marginBottom: onRetry ? 12 : 0 }}>{message}</Text>
      {onRetry ? <Button title="Try again" onPress={onRetry} variant="outline" /> : null}
    </Card>
  );
}

export function Empty({ children }) {
  return (
    <Card>
      <Text style={{ color: colors.muted, textAlign: 'center' }}>{children}</Text>
    </Card>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled }) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        outline ? styles.buttonOutline : styles.buttonPrimary,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.buttonText, outline && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.segment, value === o.value && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Simple vertical bar chart built from Views; `series` is [{ key, color, label }]. */
export function BarChart({ data, series, height = 140, labelEvery = 5 }) {
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  return (
    <View>
      <View style={[styles.chart, { height }]}>
        {data.map((d, i) => (
          <View key={d.date ?? i} style={styles.chartGroup}>
            {series.map((s) => (
              <View
                key={s.key}
                style={{
                  flex: 1,
                  height: Math.max(1, ((Number(d[s.key]) || 0) / max) * height),
                  backgroundColor: s.color,
                  marginHorizontal: 0.5,
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.chartAxis}>
        {data.map((d, i) => (
          <Text key={d.date ?? i} style={styles.chartLabel} numberOfLines={1}>
            {i % labelEvery === 0 || i === data.length - 1 ? d.date?.slice(8) : ''}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 16, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 12 },
  rowLabel: { fontSize: 15, color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rowValue: { fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', minHeight: 48 },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonOutline: { borderWidth: 1, borderColor: colors.primary, backgroundColor: '#fff' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  segmented: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { color: colors.muted, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  chart: { flexDirection: 'row', alignItems: 'flex-end' },
  chartGroup: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 1 },
  chartAxis: { flexDirection: 'row', marginTop: 4 },
  chartLabel: { flex: 1, fontSize: 9, color: colors.muted, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 12, color: colors.muted },
});
