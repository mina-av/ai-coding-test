import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { LVPosition } from '@/contexts/lv-context'
import { calcGP, calcAngebotssumme } from '@/lib/kalkulation'
import { OhnePreisOption } from './export-modal'

function fmt(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, padding: 40, color: '#111' },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  headerMeta: { fontSize: 9, color: '#555', marginBottom: 2 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #d1d5db',
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rowAlt: { backgroundColor: '#f9fafb' },
  colNr: { width: '10%' },
  colDesc: { width: '40%' },
  colMenge: { width: '10%', textAlign: 'right' },
  colEinheit: { width: '8%', textAlign: 'center' },
  colEP: { width: '14%', textAlign: 'right' },
  colGP: { width: '14%', textAlign: 'right' },
  sumRow: {
    flexDirection: 'row',
    borderTop: '2px solid #111',
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  sumLabel: { width: '86%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  sumValue: { width: '14%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  mwstRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  mwstLabel: { width: '86%', textAlign: 'right', color: '#555' },
  mwstValue: { width: '14%', textAlign: 'right', color: '#555' },
  bruttoRow: {
    flexDirection: 'row',
    borderTop: '1px solid #111',
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  bruttoLabel: { width: '86%', textAlign: 'right', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  bruttoValue: { width: '14%', textAlign: 'right', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  pageNumber: { position: 'absolute', bottom: 24, right: 40, fontSize: 8, color: '#9ca3af' },
})

interface AngebotPDFProps {
  projektname: string
  kundenname: string
  datum: string
  positionen: LVPosition[]
  ohnePreis: OhnePreisOption
}

export function AngebotPDF({ projektname, kundenname, datum, positionen, ohnePreis }: AngebotPDFProps) {
  const filtered = positionen.filter((p) => {
    if (p.einheitspreis > 0) return true
    return ohnePreis === 'auf-anfrage'
  })

  const netto = calcAngebotssumme(positionen)
  const mwst = netto * 0.19
  const brutto = netto * 1.19

  return (
    <Document title={`Angebot ${projektname}`}>
      <Page size="A4" style={s.page}>
        {/* Kopfzeile */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Angebot</Text>
          <Text style={s.headerMeta}>Projekt: {projektname}</Text>
          <Text style={s.headerMeta}>Kunde: {kundenname}</Text>
          <Text style={s.headerMeta}>Datum: {fmtDate(datum)}</Text>
        </View>

        {/* Tabellenkopf */}
        <View style={s.tableHeader}>
          <Text style={s.colNr}>Pos.-Nr.</Text>
          <Text style={s.colDesc}>Beschreibung</Text>
          <Text style={s.colMenge}>Menge</Text>
          <Text style={s.colEinheit}>Einh.</Text>
          <Text style={s.colEP}>Netto (€)</Text>
          <Text style={s.colGP}>Brutto (€)</Text>
        </View>

        {/* Zeilen */}
        {filtered.map((pos, idx) => {
          const gp = calcGP(pos.menge, pos.einheitspreis)
          const gpText = pos.einheitspreis === 0
            ? 'Preis auf Anfrage'
            : gp === null ? '—' : fmt(gp)
          const epText = pos.einheitspreis === 0 ? 'Preis auf Anfrage' : fmt(pos.einheitspreis)

          return (
            <View key={pos.id} style={[s.row, idx % 2 === 1 ? s.rowAlt : {}]}>
              <Text style={s.colNr}>{pos.positionsnummer || '—'}</Text>
              <Text style={s.colDesc}>{pos.kurzbeschreibung}</Text>
              <Text style={s.colMenge}>{pos.menge || '—'}</Text>
              <Text style={s.colEinheit}>{pos.einheit || '—'}</Text>
              <Text style={s.colEP}>{epText}</Text>
              <Text style={s.colGP}>{gpText}</Text>
            </View>
          )
        })}

        {/* Summen */}
        <View style={s.sumRow}>
          <Text style={s.sumLabel}>Angebotssumme Netto</Text>
          <Text style={s.sumValue}>{fmt(netto)}</Text>
        </View>
        <View style={s.mwstRow}>
          <Text style={s.mwstLabel}>enthaltene MwSt. (19 %)</Text>
          <Text style={s.mwstValue}>{fmt(mwst)}</Text>
        </View>
        <View style={s.bruttoRow}>
          <Text style={s.bruttoLabel}>Brutto</Text>
          <Text style={s.bruttoValue}>{fmt(brutto)}</Text>
        </View>

        {/* Seitenzahl */}
        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
