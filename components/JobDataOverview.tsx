import { StyleSheet, Text, View } from 'react-native';
import { INSPECTION_TEMPLATE, InspectionStatus } from '../lib/inspection';
import { colors, radius } from '../lib/theme';
import { Job } from '../lib/types';

const STATUS_TEXT: Record<InspectionStatus | 'none', { label: string; color: string }> = {
  ok: { label: 'OK', color: colors.accent },
  issue: { label: 'Anmärkning', color: colors.danger },
  skip: { label: 'Hoppad', color: colors.textSecondary },
  none: { label: 'Ej kontrollerad', color: colors.textFaint },
};

/** Read-only dump of every field stored on a job, so staff can see what exists. */
export function JobDataOverview({ job }: { job: Job }) {
  const bike = job.bike?.bike;
  const customer = job.customer;

  return (
    <View style={styles.wrap}>
      <Block title="Jobb">
        <Row label="Cykelnummer" value={job.bikeNumber || '–'} />
        <Row label="Status" value={job.status} />
        <Row label="Bild" value={job.imagePath ?? '–'} />
        <Row label="Kundlänk" value={job.shareToken} />
        <Row label="Kunden svarade" value={job.customerRespondedAt ?? '–'} />
      </Block>

      <Block title="Kund">
        <Row label="Förnamn" value={customer?.firstName || '–'} />
        <Row label="Efternamn" value={customer?.lastName || '–'} />
        <Row label="Telefon" value={customer?.phone || '–'} />
        <Row label="E-post" value={customer?.email || '–'} />
      </Block>

      <Block title="Cykel (från foto)">
        {bike ? (
          <>
            <Row label="Märke" value={bike.brand || '–'} />
            <Row label="Typ" value={bike.bike_type} />
            <Row label="Färg" value={bike.color} />
            <Row label="Växlar fram / bak" value={`${bike.gears.front} / ${bike.gears.back}`} />
            <Row label="Bromsar fram / bak" value={`${bike.brakes.front} / ${bike.brakes.back}`} />
            <Row
              label="Dämpare fram / bak"
              value={`${bike.dampers.front ? 'ja' : 'nej'} / ${bike.dampers.back ? 'ja' : 'nej'}`}
            />
            <Row label="Elcykel" value={bike.electric ? 'ja' : 'nej'} />
          </>
        ) : (
          <Text style={styles.empty}>Ingen cykeldata</Text>
        )}
      </Block>

      <Block title="Besiktning">
        {INSPECTION_TEMPLATE.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => {
              const result = job.inspection?.[item.id];
              const status = STATUS_TEXT[result?.status ?? 'none'];
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemId}>{item.id}</Text>
                    {result?.note ? <Text style={styles.note}>{result.note}</Text> : null}
                  </View>
                  <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </Block>

      <Block title="Åtgärder (alla fält)">
        {job.tasks.length === 0 ? (
          <Text style={styles.empty}>Inga åtgärder</Text>
        ) : (
          job.tasks.map((task) => (
            <View key={task.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{task.title}</Text>
              <Row label="Kategori" value={task.category} />
              <Row label="Pris (arbete)" value={`${task.price} kr`} />
              <Row label="Allvarlighet" value={task.severity ?? '–'} />
              <Row label="Kundens beslut" value={task.approval ?? 'ej beslutat'} />
              <Row label="Besiktningspunkter" value={task.inspectionItemIds?.join(', ') || '–'} />
              {task.products.map((product) => (
                <Row
                  key={product.id}
                  label={`Produkt${product.label ? ` (${product.label})` : ''}`}
                  value={`${product.name} · ${product.price} kr · art ${product.articleNumber ?? '–'} · saldo ${product.stock ?? '–'}`}
                />
              ))}
            </View>
          ))
        )}
      </Block>

      <Block title="Transkript">
        <Text style={styles.note}>{job.transcript.trim() || '–'}</Text>
      </Block>
    </View>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  block: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  blockTitle: { color: colors.accent, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  section: { gap: 6, paddingTop: 4 },
  sectionTitle: { color: colors.text, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  rowLabel: { color: colors.textSecondary, width: 130 },
  rowValue: { color: colors.text, flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingLeft: 6 },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { color: colors.text },
  itemId: { color: colors.textFaint, fontSize: 11 },
  note: { color: colors.textSecondary, fontSize: 13 },
  status: { fontWeight: '600', fontSize: 13 },
  empty: { color: colors.textFaint },
});
