# Schwamm Score Pforzheim

**Wie viel Regen hält ein Quadratmeter Pforzheim zurück?**

Die Karte zeigt für jeden Quadratmeter im Rechengebiet den Schwamm Score: den Anteil eines Tagesregens, den die Fläche zurückhält. Grundlage sind offene und städtische Geodaten (u. a. LGL ALKIS, Luftbild, Höhenmodell, Bodenkarte) und das SCS-Curve-Number-Verfahren.

## Projektstruktur

| Ordner | Inhalt |
|---|---|
| `frontend/` | React + Vite + Google Maps (Fallback: Leaflet/OpenStreetMap), Karten-Oberfläche |
| `backend/` | REST-API (FastAPI + DuckDB), liefert Schwamm Score je m², Kacheln, Regionen und Kennzahlen |
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

Optional: Für die Google-Maps-Karte `frontend/.env.example` nach `frontend/.env.local` kopieren und `VITE_GOOGLE_MAPS_API_KEY` eintragen. Der Key muss den Referrer `http://localhost:5173/*` erlauben. Ohne Key nutzt die App OpenStreetMap (Leaflet).

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

1. **Score-Heatmap je Quadratmeter**: Kachel-Ebene auf der Google-Maps-Karte (Fallback: Leaflet/OpenStreetMap; Zoom ab 13), Farbskala von Rot (wenig Rückhalt) bis Dunkelgrün (viel Rückhalt), Zellen ohne Score grau. Die Ebene lässt sich ein- und ausblenden.
2. **Regenmenge 30–80 mm**: Der Schieberegler wechselt zwischen den sechs Tagesregenmengen 30, 40, 50, 60, 70 und 80 mm. Je mehr Regen, desto kleiner der Score.
3. **Score-Filter**: Der Bereichsfilter blendet Zellen außerhalb der gewählten Score-Spanne aus.
4. **Zelldetails per Klick**: Score mit Einordnung, zurückgehaltene und abfließende Liter je m², Aussagekraft (Bestätigt, Nur Luftbild, Annahme, Widerspruch), getroffene Annahmen, Flächenklasse, Bodengruppe und Hangneigung.
5. **Regionsumrisse**: Die 8 Regionen des Rechengebiets sind als Umrisse eingezeichnet, die Karte öffnet auf diesem Gebiet.
6. **Statistikleiste**: Zellen mit und ohne Score, mittlerer Score und Score-Spanne für die gewählte Regenmenge.

Suche und Export sind in der Oberfläche vorgesehen, aber noch nicht umgesetzt.

## Was der Score bedeutet

Der Schwamm Score gibt an, welchen Anteil eines Tagesregens ein Quadratmeter zurückhält (in %). Berechnet wird er mit dem SCS-Curve-Number-Verfahren aus Flächenklasse, Bodengruppe und Hangneigung. Auch Asphalt erreicht noch etwa 11 %, weil Mulden und Fugen etwas Wasser halten. Der Wert ist eine **Bestandsaufnahme, kein Planungswert**. Das Rechengebiet sind 8 Regionen in Pforzheim, außerhalb gibt es keine Werte. Zellen mit widersprüchlichen Quellen und überwiegend fließendes Wasser erhalten keinen Score.

