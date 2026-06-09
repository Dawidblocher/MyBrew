import type { ReactNode } from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { INTER_FAMILY } from "@/lib/pdf-fonts";
import { ADJUNCT_STAGE_LABELS, HOP_STAGE_LABELS } from "@/lib/recipe-labels";
import { formatMetricValue } from "@/lib/recipe-metrics";
import type { RecipeRecord } from "@/types";

const styles = StyleSheet.create({
  page: {
    fontFamily: INTER_FAMILY,
    fontSize: 10,
    padding: 40,
    color: "#1a1a2e",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#4a5568",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
  },
  metricLabel: {
    fontSize: 8,
    color: "#718096",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    color: "#2d3748",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "40%",
    color: "#718096",
    fontSize: 9,
  },
  value: {
    width: "60%",
    fontSize: 10,
  },
  entry: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  entryTitle: {
    fontWeight: 700,
    marginBottom: 4,
  },
  empty: {
    fontSize: 10,
    color: "#a0aec0",
  },
});

const METRICS = [
  { key: "blg" as const, label: "BLG", unit: "°BLG", fractionDigits: 1 },
  { key: "srm" as const, label: "Barwa", unit: "SRM", fractionDigits: 1 },
  { key: "ibu" as const, label: "IBU", unit: "IBU", fractionDigits: 0 },
  { key: "abv" as const, label: "ABV", unit: "%", fractionDigits: 1 },
];

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function RecipePdf({ record }: { record: RecipeRecord }) {
  const { data } = record;

  return (
    <Document>
      <Page size="A4" wrap style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{record.name}</Text>
          <Text style={styles.subtitle}>{record.style}</Text>
        </View>

        <View style={styles.metricsRow}>
          {METRICS.map(({ key, label, unit, fractionDigits }) => (
            <View key={key} style={styles.metricBox}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>
                {formatMetricValue(record[key], fractionDigits)} {unit}
              </Text>
            </View>
          ))}
        </View>

        <Section title="Podstawy">
          <FieldRow label="Nazwa" value={data.basics.name} />
          <FieldRow label="Styl" value={data.basics.style} />
        </Section>

        <Section title="Parametry warki">
          <FieldRow label="Objętość" value={`${data.batch.volumeL} L`} />
        </Section>

        <Section title="Zasyp">
          {data.malts.length === 0 ? (
            <Text style={styles.empty}>brak</Text>
          ) : (
            data.malts.map((malt, index) => (
              <View key={index} style={styles.entry}>
                <Text style={styles.entryTitle}>{malt.name}</Text>
                <FieldRow label="Ilość" value={`${malt.amountKg} kg`} />
                <FieldRow label="Barwa" value={`${malt.colorEbc} EBC`} />
                <FieldRow label="Ekstrakt" value={`${malt.extractPercent}%`} />
              </View>
            ))
          )}
        </Section>

        <Section title="Zacieranie">
          <FieldRow label="Wydajność" value={`${data.mash.efficiencyPct}%`} />
          <FieldRow label="Stosunek wody do zboża" value={`${data.mash.waterToGrainRatio} L/kg`} />
          <Text style={{ fontSize: 9, fontWeight: 700, marginTop: 6, marginBottom: 4, color: "#4a5568" }}>Rasty</Text>
          {data.mash.rests.length === 0 ? (
            <Text style={styles.empty}>brak</Text>
          ) : (
            data.mash.rests.map((rest, index) => (
              <Text key={index} style={{ fontSize: 10, marginBottom: 2 }}>
                {rest.tempC}°C · {rest.durationMin} min
              </Text>
            ))
          )}
        </Section>

        <Section title="Chmiel">
          {data.hops.length === 0 ? (
            <Text style={styles.empty}>brak</Text>
          ) : (
            data.hops.map((hop, index) => (
              <View key={index} style={styles.entry}>
                <Text style={styles.entryTitle}>{hop.name}</Text>
                <FieldRow label="Alfa" value={`${hop.alphaAcidPercent}%`} />
                <FieldRow label="Ilość" value={`${hop.amountG} g`} />
                <FieldRow label="Etap" value={HOP_STAGE_LABELS[hop.stage]} />
                <FieldRow label="Czas" value={`${hop.timeMin} min`} />
              </View>
            ))
          )}
        </Section>

        <Section title="Drożdże">
          <FieldRow label="Szczep" value={data.yeast.strain || "—"} />
          <FieldRow label="Typ" value={data.yeast.type || "—"} />
          <FieldRow label="Atenuacja" value={`${data.yeast.attenuationPct}%`} />
          <FieldRow label="Temp. fermentacji" value={`${data.yeast.fermTempMinC}–${data.yeast.fermTempMaxC}°C`} />
        </Section>

        <Section title="Dodatki">
          {data.adjuncts.length === 0 ? (
            <Text style={styles.empty}>brak</Text>
          ) : (
            data.adjuncts.map((adjunct, index) => (
              <View key={index} style={styles.entry}>
                <Text style={styles.entryTitle}>{adjunct.name || "—"}</Text>
                <FieldRow label="Etap" value={ADJUNCT_STAGE_LABELS[adjunct.stage]} />
                <FieldRow label="Czas" value={`${adjunct.timeMin} min`} />
                {adjunct.notes ? <FieldRow label="Notatki" value={adjunct.notes} /> : null}
              </View>
            ))
          )}
        </Section>
      </Page>
    </Document>
  );
}
