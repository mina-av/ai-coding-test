import { NextRequest, NextResponse } from 'next/server'

// Stub-Implementierung: gibt Mock-Daten zurück
// Die echte Claude-API-Integration wird durch /backend hinzugefügt
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Keine Datei hochgeladen.' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Nur PDF-Dateien werden akzeptiert.' }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Die Datei ist zu groß. Maximale Dateigröße: 20 MB.' },
      { status: 400 }
    )
  }

  // Simulierte Verarbeitungszeit
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Mock-Positionen für Entwicklung und UI-Tests
  return NextResponse.json({
    positionen: [
      {
        id: '1',
        positionsnummer: '01.001',
        kurzbeschreibung: 'Erdaushub',
        langbeschreibung: 'Erdaushub in gewachsenem Boden, Bodenklasse 3–4',
        menge: '150',
        einheit: 'm³',
        einheitspreis: 0,
      },
      {
        id: '2',
        positionsnummer: '01.002',
        kurzbeschreibung: 'Bodenentsorgung',
        langbeschreibung: 'Transport und Entsorgung des Aushubmaterials',
        menge: '150',
        einheit: 'm³',
        einheitspreis: 0,
      },
      {
        id: '3',
        positionsnummer: '02.001',
        kurzbeschreibung: 'Betonarbeiten Fundament',
        langbeschreibung: 'Beton C25/30, Fundamentplatte inkl. Schalung',
        menge: '45',
        einheit: 'm³',
        einheitspreis: 0,
      },
      {
        id: '4',
        positionsnummer: '02.002',
        kurzbeschreibung: 'Bewehrung',
        langbeschreibung: 'Betonstahl BSt 500 S, verlegen und binden',
        menge: '3200',
        einheit: 'kg',
        einheitspreis: 0,
      },
      {
        id: '5',
        positionsnummer: '03.001',
        kurzbeschreibung: 'Mauerwerk',
        langbeschreibung: 'Kalksandstein 17,5 cm, Außenwand',
        menge: '210',
        einheit: 'm²',
        einheitspreis: 0,
      },
    ],
  })
}
