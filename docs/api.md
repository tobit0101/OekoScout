# Schwammstadt-Score Pforzheim – REST-API v1

Schnittstelle für das Karten-Frontend. Sie liefert den Sponge Score je Quadratmeter für eine Koordinate, die Umrisse der 8 Regionen des Rechengebiets, die Kennzahlen zum Datensatz und die Heatmap als Raster-Kacheln (XYZ, PNG).

## Grundlagen

| | |
|---|---|
| Basis-URL lokal | `http://localhost:8001/api/v1` |
| Format | JSON, UTF-8 |
| Methoden | `GET`, nur `/area` ist `POST` |
| CORS | offen (`Access-Control-Allow-Origin: *`) |
| Authentifizierung | keine |
| Koordinaten | WGS84 (EPSG:4326), Dezimalgrad |
| Interaktive Doku | `http://localhost:8001/docs` (Swagger), Schema unter `/openapi.json` |

Start: `docker compose up --build` im Repo-Wurzelverzeichnis. Die Datendateien müssen in `./data` liegen.

## Fachliche Begriffe

- **Zelle:** Quadrat von 1 × 1 m. Das Rechengebiet hat 4.589.876 Zellen auf 4,59 km² in 8 Regionen.
- **Regenmenge:** Tagesniederschlag 30, 40, 50, 60, 70 oder 80 mm. Score und Abfluss liegen für jede Regenmenge vor, alle anderen Werte sind unabhängig davon.
- **Score (`score_prozent`):** Anteil des Regens, den die Fläche zurückhält, in %. Je mehr Regen fällt, desto kleiner wird der Score.
- **Abfluss (`abfluss_mm`):** Anteil des Regens, der oberflächlich abfließt, in mm (0 bis zur Regenmenge).
- **Aussagekraft:** Wie belastbar der Wert ist. Bei `WIDERSPRUCH` gibt es keinen Score.

---

## `GET /health`

Prüft, ob die API die Zelldaten lesen kann.

**200**
```json
{ "status": "ok", "zellen": 4589876 }
```

**503**, wenn die Zelldaten nicht lesbar sind:
```json
{ "detail": "Zelldaten nicht lesbar" }
```

---

## `GET /cell?lat={float}&lng={float}`

Liefert die Zelle an einer Koordinate, z. B. für Klick oder Hover auf der Karte.

| Parameter | Typ | Pflicht | Bereich |
|---|---|---|---|
| `lat` | float | ja | −90 … 90 |
| `lng` | float | ja | −180 … 180 |

Gefunden wird die Zelle, deren Mittelpunkt der Koordinate am nächsten liegt, im Umkreis von etwa 1 m. Außerhalb der 8 Regionen gibt es keine Zellen, die API antwortet dann mit 404.

```bash
curl "http://localhost:8001/api/v1/cell?lat=48.9127069&lng=8.7206437"
```

**200**
```json
{
  "id": "479531_5417789",
  "region": 1,
  "klasse": "BAUM",
  "aussagekraft": "ANNAHME",
  "bodengruppe": "UNDURCHLAESSIG",
  "neigung_prozent": 62.4,
  "annahmen": ["BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT"],
  "score_prozent": { "30": 66.5, "40": 56.9, "50": 49.6, "60": 44.0, "70": 39.5, "80": 35.8 },
  "abfluss_mm": { "30": 10.0, "40": 17.2, "50": 25.2, "60": 33.6, "70": 42.4, "80": 51.3 }
}
```

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | string | `"<rechtswert>_<hochwert>"`, linke untere Ecke in EPSG:25832, eindeutig |
| `region` | int | 1–8, entspricht `id` in `/regions` |
| `klasse` | enum | Oberfläche, siehe unten |
| `aussagekraft` | enum | Belastbarkeit, siehe unten |
| `bodengruppe` | enum | Versickerungsfähigkeit des Bodens, siehe unten |
| `neigung_prozent` | float | Hangneigung in %, ≥ 0 |
| `annahmen` | string[] | getroffene Annahmen, leeres Array wenn keine |
| `score_prozent` | object | Schlüssel `"30"`…`"80"`, Wert float (%) oder **`null`** |
| `abfluss_mm` | object | Schlüssel `"30"`…`"80"`, Wert float (mm) oder **`null`** |

> **Wichtig:** `score_prozent` und `abfluss_mm` sind für alle sechs Regenmengen `null`, wenn `aussagekraft` = `WIDERSPRUCH` ist (rund 903.000 Zellen) oder wenn die Zelle überwiegend aus Fließgewässer besteht (rund 25.000 Zellen). Das Frontend sollte dafür „kein Score“ anzeigen und keine 0.

**404**, wenn an der Koordinate keine Zelle des Rechengebiets liegt:
```json
{ "detail": "Keine Zelle im Rechengebiet an dieser Koordinate" }
```

**422**, wenn ein Parameter fehlt, keine Zahl ist oder außerhalb des Bereichs liegt (FastAPI-Standardformat):
```json
{
  "detail": [
    { "type": "missing", "loc": ["query", "lat"], "msg": "Field required", "input": null }
  ]
}
```
Bereichsfehler enthalten zusätzlich `ctx` (z. B. `{ "le": 90.0 }`).

**503**, wenn die Zelldaten nicht lesbar sind:
```json
{ "detail": "Zelldaten nicht lesbar" }
```

### Wertelisten

`klasse`

| Wert | Bedeutung |
|---|---|
| `DACH` | Dach |
| `VERSIEGELT` | versiegelte Fläche (Asphalt, Pflaster) |
| `WIESE` | Wiese, Rasen |
| `BAUM` | Baum |
| `GRUENDACH` | Gründach |
| `STILLGEWAESSER` | stehendes Gewässer |
| `FLIESSGEWAESSER` | Fließgewässer |

`aussagekraft`

| Wert | Bedeutung |
|---|---|
| `BESTAETIGT` | Luftbild und unabhängige Quelle (ALKIS, Höhenmodell) stimmen überein |
| `NUR_LUFTBILD` | ohne Gegenprobe, Mischfeld oder Schatten |
| `ANNAHME` | Wert beruht auf mindestens einer Annahme aus `annahmen` |
| `WIDERSPRUCH` | Quellen widersprechen sich, kein Score |

`bodengruppe` (absteigend nach Versickerungsfähigkeit)

| Wert | Bedeutung |
|---|---|
| `SEHR_DURCHLAESSIG` | Gruppe A |
| `DURCHLAESSIG` | Gruppe B |
| `WENIG_DURCHLAESSIG` | Gruppe C |
| `UNDURCHLAESSIG` | Gruppe D |

`annahmen`

| Wert | Bedeutung |
|---|---|
| `BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT` | Baum gerechnet als Baum-Gras-Mischung, schlechter Zustand (TR-55) |
| `GRUENDACH_MIT_ABFLUSSBEIWERT_0_4` | Gründach mit Abflussbeiwert 0,4 |
| `WASSER_MIT_VOLLER_AUFNAHME` | stehendes Gewässer nimmt den Regen voll auf |
| `VEGETATION_IN_STRASSE_LUFTBILD_GILT` | Vegetation in ALKIS-Straßenfläche, das Luftbild gilt |

---

## `GET /regions`

Liefert die Umrisse der 8 Regionen als GeoJSON-FeatureCollection in WGS84. Die Koordinatenreihenfolge ist nach RFC 7946 `[lng, lat]` mit 7 Nachkommastellen.

```bash
curl "http://localhost:8001/api/v1/regions"
```

**200** (gekürzt)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "properties": {
        "id": 1,
        "flaeche_m2": 2452209,
        "bbox_epsg25832": [477000, 5416645, 480956, 5418000]
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[8.6860823, 48.9145116], "…"]]
      }
    }
  ]
}
```

| Feld | Bedeutung |
|---|---|
| `id`, `properties.id` | Regionsnummer 1–8 |
| `properties.flaeche_m2` | Fläche in m² |
| `properties.bbox_epsg25832` | `[minX, minY, maxX, maxY]` in EPSG:25832 (Meter) |
| `geometry.type` | `Polygon` oder `MultiPolygon` |

**503**, wenn die Datei fehlt:
```json
{ "detail": "Regionen nicht lesbar" }
```

### Google Maps

```js
const res = await fetch(`${API}/regions`);
map.data.addGeoJson(await res.json());
map.data.setStyle({ fillOpacity: 0, strokeColor: "#1a73e8", strokeWeight: 2 });
```

---

## `GET /stats`

Liefert die Kennzahlen zum Datensatz, z. B. für Legende, Skala oder ein Infopanel.

**200**
```json
{
  "zeilen": 4589876,
  "mit_score": 3661338,
  "score_je_regenmenge": {
    "30mm": { "min": 18.1, "mittel": 70.5, "max": 100.0 },
    "40mm": { "min": 14.0, "mittel": 63.0, "max": 99.2 },
    "50mm": { "min": 11.4, "mittel": 56.8, "max": 96.6 },
    "60mm": { "min": 9.7, "mittel": 51.7, "max": 93.4 },
    "70mm": { "min": 8.4, "mittel": 47.4, "max": 89.9 },
    "80mm": { "min": 7.4, "mittel": 43.8, "max": 86.6 }
  },
  "je_region": { "1": 2452201, "2": 1679824, "3": 178533, "4": 85201, "5": 66187, "6": 53913, "7": 43186, "8": 30831 },
  "aussagekraft": { "ANNAHME": 1938564, "BESTAETIGT": 1088333, "WIDERSPRUCH": 903128, "NUR_LUFTBILD": 659851 }
}
```

> **Hinweis:** Die Schlüssel in `score_je_regenmenge` lauten `"30mm"`…`"80mm"`, in `/cell` dagegen `"30"`…`"80"`. Beide Formate kommen so aus den Quelldaten.

**503**, wenn die Datei fehlt:
```json
{ "detail": "Kennzahlen nicht lesbar" }
```

---

## `GET /tiles/{regen}/{z}/{x}/{y}.png`

Liefert eine Heatmap-Kachel (256 × 256 px, PNG mit Alpha) im XYZ-Schema (Web Mercator, EPSG:3857, y von oben), wie es `L.tileLayer` und OpenStreetMap verwenden.

| Parameter | Ort | Typ | Pflicht | Bereich |
|---|---|---|---|---|
| `regen` | Pfad | int | ja | 30, 40, 50, 60, 70, 80 (mm) |
| `z` | Pfad | int | ja | 0 … 22 |
| `x`, `y` | Pfad | int | ja | 0 … 2^z − 1 |
| `score_min` | Query | float | nein | 0 … 100, Standard 0 |
| `score_max` | Query | float | nein | 0 … 100, Standard 100, muss ≥ `score_min` sein |

**Verhalten**

- Zellen mit Score im Bereich `score_min` … `score_max` erscheinen in der Farbe der Skala unten, deckend (Alpha 255).
- Zellen mit Score außerhalb des Bereichs sind transparent.
- Zellen ohne Score (`WIDERSPRUCH`, Fließgewässer) sind immer grau (`#9E9E9E`), unabhängig vom Filter.
- Pixel ohne Zelle sind transparent.
- Bis Zoom 16 (1 Pixel ≥ 1 Zelle) wird je Pixel der Mittelwert der Scores aller bewerteten Zellen gezeichnet, der Filter gilt für diesen Mittelwert. Ein Pixel ohne bewertete Zelle ist grau. Ab Zoom 17 wird jede Zelle als Quadrat ihrer Fläche gezeichnet, ohne Lücken.
- Unter Zoom 13 und außerhalb des Rechengebiets liefert die API eine vollständig transparente Kachel. Das Frontend sollte `minZoom: 13` setzen.
- Antwortheader: `Content-Type: image/png`, `Cache-Control: public, max-age=300, must-revalidate`. Gerenderte Kacheln werden zusätzlich im Server-Speicher gehalten.

**Farbskala** (lineare Interpolation in RGB, unter 11 % und über 85 % wird die erste bzw. letzte Farbe verwendet)

| Score % | Farbe |
|---|---|
| 11 | `#D73027` |
| 25 | `#F46D43` |
| 40 | `#FDAE61` |
| 50 | `#FEE08B` |
| 60 | `#A6D96A` |
| 72 | `#66BD63` |
| 85 | `#1A9850` |
| kein Score | `#9E9E9E` |

```bash
curl -o kachel.png "http://localhost:8001/api/v1/tiles/50/17/68711/45061.png?score_min=0&score_max=100"
```

### Leaflet

```js
L.tileLayer('/api/v1/tiles/50/{z}/{x}/{y}.png?score_min=0&score_max=100', { minZoom: 13, maxZoom: 20, opacity: 0.75 }).addTo(map);
```

**422**, wenn `regen` nicht in der Liste steht, `x` oder `y` außerhalb des Bereichs für `z` liegen, `z` > 22 ist, ein Score-Parameter nicht in 0 … 100 liegt oder `score_min` > `score_max` ist.

**503**, wenn die Zelldaten nicht lesbar sind:
```json
{ "detail": "Zelldaten nicht lesbar" }
```

---

## `GET /simulation/tiles/{regen}/{stunde}/{z}/{x}/{y}.png`

Liefert eine Heatmap-Kachel (256 × 256 px, PNG mit Alpha) der Tagessimulation im XYZ-Schema wie `/tiles`. Der Tagesregen `regen` fällt gleichmäßig über 24 h. Die Kachel zeigt in Blautönen, wie viel vom Regen des gesamten Tages zur Stunde `stunde` bereits im Boden gehalten wird. Bei `stunde` = 24 entspricht der Wert dem Score aus `/tiles` geteilt durch 100.

| Parameter | Ort | Typ | Pflicht | Bereich |
|---|---|---|---|---|
| `regen` | Pfad | int | ja | 30, 40, 50, 60, 70, 80 (mm) |
| `stunde` | Pfad | int | ja | 0 … 24 |
| `z` | Pfad | int | ja | 0 … 22 |
| `x`, `y` | Pfad | int | ja | 0 … 2^z − 1 |

Es gibt keinen Score-Filter.

**Formel**

Regen gleichmäßig über 24 h verteilt, jede Zelle für sich (ohne Zufluss).

```
P_t              = regen · stunde / 24
Q(P)             = anteil_versiegelt · q(P, s_versiegelt_mm)
                 + anteil_wiese · q(P, s_wiese_mm)
                 + anteil_baum · q(P, s_baum_mm)
                 + linearer_abflussanteil · P
q(P, S)          = (P − 0,2 · S)² / (P + 0,8 · S)   falls P > 0,2 · S, sonst 0
gehalten_anteil  = (P_t − Q(P_t)) / regen
```

`gehalten_anteil` liegt zwischen 0 (Stunde 0, nichts gehalten) und 1 (alles gehalten). Alle Größen in mm.

**Verhalten**

- Jede Zelle mit Simulationsparametern erscheint in der Farbe der Skala unten: Bei 0 ist sie durchsichtig, ab 4 % wird sie hellblau und mit steigendem Anteil dunkler blau (Deckkraft konstant 0,85).
- Zellen ohne Parameter (kein Score) sind durchsichtig, anders als bei `/tiles`, wo sie deckend grau sind.
- Pixel ohne Zelle sind transparent.
- Bis Zoom 16 (1 Pixel ≥ 1 Zelle) wird je Pixel der Mittelwert von `gehalten_anteil` aller bewerteten Zellen gezeichnet. Ab Zoom 17 wird jede Zelle als Quadrat ihrer Fläche gezeichnet.
- Unter Zoom 13 und außerhalb des Rechengebiets liefert die API eine vollständig transparente Kachel. Das Frontend sollte `minZoom: 13` setzen.
- Antwortheader: `Content-Type: image/png`, `Cache-Control: public, max-age=300, must-revalidate`. Gerenderte Kacheln werden zusätzlich im Server-Speicher gehalten.

**Farbskala** (lineare Interpolation in RGB und Alpha, unter 0 und über 1 wird die erste bzw. letzte Stufe verwendet)

| `gehalten_anteil` | Farbe | Alpha |
|---|---|---|
| 0,00 | `#D6EEFF` | 0,00 |
| 0,04 | `#D6EEFF` | 0,85 |
| 0,25 | `#8CCBFF` | 0,85 |
| 0,50 | `#3D95FF` | 0,85 |
| 0,75 | `#1259D9` | 0,85 |
| 1,00 | `#0A2A80` | 0,85 |
| kein Score | – | 0,00 |

```bash
curl -o kachel.png "http://localhost:8001/api/v1/simulation/tiles/50/12/17/68711/45061.png"
```

### Leaflet

```js
L.tileLayer('/api/v1/simulation/tiles/50/12/{z}/{x}/{y}.png', { minZoom: 13, maxZoom: 20, opacity: 0.75 }).addTo(map);
```

**422**, wenn `regen` nicht in der Liste steht, `stunde` nicht in 0 … 24 liegt oder keine Ganzzahl ist, `x` oder `y` außerhalb des Bereichs für `z` liegen oder `z` > 22 ist.

**503**, wenn die Simulationsdaten (`simulation.parquet`) fehlen oder nicht lesbar sind. Alle übrigen Endpunkte arbeiten dann weiter:
```json
{ "detail": "Simulationsdaten nicht lesbar" }
```

---

## `POST /area`

Fasst alle Zellen innerhalb einer gezeichneten Fläche zusammen, z. B. für ein Infopanel zu einem Kreis, Rechteck oder Polygon auf der Karte. Das Frontend wandelt Kreise (64 Eckpunkte) und Rechtecke vorher in ein Polygon um.

**Request** (JSON, GeoJSON-Polygon in WGS84, `[lng, lat]`)
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[8.7201, 48.9125], [8.7210, 48.9125], [8.7210, 48.9130], [8.7201, 48.9130], [8.7201, 48.9125]]]
  }
}
```

- Nur der äußere Ring ist erlaubt, Löcher werden abgelehnt.
- Der Ring muss geschlossen sein (erste = letzte Position) und mindestens 4 Positionen haben.
- Höchstens 1000 Eckpunkte und höchstens 1.000.000 m² (1 km²) Fläche.
- Selbstüberschneidende Polygone werden angenommen, überlappende Teile zählen nach der Even-Odd-Regel.
- Eine Zelle gehört zur Fläche, wenn ihr Mittelpunkt im Polygon liegt. Das Polygon wird dazu nach EPSG:25832 transformiert.

```bash
curl -X POST "http://localhost:8001/api/v1/area" \
  -H 'Content-Type: application/json' \
  -d '{"geometry":{"type":"Polygon","coordinates":[[[8.7201,48.9125],[8.7210,48.9125],[8.7210,48.9130],[8.7201,48.9130],[8.7201,48.9125]]]}}'
```

**200**
```json
{
  "flaeche_m2": 3840.2,
  "zellen": 3790,
  "zellen_mit_score": 3312,
  "score_mittel": { "30": 71.2, "40": 64.0, "50": 58.1, "60": 53.0, "70": 48.7, "80": 45.0 },
  "rueckhalt_liter": { "30": 70742.4, "40": 84787.2, "50": 96213.6, "60": 105321.6, "70": 112791.2, "80": 119232.0 },
  "abfluss_liter": { "30": 28617.6, "40": 47692.8, "50": 69386.4, "60": 93398.4, "70": 119048.8, "80": 145728.0 },
  "aussagekraft": { "BESTAETIGT": 1200, "NUR_LUFTBILD": 900, "ANNAHME": 1212, "WIDERSPRUCH": 478 },
  "klassen": { "DACH": 800, "VERSIEGELT": 1000, "WIESE": 900, "BAUM": 1000, "GRUENDACH": 0, "STILLGEWAESSER": 0, "FLIESSGEWAESSER": 90 }
}
```

| Feld | Typ | Bedeutung |
|---|---|---|
| `flaeche_m2` | float | Fläche des Polygons in EPSG:25832, 1 Nachkommastelle |
| `zellen` | int | Zellen innerhalb. Außerhalb der 8 Regionen gibt es keine Zellen, daher kann `zellen` kleiner als `flaeche_m2` oder 0 sein |
| `zellen_mit_score` | int | Zellen mit Score (für alle Regenmengen gleich) |
| `score_mittel` | object | Schlüssel `"30"`…`"80"`, Mittelwert des Scores in % über die bewerteten Zellen, **`null`**, wenn keine Zelle bewertet ist |
| `rueckhalt_liter` | object | Schlüssel `"30"`…`"80"`, Summe über die bewerteten Zellen von (Regenmenge − Abfluss) in Litern (1 mm auf 1 m² = 1 l), 0 wenn keine |
| `abfluss_liter` | object | Schlüssel `"30"`…`"80"`, Summe des Abflusses über die bewerteten Zellen in Litern, 0 wenn keine |
| `aussagekraft` | object | Anzahl Zellen je Wert, alle vier Schlüssel immer vorhanden |
| `klassen` | object | Anzahl Zellen je Wert, alle sieben Schlüssel immer vorhanden |

Alle Zahlen sind auf 1 Nachkommastelle gerundet. Mittelwerte und Liter beziehen sich nur auf bewertete Zellen, die Zählungen in `aussagekraft` und `klassen` auf alle Zellen innerhalb.

**422**, wenn die Geometrie ungültig ist. `detail` ist dann ein String:

| `detail` | Ursache |
|---|---|
| `Nur ein äußerer Ring erlaubt` | Löcher (innere Ringe) oder kein Ring |
| `Ring braucht mindestens 4 Positionen` | Ring zu kurz |
| `Ring ist nicht geschlossen` | erste und letzte Position unterscheiden sich |
| `Zu viele Eckpunkte` | mehr als 1000 Eckpunkte |
| `Ungültige Koordinaten` | nicht endliche Werte |
| `Fläche zu groß (max. 1 km²)` | Fläche über 1.000.000 m² |
| `Ausdehnung zu groß (max. 2,5 km)` | Umgebendes Rechteck länger als 2,5 km |

Ein falscher `type` (z. B. `Point`) oder ein fehlerhafter Body liefert das FastAPI-Standardformat (siehe Fehlerformat).

**503**, wenn die Zelldaten nicht lesbar sind:
```json
{ "detail": "Zelldaten nicht lesbar" }
```

---

## Fehlerformat

| Status | Body |
|---|---|
| 404 | `{ "detail": string }` |
| 422 | `{ "detail": [ { "type", "loc", "msg", "input" } ] }`, bei `/area` bei ungültiger Geometrie `{ "detail": string }` |
| 503 | `{ "detail": string }` |
