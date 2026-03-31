import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const DATA_DIR = path.join(__dirname, "data");

function getTodayFileName() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.json`;
}

function appendToFile(dir, fileName, entry) {
  const dirPath = path.join(DATA_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, fileName);
  let data = [];
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      data = [];
    }
  }
  data.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function appendReading(entry) {
  const filePath = path.join(DATA_DIR, getTodayFileName());
  let data = [];
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      data = [];
    }
  }
  data.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function computeHealthScore(data) {
  const thresholds = { temp: { min: 18, max: 28 }, humidity: { min: 40, max: 70 }, soil: { min: 40, max: 70 }, lux: { min: 200, max: 1000 } };
  const weights = { soil: 0.35, temp: 0.25, humidity: 0.20, lux: 0.20 };

  function score(value, min, max) {
    if (value >= min && value <= max) return 100;
    const range = max - min;
    const distance = value < min ? min - value : value - max;
    return Math.max(0, 100 - (distance / range) * 100);
  }

  const soilPct = Math.max(0, Math.min(100, ((3500 - data.soilAnalog) / (3500 - 1500)) * 100));

  const s = {
    temp: score(data.temp, thresholds.temp.min, thresholds.temp.max),
    humidity: score(data.humidity, thresholds.humidity.min, thresholds.humidity.max),
    soil: score(soilPct, thresholds.soil.min, thresholds.soil.max),
    lux: score(data.lux, thresholds.lux.min, thresholds.lux.max),
  };

  return Math.round(s.temp * weights.temp + s.humidity * weights.humidity + s.soil * weights.soil + s.lux * weights.lux);
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  let latestReading = null;

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    if (latestReading) {
      socket.emit("sensorData", latestReading);
    }

    socket.on("sensorData", (data) => {
      console.log("Sensor data received:", data);
      const reading = { ...data, timestamp: Math.floor(Date.now() / 1000), healthScore: computeHealthScore(data), receivedAt: Date.now() };
      latestReading = reading;
      appendReading(reading);
      io.emit("sensorData", reading);
    });

    socket.on("touchEvent", (data) => {
      console.log("Touch event received:", data);
      appendToFile("touches", getTodayFileName(), {
        timestamp: data.timestamp || Date.now(),
      });
      io.emit("touchEvent", data);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Plant Tracker running on http://${hostname}:${port}`);
  });
});
