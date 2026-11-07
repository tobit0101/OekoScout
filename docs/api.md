# Schwammstadt-Score Pforzheim – REST-API v1

Schnittstelle für das Karten-Frontend. Sie liefert den Sponge Score je Quadratmeter für eine Koordinate, die Umrisse der 8 Regionen des Rechengebiets und die Kennzahlen zum Datensatz.

Die Raster-Kacheln (XYZ) für die flächige Darstellung kommen **nicht** von dieser API. Sie werden separat statisch ausgeliefert.

## Grundlagen

| | |
|---|---|
| Basis-URL lokal | `http://localhost:8001/api/v1` |
| Format | JSON, UTF-8 |
| Methoden | nur `GET` |
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

## Fehlerformat

| Status | Body |
|---|---|
| 404 | `{ "detail": string }` |
| 422 | `{ "detail": [ { "type", "loc", "msg", "input" } ] }` |
| 503 | `{ "detail": string }` |
