import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
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
  logo: { width: 120, height: 60, objectFit: 'contain', marginBottom: 6 },
  companyAddress: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 16, lineHeight: 1.5 },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
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
  colNr: { width: '8%' },
  colDesc: { width: '34%' },
  colMenge: { width: '8%', textAlign: 'right' },
  colEinheit: { width: '7%', textAlign: 'center' },
  colEP: { width: '13%', textAlign: 'right' },
  colGP: { width: '13%', textAlign: 'right' },
  colBrutto: { width: '13%', textAlign: 'right' },
  sumRow: {
    flexDirection: 'row',
    borderTop: '2px solid #111',
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  sumLabel: { width: '87%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  sumValue: { width: '13%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  mwstRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  mwstLabel: { width: '87%', textAlign: 'right', color: '#555' },
  mwstValue: { width: '13%', textAlign: 'right', color: '#555' },
  bruttoRow: {
    flexDirection: 'row',
    borderTop: '1px solid #111',
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  bruttoLabel: { width: '87%', textAlign: 'right', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  bruttoValue: { width: '13%', textAlign: 'right', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  pageNumber: { position: 'absolute', bottom: 24, right: 40, fontSize: 8, color: '#9ca3af' },
})

interface AngebotPDFProps {
  projektname: string
  kundenname: string
  kundenadresse: string
  objektnummer: string
  angebotsnummer: string
  datum: string
  positionen: LVPosition[]
  ohnePreis: OhnePreisOption
}

export function AngebotPDF({ projektname, kundenname, kundenadresse, objektnummer, angebotsnummer, datum, positionen, ohnePreis }: AngebotPDFProps) {
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
          <Image style={s.logo} src="/logo.JPG" />
          <Text style={s.companyAddress}>Berliner Str. 37{'\n'}10715 Berlin</Text>
          <Text style={s.headerTitle}>Angebot</Text>
          <Text style={s.headerMeta}>Angebotsnr.: {angebotsnummer}</Text>
          {objektnummer ? <Text style={s.headerMeta}>Objektnr.: {objektnummer}</Text> : null}
          <Text style={s.headerMeta}>Projekt: {projektname}</Text>
          <Text style={s.headerMeta}>Kunde: {kundenname}</Text>
          {kundenadresse ? <Text style={s.headerMeta}>{kundenadresse}</Text> : null}
          <Text style={s.headerMeta}>Datum: {fmtDate(datum)}</Text>
        </View>

        {/* Tabellenkopf */}
        <View style={s.tableHeader}>
          <Text style={s.colNr}>Pos.-Nr.</Text>
          <Text style={s.colDesc}>Beschreibung</Text>
          <Text style={s.colMenge}>Menge</Text>
          <Text style={s.colEinheit}>Einh.</Text>
          <Text style={s.colEP}>EP Netto</Text>
          <Text style={s.colGP}>GP Netto</Text>
          <Text style={s.colBrutto}>GP Brutto</Text>
        </View>

        {/* Zeilen */}
        {filtered.map((pos, idx) => {
          const gp = calcGP(pos.menge, pos.einheitspreis)
          const noPrice = pos.einheitspreis === 0
          const epText = noPrice ? 'Auf Anfrage' : fmt(pos.einheitspreis)
          const gpNettoText = noPrice ? 'Auf Anfrage' : gp === null ? '—' : fmt(gp)
          const gpBruttoText = noPrice ? 'Auf Anfrage' : gp === null ? '—' : fmt(gp * 1.19)

          return (
            <View key={pos.id} style={[s.row, idx % 2 === 1 ? s.rowAlt : {}]}>
              <Text style={s.colNr}>{pos.positionsnummer || '—'}</Text>
              <Text style={s.colDesc}>{pos.kurzbeschreibung}</Text>
              <Text style={s.colMenge}>{pos.menge || '—'}</Text>
              <Text style={s.colEinheit}>{pos.einheit || '—'}</Text>
              <Text style={s.colEP}>{epText}</Text>
              <Text style={s.colGP}>{gpNettoText}</Text>
              <Text style={s.colBrutto}>{gpBruttoText}</Text>
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
