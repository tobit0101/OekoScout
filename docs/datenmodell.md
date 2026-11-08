# Backend-Daten Schwammstadt-Score Pforzheim

Sponge Score (Ist-Zustand) je Quadratmeter für sechs Tagesregenmengen (30, 40, 50, 60, 70, 80 mm), vorberechnet für das Rechengebiet: 8 zusammenhängende Flächen in Pforzheim, 4,59 km², für die alle Eingangsdaten vollständig vorliegen.

Klassifizierung, Aussagekraft, Annahmen, Bodengruppe und Neigung hängen nicht von der Regenmenge ab; nur Score und Abfluss liegen je Regenmenge vor.

## Dateien

| Datei | Inhalt | Größe |
|---|---|---|
| `zellen.parquet` | Zelltabelle, typisiert, zstd-komprimiert (empfohlen) | 71 MB |
| `zellen.csv.gz` | dieselbe Tabelle als CSV, UTF-8, Trennzeichen `,`, Dezimalpunkt | 80 MB |
| `regionen.geojson` | Umrisse der 8 Regionen, EPSG:25832, Attribute `id`, `flaeche_m2`, `bbox_epsg25832` | 0,1 MB |
| `kennzahlen.json` | Zeilenzahl, Zeilen mit Score, Zeilen je Region und je Aussagekraft | – |
| `export_backend.py` | erzeugt die Tabellen aus den Rechenblöcken | – |
| `bilder/` | vorgerenderte Referenzbilder, siehe unten | 10 MB |
| `render_bilder.py` | erzeugt `bilder/` neu | – |

## Referenzbilder (`bilder/`)

Zum Vergleich mit der eigenen Darstellung. Ausschnitt: Luftbildgebiet x 477000–481000, y 5414000–5418000 (EPSG:25832, Norden oben), 1 Pixel = 2 × 2 m (Mittel aus 4 Zellen), 2000 × 2000 px Karte plus Legende, Regionsgrenzen mit Nummer.

| Datei | Inhalt |
|---|---|
| `score_30mm.png` … `score_80mm.png` | Score je Regenmenge, Farbskala wie `datenmodell_zelle.md` (gleiche Skala für alle Regenmengen); dunkelgrau = im Gebiet ohne Score, hellgrau = außerhalb |
| `aussagekraft.png` | Aussagekraft (unabhängig von der Regenmenge), Farben wie `datenmodell_zelle.md` |
| `lage_im_stadtgebiet.png` | Lage der 8 Regionen (grün) im Stadtgebiet; orange = Luftbildgebiet ohne Bodenwerte |

Erwartete Mittelwerte zur Kontrolle einer eigenen Auswertung: siehe Tabelle „Score je Regenmenge“ und `kennzahlen.json`.

Neu erzeugen: `python3 10_backend/export_backend.py "<Projektordner>"` (benötigt numpy, pandas, pyarrow, pyproj). Quelle: `09_analyse/rechengebiet_v3/bloecke_niederschlag/*.npz`.

## Form der Daten

- Eine Zeile = eine Zelle von 1 × 1 m. 4.589.876 Zeilen, davon 3.661.338 mit Score.
- Raster: EPSG:25832 (ETRS89 / UTM 32N), Zellecken auf ganzzahligen Metern.
- Die Geometrie ist nicht gespeichert, sondern folgt aus `rechtswert`/`hochwert` (linke untere Ecke):
  Quadrat `(rechtswert, hochwert) – (rechtswert + 1, hochwert + 1)` in EPSG:25832.
- `breitengrad`/`laengengrad` sind der Mittelpunkt in WGS84 (EPSG:4326), z. B. für Punktabfragen und Karten-Marker.
- Primärschlüssel: `id`. Sortierung: `region`, `hochwert`, `rechtswert`.
- Es gibt nur Zellen innerhalb der Regionen; außerhalb existieren keine Zeilen.

## Spalten

| Spalte | Typ (Parquet) | Leer erlaubt | Werte | Einheit |
|---|---|---|---|---|
| `id` | string | nein | `"<rechtswert>_<hochwert>"` | – |
| `rechtswert` | int32 | nein | linke untere Ecke, EPSG:25832 | m |
| `hochwert` | int32 | nein | linke untere Ecke, EPSG:25832 | m |
| `region` | int8 | nein | 1–8, siehe `regionen.geojson` | – |
| `breitengrad` | float64 | nein | Mittelpunkt, 7 Nachkommastellen | Grad |
| `laengengrad` | float64 | nein | Mittelpunkt, 7 Nachkommastellen | Grad |
| `score_prozent_30mm` … `score_prozent_80mm` | float32 | ja | 6 Spalten (`_30mm`, `_40mm`, `_50mm`, `_60mm`, `_70mm`, `_80mm`), 1 Nachkommastelle, Bereich siehe unten | % |
| `abfluss_mm_30mm` … `abfluss_mm_80mm` | float32 | ja | 6 Spalten, 0 bis Regenmenge, 1 Nachkommastelle | mm |
| `aussagekraft` | category | nein | `BESTAETIGT`, `NUR_LUFTBILD`, `ANNAHME`, `WIDERSPRUCH` | – |
| `klasse` | category | nein | `DACH`, `VERSIEGELT`, `WIESE`, `BAUM`, `GRUENDACH`, `STILLGEWAESSER`, `FLIESSGEWAESSER` | – |
| `annahmen` | string | nein | Liste mit `;` getrennt, leer = keine; Werte siehe unten | – |
| `bodengruppe` | category | nein | `SEHR_DURCHLAESSIG`, `DURCHLAESSIG`, `WENIG_DURCHLAESSIG`, `UNDURCHLAESSIG` | – |
| `neigung_prozent` | float32 | nein | ≥ 0, 1 Nachkommastelle | % |

Score je Regenmenge im Rechengebiet (Minimum = Dach/Asphalt, methodisch bedingt):

| Regen | Minimum | Mittel | Maximum |
|---|---|---|---|
| 30 mm | 18,1 % | 70,5 % | 100 % |
| 40 mm | 14,0 % | 63,0 % | 99,2 % |
| 50 mm | 11,4 % | 56,8 % | 96,6 % |
| 60 mm | 9,7 % | 51,7 % | 93,4 % |
| 70 mm | 8,4 % | 47,4 % | 89,9 % |
| 80 mm | 7,4 % | 43,8 % | 86,6 % |

Je mehr Regen, desto kleiner der Score: Der Boden nimmt einen festen Speicher auf, der Rest fließt ab.

Alle Score- und Abflussspalten sind leer (Parquet `null`, CSV leeres Feld), wenn
- `aussagekraft` = `WIDERSPRUCH` (903.128 Zellen), oder
- die Zelle zu mindestens 50 % aus Fließgewässer besteht (25.410 Zellen).

Werte in `annahmen`:

| Wert | Bedeutung |
|---|---|
| `BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT` | Baum mit CN-Wert „Woods–grass combination, poor“ (TR-55) |
| `GRUENDACH_MIT_ABFLUSSBEIWERT_0_4` | Gründach mit Abflussbeiwert 0,4 |
| `WASSER_MIT_VOLLER_AUFNAHME` | stehendes Gewässer nimmt den Regen voll auf |
| `VEGETATION_IN_STRASSE_LUFTBILD_GILT` | Vegetation in ALKIS-Straßenfläche, Luftbild gilt |

Bedeutung von `aussagekraft`:

| Wert | Bedeutung |
|---|---|
| `BESTAETIGT` | Luftbild und unabhängige Quelle (ALKIS, Höhenmodell) stimmen überein, Zelle homogen, kaum Schatten |
| `NUR_LUFTBILD` | ohne Gegenprobe, Mischfeld oder Schatten |
| `ANNAHME` | Wert beruht auf mindestens einer Annahme aus `annahmen` |
| `WIDERSPRUCH` | Quellen widersprechen sich, kein Score (häufig: abgeerntete Äcker im Luftbild vom August 2024) |

## Beispielzeile

| Spalte | Wert |
|---|---|
| `id` | `479531_5417789` |
| `rechtswert` / `hochwert` | 479531 / 5417789 |
| `region` | 1 |
| `breitengrad` / `laengengrad` | 48.9127069 / 8.7206437 |
| `score_prozent_30mm` / `40mm` / `50mm` / `60mm` / `70mm` / `80mm` | 66.5 / 56.9 / 49.6 / 44.0 / 39.5 / 35.8 |
| `abfluss_mm_30mm` / `40mm` / `50mm` / `60mm` / `70mm` / `80mm` | 10.0 / 17.2 / 25.2 / 33.6 / 42.4 / 51.3 |
| `aussagekraft` | `ANNAHME` |
| `klasse` | `BAUM` |
| `annahmen` | `BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT` |
| `bodengruppe` | `UNDURCHLAESSIG` |
| `neigung_prozent` | 62.4 |

## Verhältnis zum Frontend-Modell

`09_analyse/datenmodell_zelle.md` beschreibt das GeoJSON-Feature, das die Karte erhält. Abbildung Tabelle → Feature:
- `geometry` = Quadrat aus `rechtswert`/`hochwert`, nach WGS84 umgerechnet
- `annahmen` = Text an `;` getrennt, als Array
- `score_prozent_<n>mm` → `score_prozent.<n>`, `abfluss_mm_<n>mm` → `abfluss_mm.<n>` (Objekt mit Schlüssel je Regenmenge)
- alle übrigen Spalten außer `rechtswert`/`hochwert` gleichnamig als `properties`

## Laden (Beispiele)

```sql
-- DuckDB: mittlerer Score je Region bei 70 mm
SELECT region, avg(score_prozent_70mm) FROM 'zellen.parquet' GROUP BY region;

-- Langformat (eine Zeile je Zelle und Regenmenge)
UNPIVOT (SELECT id, score_prozent_30mm AS "30", score_prozent_40mm AS "40", score_prozent_50mm AS "50",
                score_prozent_60mm AS "60", score_prozent_70mm AS "70", score_prozent_80mm AS "80" FROM 'zellen.parquet')
ON "30", "40", "50", "60", "70", "80" INTO NAME regen_mm VALUE score_prozent;
```

```sql
-- PostGIS nach Import der CSV in Tabelle zellen
ALTER TABLE zellen ADD COLUMN geom geometry(Polygon, 25832);
UPDATE zellen SET geom = ST_MakeEnvelope(rechtswert, hochwert, rechtswert + 1, hochwert + 1, 25832);
CREATE INDEX ON zellen USING gist (geom);
```

## Tagessimulation (`simulation.parquet`)

Parameter, mit denen sich der Abfluss je Zelle für jede beliebige kumulierte Regenmenge P (0–80 mm) berechnen lässt, z. B. für eine Regentag-Simulation: zurückgehaltener Regen = P − Q(P). Gleiche Zeilen in gleicher Reihenfolge wie `zellen.parquet` (4.589.876 Zeilen, 35 MB, zstd), Verknüpfung über Zeilenposition oder `rechtswert`/`hochwert`.

| Spalte | Typ | Leer erlaubt | Bedeutung | Einheit |
|---|---|---|---|---|
| `rechtswert`, `hochwert` | int32 | nein | linke untere Ecke, EPSG:25832 | m |
| `breitengrad`, `laengengrad` | float64 | nein | Mittelpunkt, wie in `zellen.parquet` | Grad |
| `anteil_versiegelt` | float32 | ja | Anteil Dach + versiegelt | 0–1 |
| `s_versiegelt_mm` | float32 | ja | Speicher S der versiegelten Fläche (CN 98, hangkorrigiert) | mm |
| `anteil_wiese` | float32 | ja | Anteil Wiese | 0–1 |
| `s_wiese_mm` | float32 | ja | Speicher S Wiese (CN „open space, good“ nach Bodengruppe, hangkorrigiert) | mm |
| `anteil_baum` | float32 | ja | Anteil Baum | 0–1 |
| `s_baum_mm` | float32 | ja | Speicher S Baum (CN „woods–grass, poor“ nach Bodengruppe, hangkorrigiert) | mm |
| `linearer_abflussanteil` | float32 | ja | Anteil Gründach × Abflussbeiwert 0,4 | 0–1 |

Die Anteile sind wie im Score auf die Fläche ohne Fließgewässer normiert; stehendes Gewässer trägt 0 bei. Ist ein Anteil 0, ist das zugehörige S trotzdem gefüllt.

Abfluss Q(P) in mm:

```
Q(P) = anteil_versiegelt * q(P, s_versiegelt_mm) + anteil_wiese * q(P, s_wiese_mm)
     + anteil_baum * q(P, s_baum_mm) + linearer_abflussanteil * P
q(P, S) = (P - 0.2 S)^2 / (P + 0.8 S)   für P > 0.2 S, sonst 0
Score(P) = (1 - Q(P) / P) * 100
```

Alle sieben Parameterspalten sind leer, wo `abfluss_mm_*mm` in `zellen.parquet` leer ist (Muster identisch).

Herkunft: `10_backend/export_simulation.py` führt `compute_window` der Rechnung je Block aus und leitet die Parameter mit den Funktionen aus `sponge_area_v3.py` ab. Prüfung im Skript: Q(P) aus den Parametern weicht bei 30–80 mm höchstens 0,05 mm von `abfluss_mm_<P>mm` ab (Rundung auf 1 Nachkommastelle) und höchstens 0,00001 mm von den ungerundeten Blockwerten; die Leer-Muster stimmen exakt überein.

## Herkunft

- Methode: SCS Curve Number (TR-55), Bodengruppen nach NEH 630, Hangkorrektur SWAT+, Methodendokumentation `09_analyse/OekoScout_Methodendokumentation.pdf`
- Rechnung: `09_analyse/rechengebiet_v3/sponge_rechengebiet.py`, Stand 07.11.2026
- Daten: LGL (DOP20 2024, nDOM1, DGM1, ALKIS), LGRB BK50
