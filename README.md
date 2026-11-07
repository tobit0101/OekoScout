# Schwammstadt-Potenzialkarte für Pforzheim

**Wo bringt der nächste Quadratmeter Schwammstadt den größten Mehrwert?**

Interaktiver Prototyp für Pforzheim auf Basis offener & städtischer Geodaten (Starkregengefahrenkarte, LGL ALKIS, Copernicus Imperviousness, LGRB Bodenkarte/Hydrogeologie, PFAU Einwohnerdaten, LUBW Schutzgebiete, Niederschlagswassergebühr-Flächen) kombiniert mit der hydrologischen Methodik aus dem **Arup Global Sponge Cities Snapshot** (Blau-Grün-Grau-Infrastrukturbilanz, Hydrological Soil Groups A–D und USDA-SCS Curve Number Abflussmodellierung).

## Projektstruktur

| Ordner | Inhalt |
|---|---|
| `frontend/` | React + Vite + Leaflet, Karten-Oberfläche |
| `backend/` | REST-API (FastAPI + DuckDB), liefert Sponge Score je m², Regionen und Kennzahlen |
| `data/` | Datendateien für das Backend, nicht im Git |
| `docs/` | API-Vertrag ([`docs/api.md`](docs/api.md)), Datenmodell, Spezifikation |

## Live-Start

### 1. Daten bereitstellen

Die Datendateien kommen aus dem Hackathon-Datenpaket `10_backend` und gehören nach `./data`:

- `zellen.parquet`
- `regionen.geojson`
- `kennzahlen.json`

Sie sind nicht im Git-Repository enthalten. Im Container müssen sie für UID 1000 lesbar sein (Standard 644 genügt).

### 2. Backend starten

```bash
docker compose up --build
```

Die API läuft danach auf `http://localhost:8001/api/v1`, die Swagger-Doku auf `http://localhost:8001/docs`.

### 3. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Der Entwicklungsserver läuft unter **http://localhost:5173/** und leitet `/api` an das Backend auf Port 8001 weiter.

### Backend ohne Docker

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
DATA_DIR=../data uvicorn app.main:app --reload --port 8001
pytest
```

## Kernfunktionen

1. **Interaktive Potenzialkarte Pforzheim (Leaflet)**
   - **24 reale Pforzheimer Potenzialflächen** in 5 Demo-Quartieren (*Innenstadt/Enzaue*, *Nordstadt/Wartberg*, *Oststadt/Enzauenpark*, *Weststadt/Brötzingen/Wilferdinger Höhe*, *Südweststadt/Buckenberg*).
   - **Farbkodierung nach Eignung**:
     - **Dunkelgrün**: Sehr geeignet (Score 75–100)
     - **Hellgrün**: Geeignet (Score 55–74)
     - **Gelb**: Eingeschränkt geeignet (Score 35–54, z. B. HQ100 oder Steilhang)
     - **Grau**: Ungeeignet / Restriktion (Score < 35, z. B. Altlastenverdacht oder bereits abgekoppelt)
     - **Blau**: Starkregen-Hotspots & Hauptfließwege (zuschaltbarer Layer)
   - **Thermischer Hitze-Insel-Layer (+°C)** sowie umschaltbare Basiskarten (*Analyse-Dunkel*, *Stadtkarte OSM*, *Topografie & Hanglagen*).

2. **Transparente Scoring-Engine**
   $$\text{Mehrwert} = \text{Wasseranfall} \times \text{Aufnahmepotenzial} \times \text{Verfügbarkeit} \times (1 - \text{Restriktion}) \times (1 + \text{Betroffenheit}) \times (1 - \text{bereits abgekoppelt})$$

3. **Arup „Global Sponge Cities Snapshot“ Hydrologie**
   - **Blau-Grün-Grau-Bilanz** je Quartier mit Live-Simulation bei Aktivierung von Maßnahmen.
   - **Hydrological Soil Groups (A, B, C, D)** gekoppelt mit LGRB-Infiltrationsraten (mm/h) und Grundwasserflurabständen.
   - **USDA-SCS Curve Number (CN)** Abfluss- und Rückhalteberechnung für 3 Starkregenszenarien (*Selten: 38 mm*, *Außergewöhnlich / Arup Benchmark: 50 mm*, *Extrem: 85 mm*).

4. **Erklärbare KI-Schicht & Fördergenerator**
   - Natürlichsprachliche Suche und vordefinierte KI-Fragen (Top-Entsiegelungsflächen, Schulhöfe, Restriktionsbegründung, Maßnahmenlogik).
   - Automatischer **Förderantrag- & Beschlussvorlagen-Generator** inkl. Check für das Pforzheimer Förderprogramm **„Grün mal drei“** und Ersparnisrechner für die Niederschlagswassergebühr.

5. **Export**
   - **PDF / Druck-Steckbrief**, **CSV** (für Excel/Fachämter) und **GeoJSON** (für QGIS/ArcGIS).

