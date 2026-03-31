# Plant Health & Status Tracker — Design Spec

## Overview

An interactive plant health monitoring system using an ESP32 with multiple sensors, a Next.js web dashboard with Socket.io real-time communication, and a Gemini-powered plant chatbot. The plant is represented as a living, animated avatar that reacts to real sensor data and user interaction (touch via copper wires on the plant).

## Hardware

### Components

| Component | Type | Interface |
|-----------|------|-----------|
| ESP32 | Microcontroller | WiFi (Station mode) |
| DHT22 | Temperature & Humidity | Digital (1-wire), 3-pin module (built-in pull-up) |
| BH1750 | Light/Lux Sensor | I2C (SDA GPIO 21, SCL GPIO 22) |
| TTP223 | Capacitive Touch | Digital GPIO (interrupt-capable) |
| Capacitive Soil Sensor (HW-080) | Soil Moisture | AO (ADC pin) + D0 (GPIO) via module |

### Wiring Summary

| Sensor | ESP32 Pins |
|--------|------------|
| DHT22 | 1 GPIO (data), VCC, GND |
| BH1750 | GPIO 21 (SDA), GPIO 22 (SCL), VCC, GND |
| TTP223 | 1 GPIO (interrupt-capable), VCC, GND |
| Soil Sensor Module | 1 ADC pin (AO), 1 GPIO (D0), VCC, GND |

### Touch Setup

Copper wires connected to the TTP223 sensor pad and spread across the plant. Touching the plant triggers the capacitive touch sensor.

### Network

ESP32 connects to any WiFi network (home router or phone hotspot) in Station mode. The laptop connects to the same network. Both devices can communicate via Socket.io, and the laptop retains internet access for Gemini API calls.

```
[ESP32] --WiFi--> [WiFi AP (Router/Hotspot)] <--WiFi-- [Laptop]
                            |
                       [Internet] --> Gemini API
```

## System Architecture

Three components:

1. **ESP32 Firmware (Arduino C++)** — reads sensors, pushes data via WebSocket
2. **Next.js + Socket.io Server (Laptop)** — receives data, persists to JSON, serves dashboard
3. **Browser Dashboard (React)** — live animated UI, chatbot, analytics

```
[ESP32 + Sensors] --(Socket.io client)--> [Next.js + Socket.io Server] <--(Socket.io)--> [Browser Dashboard]
                                                    |
                                              [JSON files on disk]
                                                    |
                                              [Gemini API]
```

## ESP32 Firmware

### Behavior

- On boot: connect to WiFi, then connect to laptop's Socket.io server via WebSocket
- **Normal loop:** Every 5 seconds, read all sensors, send JSON payload
- **Touch interrupt:** TTP223 triggers a hardware interrupt, sends touch event immediately (no waiting for 5s cycle)
- **Reconnection:** Auto-retry with backoff on WiFi or WebSocket disconnect
- **Config:** WiFi credentials and server IP as `#define` constants at top of sketch

### Data Payloads

**Sensor reading (every 5s):**
```json
{
  "temp": 25.3,
  "humidity": 60.1,
  "soilAnalog": 680,
  "soilDry": false,
  "lux": 450.5,
  "touch": false,
  "timestamp": 1711872000
}
```

**Touch event (immediate):**
```json
{
  "event": "touch",
  "timestamp": 1711872000
}
```

## Next.js + Socket.io Server

### Project Structure

```
plant-tracker/
├── server.js              # Custom server: Next.js + Socket.io
├── data/                  # JSON data storage
│   ├── 2026-03-31.json    # Sensor readings (one file per day)
│   ├── touches/
│   │   └── 2026-03-31.json
│   ├── chats/
│   │   └── 2026-03-31.json
│   ├── archive/           # Auto-archived data older than 90 days
│   └── config.json        # Thresholds, sound preference, plant name
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── page.tsx       # Dashboard (live view)
│   │   ├── analytics/
│   │   │   └── page.tsx   # Historical analytics
│   │   ├── settings/
│   │   │   └── page.tsx   # Threshold configuration
│   │   └── layout.tsx
│   ├── components/
│   │   ├── PlantAvatar.tsx # Animated plant character
│   │   ├── SensorCard.tsx  # Individual sensor display
│   │   ├── TrendChart.tsx  # Line charts (Recharts)
│   │   ├── HealthScore.tsx # Overall health gauge
│   │   ├── AlertBanner.tsx # Threshold warnings
│   │   └── ChatPanel.tsx   # Plant chatbot interface
│   └── lib/
│       ├── socket.ts      # Socket.io client setup
│       ├── thresholds.ts  # Health score calculation
│       └── gemini.ts      # Gemini API client
├── public/
│   └── sounds/            # Touch reaction sound files
└── package.json
```

### Server Behavior (`server.js`)

- Wraps Next.js with a custom HTTP server
- Attaches Socket.io to the same server
- Identifies ESP32 connections (via a handshake key)
- On sensor data: append to daily JSON file, broadcast to browser clients
- On touch event: immediately broadcast to browsers

### API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/readings?range=24h` | Last 24 hours of sensor data |
| `GET /api/readings?range=7d` | Last 7 days |
| `GET /api/readings?range=30d` | Last 30 days (sampled: 1 reading/minute) |
| `GET /api/summary?date=2026-03-31` | Daily avg/min/max per sensor |
| `POST /api/chat` | Send message to Gemini with sensor context, returns plant response |

## Browser Dashboard

### Pages

#### Dashboard (`/`) — Live View

**Top: Plant Avatar (center stage)**
- Animated plant character with multiple states driven by real sensor data:
  - **Thriving (80-100%):** Bouncing, glowing softly, swaying, singing with floating musical notes
  - **Okay (60-79%):** Calm, gentle sway
  - **Stressed (40-59%):** Drooping slightly, concerned face
  - **Critical (0-39%):** Wilting, brown, calling for help
- Ambient animations — always moving, feels alive
- **Touch reaction:** Wiggles, glows, speech bubble with fun line, browser plays selected sound

**Middle: Sensor Cards (4 cards)**

| Temperature | Humidity | Soil Moisture | Light |
|-------------|----------|---------------|-------|
| Current value, mini sparkline, color-coded status (green/yellow/red) |

**Bottom left: Health Score**
- Overall health percentage (0-100%)
- Visual gauge

**Bottom right: Chat Panel**
- Chat interface to talk to the plant
- Powered by Gemini API with a plant personality
- Plant knows real-time sensor data and history
- Fun personality: sassy, grateful, dramatic depending on health state
- Chat history persisted per day

**Alert Banner (top, when triggered):**
- Appears when any sensor crosses threshold
- D0 soil sensor triggers immediate "Water now!" alert

#### Analytics (`/analytics`)

- Time range selector: 24h / 7 days / 30 days / custom
- Line charts per sensor over time (Recharts)
- Daily summary table: avg, min, max per sensor per day

#### Settings (`/settings`)

- Configure ideal ranges per sensor
- Pick touch reaction sound from presets
- Set plant name
- Saved to `data/config.json`

## Health Score Calculation

Weighted average of individual sensor scores:

| Sensor | Weight | Default Ideal Range |
|--------|--------|---------------------|
| Soil Moisture (AO) | 35% | 40-70% |
| Temperature | 25% | 18-28°C |
| Humidity | 20% | 40-70% |
| Light (lux) | 20% | 200-1000 lux |

- Value within ideal range = 100% for that sensor
- Outside range: score decreases proportionally with distance
- Weighted average = overall health score
- **D0 emergency override:** If soil D0 triggers dry, immediate "Water now!" alert regardless of score

All thresholds configurable via settings page.

## Data Storage

### JSON Files on Disk

**Sensor readings:** `data/YYYY-MM-DD.json`
```json
[
  {
    "timestamp": 1711872000,
    "temp": 25.3,
    "humidity": 60.1,
    "soilAnalog": 680,
    "soilDry": false,
    "lux": 450.5,
    "healthScore": 87
  }
]
```

**Touch events:** `data/touches/YYYY-MM-DD.json`
```json
[
  {"timestamp": 1711872045, "chatResponse": "Hey! That tickles!"}
]
```

**Chat history:** `data/chats/YYYY-MM-DD.json`

**Config:** `data/config.json` — thresholds, sound choice, plant name

### Archival

Files older than 90 days auto-move to `data/archive/` to keep active data manageable.

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Microcontroller | ESP32 (Arduino C++) |
| Sensors | DHT22, BH1750, TTP223, Capacitive Soil (HW-080) |
| Transport | Socket.io (ESP32 as WebSocket client) |
| Server | Next.js + Socket.io (custom server.js) |
| Frontend | React, Recharts, CSS animations |
| AI Chatbot | Gemini API |
| Data Storage | JSON files on disk |
| Audio | Browser Web Audio API (preset sounds) |
