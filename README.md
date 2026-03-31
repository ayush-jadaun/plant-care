# 🌱 Plant Health Tracker

**A real-time plant monitoring system using ESP32 sensors and a Next.js dashboard — because your plant deserves better than guesswork.**

---

## ✨ Features

- **Live sensor data** — temperature, humidity, soil moisture, and light streamed every 5 seconds
- **Animated plant avatar** — reacts to health state (thriving / okay / stressed / critical)
- **Ambient mood system** — plant shows mood phrases and plays sounds based on health (happy hum when thriving, crying when critical)
- **Touch interaction** — touch your plant via a capacitive sensor, watch the avatar react with a speech bubble and sound
- **Configurable touch sounds** — pick from chime, boop, nature, or giggle in settings
- **Mute toggle** — one-click mute/unmute button on the dashboard for all sounds
- **Health score gauge** — weighted 0-100% score with color-coded feedback
- **Sensor cards with sparklines** — at-a-glance trends for all four readings
- **Dismissible alert banners** — instant warnings when thresholds are crossed, with dismiss button (reappears after 60s if still active)
- **Analytics page** — historical trend charts (24h / 7d / 30d) with daily summaries
- **Settings page** — configure thresholds, health weights, plant name, and touch sound
- **Resilient firmware** — missing or disconnected sensors won't crash the ESP32, it sends defaults
- **Smart timestamps** — server replaces ESP32 uptime with real Unix timestamps
- **Health score persistence** — server computes and stores health score with every reading for historical analytics
- **Gemini AI chatbot** — talk to your plant *(coming soon)*

---

## 🏗️ Architecture

```
                          ┌─────────────────────────────────────────────────┐
                          │              Laptop / Server                    │
                          │                                                │
  ┌──────────────┐  WiFi  │  ┌──────────────────────┐    ┌──────────────┐  │
  │   ESP32      │◄──────►│  │  Next.js + Socket.io  │◄──►│   Browser    │  │
  │  + Sensors   │ WebSocket │  │  Custom Server (3000) │    │  Dashboard   │  │
  │              │        │  │                      │    │              │  │
  │  DHT22       │        │  └──────────┬───────────┘    └──────────────┘  │
  │  BH1750      │        │             │                                  │
  │  TTP223      │        │             ▼                                  │
  │  Soil Sensor │        │  ┌──────────────────────┐                      │
  └──────────────┘        │  │   JSON File Storage   │                     │
                          │  │   data/YYYY-MM-DD.json│                     │
                          │  └──────────┬───────────┘                      │
                          │             │                                  │
                          │             ▼                                  │
                          │  ┌──────────────────────┐                      │
                          │  │   Gemini API (cloud)  │                     │
                          │  │   AI Chat (optional)  │                     │
                          │  └──────────────────────┘                      │
                          └─────────────────────────────────────────────────┘
```

**Data flow:** ESP32 reads sensors → sends JSON over WebSocket → Node.js server timestamps and stores it → broadcasts to all connected browser clients via Socket.io.

---

## 🔩 Hardware Components

| Component | Model | Purpose |
|-----------|-------|---------|
| Microcontroller | ESP32 (30-pin DevKit) | Reads sensors, connects to WiFi, sends data via WebSocket |
| Temperature & Humidity | DHT22 (3-pin module) | Measures ambient temperature (°C) and relative humidity (%) |
| Light Sensor | BH1750 | Measures illuminance in lux via I2C |
| Touch Sensor | TTP223 (capacitive) | Detects when the plant is touched via copper wire extension |
| Soil Moisture | Capacitive Sensor (HW-080) + comparator module | Analog (moisture level) + digital (dry/wet threshold) output |

---

## 📌 Pin Wiring Diagram

### ESP32 30-Pin DevKit Pinout

```
                    ┌───────────────────┐
                    │       USB-C       │
                    │    ┌─────────┐    │
            3V3  ─ 1│    │         │    │30 ─  GND
             EN  ─ 2│    │  ESP32  │    │29 ─  D23
   (Soil AO) D34 ─ 3│    │         │    │28 ─  D22 (BH1750 SCL) ◄──
            D35  ─ 4│    │         │    │27 ─  TX0
            D32  ─ 5│    │         │    │26 ─  RX0
            D33  ─ 6│    │         │    │25 ─  D21 (BH1750 SDA) ◄──
            D25  ─ 7│    │         │    │24 ─  GND
            D26  ─ 8│    │         │    │23 ─  D19
  (Soil DO) D27  ─ 9│    │         │    │22 ─  D18
            D14  ─10│    │         │    │21 ─  D5
            D12  ─11│    │         │    │20 ─  D17
            D13  ─12│    │         │    │19 ─  D16
             GND ─13│    │         │    │18 ─  D4  (DHT22 OUT) ◄──
             VIN ─14│    │         │    │17 ─  D2
   (Touch)   D15 ─15│    └─────────┘    │16 ─  D15
                    └───────────────────┘
```

> **◄──** marks pins connected to sensors.

### Quick Reference Table

| Sensor | Signal Pin | ESP32 Pin | Notes |
|--------|-----------|-----------|-------|
| DHT22 | OUT | D4 (GPIO 4) | Data line, module has built-in pull-up |
| BH1750 | SDA | D21 (GPIO 21) | I2C data (default) |
| BH1750 | SCL | D22 (GPIO 22) | I2C clock (default) |
| TTP223 | SIG | D15 (GPIO 15) | Interrupt-capable pin |
| Soil Moisture | AO (analog) | D34 (GPIO 34) | ADC1, input-only pin |
| Soil Moisture | DO (digital) | D27 (GPIO 27) | High = dry, Low = wet |
| All sensors | VCC | 3V3 | Powered from ESP32's 3.3V rail |
| All sensors | GND | GND | Common ground |

---

## 🔌 Wiring Instructions

### 1. DHT22 (Temperature & Humidity)

| DHT22 Pin | Connect To |
|-----------|-----------|
| VCC | ESP32 3V3 |
| OUT | ESP32 D4 |
| GND | ESP32 GND |

> **Note:** The 3-pin DHT22 module has a built-in 10K pull-up resistor. No external resistor needed.

### 2. BH1750 (Light / Lux Sensor)

| BH1750 Pin | Connect To |
|------------|-----------|
| VCC | ESP32 3V3 |
| GND | ESP32 GND |
| SDA | ESP32 D21 |
| SCL | ESP32 D22 |

> **Note:** Uses I2C protocol on the ESP32's default I2C pins. No additional configuration needed.

### 3. TTP223 (Capacitive Touch Sensor)

| TTP223 Pin | Connect To |
|------------|-----------|
| VCC | ESP32 3V3 |
| SIG | ESP32 D15 |
| GND | ESP32 GND |

> **Note:** Solder a length of copper wire to the TTP223 touch pad and extend it to the plant's soil or stem. The wire acts as a capacitive antenna — touching the plant triggers the sensor.

### 4. Capacitive Soil Moisture Sensor (HW-080)

| Module Pin | Connect To |
|------------|-----------|
| VCC | ESP32 3V3 |
| GND | ESP32 GND |
| AO (analog out) | ESP32 D34 |
| DO (digital out) | ESP32 D27 |

> **Notes:**
> - Insert the probe into the soil. Keep the comparator module on the breadboard (away from moisture).
> - Adjust the **potentiometer** on the comparator module to set the dry/wet threshold for the digital output.
> - D34 is an **input-only** ADC pin — perfect for analog reads, but cannot be used as output.
> - All sensors are powered from the ESP32's **3.3V pin** via USB power. No external supply needed.

---

## 💻 Software Setup

### Arduino IDE (ESP32 Firmware)

1. **Add ESP32 board support**
   - Go to `File → Preferences → Additional Board Manager URLs`
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`

2. **Install the ESP32 board package**
   - Go to `Tools → Board → Boards Manager`
   - Search **"ESP32"** and install **ESP32 by Espressif Systems**

3. **Select your board**
   - `Tools → Board → ESP32 Arduino → ESP32 Dev Module`

4. **Install required libraries** (`Tools → Manage Libraries`)

   | Library | Author | Purpose |
   |---------|--------|---------|
   | WebSockets | Markus Sattler | WebSocket client for Socket.io communication |
   | ArduinoJson | Benoit Blanchon | Building JSON payloads |
   | DHT sensor library | Adafruit | Reading DHT22 sensor |
   | Adafruit Unified Sensor | Adafruit | Dependency for DHT library |
   | BH1750 | Christopher Laws | Reading BH1750 lux sensor via I2C |

5. **Update credentials** in `sketch_mar31a/sketch_mar31a.ino`:
   ```cpp
   #define WIFI_SSID     "YourNetworkName"
   #define WIFI_PASSWORD "YourPassword"
   #define SERVER_IP     "192.168.x.x"   // Laptop IP on the same network
   ```
   Find your laptop's IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

6. **Flash to ESP32**
   - Connect via USB, select the correct COM port under `Tools → Port`
   - Click Upload

---

### Next.js Dashboard

```bash
cd plant-tracker
npm install
npm run dev
```

The dashboard will be available at **http://localhost:3000**.

**Optional — Gemini AI Chat:**
Create a `.env.local` file in the `plant-tracker/` directory:
```
GEMINI_API_KEY=your_google_api_key_here
```

---

## 📊 Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | Live sensor cards, health gauge, plant avatar, alerts |
| **Analytics** | `/analytics` | Historical trend charts with 24h / 7d / 30d views |
| **Settings** | `/settings` | Configure plant name, thresholds, and health weights |

---

## 📁 Project Structure

```
microcontroller/
│
├── sketch_mar31a/
│   └── sketch_mar31a.ino        # ESP32 firmware (Arduino C++)
│
├── plant-tracker/                # Next.js web dashboard
│   ├── server.js                 # Custom Node.js server (Socket.io + Next.js)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.local                # Gemini API key (not committed)
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main dashboard page
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── globals.css       # Global styles (Tailwind)
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx      # Trend charts page
│   │   │   ├── settings/
│   │   │   │   └── page.tsx      # Configuration page
│   │   │   └── api/
│   │   │       ├── readings/
│   │   │       │   └── route.ts  # GET historical readings
│   │   │       ├── config/
│   │   │       │   └── route.ts  # GET/POST plant config
│   │   │       └── summary/
│   │   │           └── route.ts  # GET daily summary
│   │   │
│   │   ├── components/
│   │   │   ├── PlantAvatar.tsx   # Animated plant with expressions
│   │   │   ├── HealthScore.tsx   # Color-coded health gauge
│   │   │   ├── SensorCard.tsx    # Individual sensor display + sparkline
│   │   │   ├── AlertBanner.tsx   # Threshold warning banners
│   │   │   └── TrendChart.tsx    # Recharts-based trend visualization
│   │   │
│   │   └── lib/
│   │       ├── socket.ts         # Socket.io client hook
│   │       ├── dataStore.ts      # Server-side data helpers
│   │       └── thresholds.ts     # Default threshold values
│   │
│   ├── data/
│   │   ├── YYYY-MM-DD.json      # Daily sensor readings (auto-created)
│   │   ├── config.json           # Plant settings and thresholds
│   │   ├── touches/              # Touch event logs
│   │   ├── chats/                # Chat history (future)
│   │   └── archive/              # Archived data
│   │
│   └── public/
│       └── sounds/               # Touch reaction audio files
│
└── README.md                     # You are here
```

---

## 🧪 Testing Without ESP32

You can send fake sensor data from your browser's developer console to test the dashboard without hardware:

```js
// Open browser console on http://localhost:3000
const { io } = await import("/socket.io/socket.io.esm.min.js");
const socket = io();

// Send a single reading
socket.emit("sensorData", {
  temp: 25.3,
  humidity: 60,
  soilAnalog: 2000,
  soilDry: false,
  lux: 450,
  touch: false,
  timestamp: Math.floor(Date.now() / 1000)
});

// Simulate a touch event
socket.emit("touchEvent", {
  event: "touch",
  timestamp: Math.floor(Date.now() / 1000)
});
```

You can also loop it to simulate continuous readings:

```js
setInterval(() => {
  socket.emit("sensorData", {
    temp: 22 + Math.random() * 8,
    humidity: 40 + Math.random() * 30,
    soilAnalog: 1500 + Math.random() * 2000,
    soilDry: Math.random() > 0.5,
    lux: 100 + Math.random() * 900,
    touch: false,
    timestamp: Math.floor(Date.now() / 1000)
  });
}, 5000);
```

---

## 🔊 Sound System

The plant avatar plays sounds based on health state and touch events. Place MP3 files in `plant-tracker/public/sounds/`:

```
public/sounds/
├── giggle.mp3          # Touch reaction sound
├── happy-hum.mp3       # Ambient: thriving state (every 30s)
├── calm-breeze.mp3     # Ambient: okay state (every 45s)
├── worried-whimper.mp3 # Ambient: stressed state (every 20s)
├── crying.mp3          # Ambient: critical state (every 10s)
├── chime.mp3           # Alternative touch sound
├── boop.mp3            # Alternative touch sound
└── nature.mp3          # Alternative touch sound
```

| Health State | Ambient Sound | Interval | Visual |
|-------------|--------------|----------|--------|
| Thriving (80-100%) | happy-hum.mp3 | Every 30s | Floating music notes, bouncing, glowing |
| Okay (60-79%) | calm-breeze.mp3 | Every 45s | Gentle sway |
| Stressed (40-59%) | worried-whimper.mp3 | Every 20s | Drooping, concerned face |
| Critical (0-39%) | crying.mp3 | Every 10s | Shivering, floating tears, dramatic phrases |

> **Tip:** Download free sound effects from [Pixabay Sound Effects](https://pixabay.com/sound-effects/) or [Freesound](https://freesound.org/). Keep files short (1-3 seconds). If a sound file is missing, the feature still works — just no audio.

Use the **🔊/🔇 mute button** on the dashboard to toggle all sounds on/off.

---

## 📡 Data Flow (Detailed)

```
┌──────────────────────────────────────────────────────────────────┐
│                        ESP32 FIRMWARE                           │
│                                                                  │
│  DHT22 ──► readTemperature()  ──┐                               │
│  DHT22 ──► readHumidity()    ──┤                                │
│  BH1750 ──► readLightLevel() ──┤    Build JSON     WebSocket    │
│  Soil AO ──► analogRead()    ──┼──► payload    ──► sendTXT()    │
│  Soil DO ──► digitalRead()   ──┤    (every 5s)     42["sensor   │
│  TTP223 ──► interrupt        ──┘                    Data",{..}] │
│            (immediate send)                                      │
└──────────────────────────┬───────────────────────────────────────┘
                           │ WebSocket over WiFi
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    NODE.JS SERVER (server.js)                    │
│                                                                  │
│  Socket.io receives ──► Fix timestamp (Unix epoch)              │
│                     ──► Compute healthScore                      │
│                     ──► Append to data/YYYY-MM-DD.json          │
│                     ──► Broadcast to all browser clients         │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Socket.io
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BROWSER DASHBOARD                           │
│                                                                  │
│  Socket.io receives ──► calculateHealth() with user thresholds  │
│                     ──► Update PlantAvatar (state + animations) │
│                     ──► Update SensorCards (values + sparklines) │
│                     ──► Update HealthScore gauge                 │
│                     ──► Show/hide AlertBanners                   │
│                     ──► Play ambient sounds (if not muted)       │
│                                                                  │
│  Touch event ──► Wiggle animation + speech bubble + sound       │
│  API routes  ──► /api/readings (history), /api/summary (stats)  │
│              ──► /api/config (settings), /api/chat (Gemini)     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Network Requirements

- The **ESP32** and **laptop** must be on the **same WiFi network** (home router or phone hotspot both work)
- The laptop retains **internet access** for the Gemini API (optional feature)
- The ESP32 connects to the laptop's local IP on port **3000** via WebSocket
- If using a phone hotspot, the IP can change between sessions — verify with `ipconfig`

---

## 🛠️ Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Microcontroller | ESP32 (Arduino C++) | Sensor reading + WiFi + WebSocket client |
| Communication | WebSocket / Socket.io | Real-time bidirectional data transfer |
| Web Framework | Next.js 16 | React-based dashboard with SSR |
| UI Styling | Tailwind CSS 4 | Utility-first CSS framework |
| Charts | Recharts | Sensor trend visualizations |
| Runtime | React 19 | UI component library |
| Language | TypeScript | Type-safe frontend code |
| Server | Node.js (custom) | Socket.io server + Next.js handler |
| Storage | JSON files | Daily sensor logs, config, touch events |
| AI (optional) | Google Gemini API | Plant chat assistant |

---

## 📝 Notes & Tips

- **Open-air testing:** All sensors work without a plant. Soil sensor will read "very dry" — that's expected.
- **Serial Monitor:** Set baud rate to **115200** in Arduino IDE for debug output.
- **Graceful fallbacks:** If a sensor is missing or disconnected, the firmware sends default values (0 or -1) instead of crashing.
- **Hotspot IPs change:** If the ESP32 can't connect after switching networks, check the laptop's new IP with `ipconfig` and update `SERVER_IP` in the sketch.
- **Health score weights:** Soil moisture has the highest weight (35%), reflecting its importance for plant health. Adjust in Settings.
- **Data storage:** Readings are stored in daily JSON files under `data/`. Old files can be moved to `data/archive/`.
- **Touch wire:** Longer copper wire = more sensitivity. Wrapping it around the stem works well.
- **USB power:** The ESP32 runs off USB power from your laptop or a phone charger. No additional power supply needed.

---

<p align="center">
  Built with 💚 and a mass of jumper wires
</p>
