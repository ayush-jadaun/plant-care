#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ============ CONFIGURATION ============
#define WIFI_SSID     "OnePlus Nord 4"
#define WIFI_PASSWORD "datahelper"
#define SERVER_IP     "10.204.156.175"  // Your laptop's IP on the network
#define SERVER_PORT   3000

// Feature flags — set to 0 to disable a sensor entirely
// Set to 1 ONLY when the sensor is physically wired up
#define ENABLE_BH1750 1   // Disabled — I2C bus is stuck, fix wiring first
#define ENABLE_DHT22  1
#define ENABLE_SOIL   1
#define ENABLE_TOUCH  1

// ============ PIN DEFINITIONS ============
#define DHT_PIN       4       // DHT22 data pin
#define DHT_TYPE      DHT22
#define TOUCH_PIN     15      // TTP223 signal pin (interrupt-capable)
#define SOIL_AO_PIN   34      // Soil sensor analog output (ADC1)
#define SOIL_DO_PIN   27      // Soil sensor digital output
// BH1750: SDA = GPIO 21, SCL = GPIO 22 (default I2C)

// ============ TIMING ============
#define SENSOR_INTERVAL 5000  // Read sensors every 5 seconds
#define RECONNECT_INTERVAL 5000

// ============ OBJECTS ============
DHT dht(DHT_PIN, DHT_TYPE);
BH1750 lightMeter;
WebSocketsClient webSocket;

// ============ STATE ============
volatile bool touchDetected = false;
unsigned long lastSensorRead = 0;
unsigned long lastReconnect = 0;
bool wsConnected = false;
unsigned long lastTouchTime = 0;
bool bh1750Present = false;

// Touch interrupt handler
void IRAM_ATTR onTouch() {
  touchDetected = true;
}

void setup() {
  // Disable brownout detector to prevent resets from voltage dips
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(1000);  // Let serial stabilize
  Serial.println();
  Serial.println("=== Plant Health Tracker ===");
  Serial.flush();
  delay(500);

  // Pin setup
  Serial.println("Setting up pins...");
  Serial.flush();
#if ENABLE_TOUCH
  pinMode(TOUCH_PIN, INPUT);
#endif
#if ENABLE_SOIL
  pinMode(SOIL_DO_PIN, INPUT);
#endif
  delay(100);

#if ENABLE_TOUCH
  // Attach touch interrupt
  Serial.println("Attaching touch interrupt...");
  Serial.flush();
  attachInterrupt(digitalPinToInterrupt(TOUCH_PIN), onTouch, RISING);
  delay(100);
#endif

#if ENABLE_DHT22
  // Initialize DHT
  Serial.println("Initializing DHT22...");
  Serial.flush();
  dht.begin();
  delay(500);
#else
  Serial.println("DHT22 disabled, skipping");
  Serial.flush();
#endif

#if ENABLE_BH1750
  // Initialize I2C and BH1750 with safe probing
  Serial.println("Initializing I2C...");
  Serial.flush();
  Wire.begin();
  delay(200);

  // Probe for BH1750 at 0x23 first (safer than calling begin() blindly)
  Serial.println("Probing BH1750 at 0x23...");
  Serial.flush();
  Wire.beginTransmission(0x23);
  uint8_t err = Wire.endTransmission();
  Serial.printf("I2C probe result: %d\n", err);
  Serial.flush();

  if (err == 0) {
    Serial.println("BH1750 responding, calling begin()...");
    Serial.flush();
    if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
      Serial.println("BH1750 initialized OK");
      bh1750Present = true;
    } else {
      Serial.println("BH1750 begin() failed");
    }
  } else {
    Serial.println("BH1750 not responding on 0x23 — check wiring (SDA=21, SCL=22)");
  }
  delay(200);
#else
  Serial.println("BH1750 disabled (ENABLE_BH1750 = 0), skipping I2C");
  Serial.flush();
#endif

  // Connect to WiFi
  Serial.println("Starting WiFi connection...");
  Serial.flush();
  connectWiFi();

  // Connect WebSocket
  Serial.println("Starting WebSocket client...");
  Serial.flush();
  webSocket.begin(SERVER_IP, SERVER_PORT, "/socket.io/?EIO=4&transport=websocket");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(RECONNECT_INTERVAL);

  Serial.println("Setup complete!");
  Serial.flush();
}

void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi connection failed! Restarting...");
    ESP.restart();
  }
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket disconnected");
      wsConnected = false;
      break;
    case WStype_CONNECTED:
      Serial.println("WebSocket transport connected, waiting for handshake...");
      // Don't set wsConnected yet — wait for Socket.io handshake
      break;
    case WStype_TEXT: {
      String msg = String((char*)payload);

      if (msg.startsWith("0")) {
        // Server sent OPEN packet — respond with CONNECT to default namespace
        Serial.println("Socket.io OPEN received, sending CONNECT...");
        webSocket.sendTXT("40");
      }
      else if (msg.startsWith("40")) {
        // Server confirmed CONNECT — now we're ready
        Serial.println("Socket.io connected! Ready to send data.");
        wsConnected = true;
      }
      else if (msg == "2") {
        // Server PING — respond with PONG
        webSocket.sendTXT("3");
      }
      else {
        Serial.printf("Received: %s\n", payload);
      }
      break;
    }
  }
}

void sendSensorData() {
  float temp = 0;
  float humidity = 0;
  bool dhtOk = false;

#if ENABLE_DHT22
  temp = dht.readTemperature();
  humidity = dht.readHumidity();
  dhtOk = !isnan(temp) && !isnan(humidity);
  if (!dhtOk) {
    Serial.println("DHT read failed, sending 0");
    temp = 0;
    humidity = 0;
  }
#endif

  // Read BH1750 only if it was detected during setup
  float lux = 0;
  if (bh1750Present) {
    lux = lightMeter.readLightLevel();
    if (lux < 0) {
      Serial.println("BH1750 read failed, sending 0");
      lux = 0;
    }
  }

  int soilAnalog = 0;
  bool soilDry = false;
#if ENABLE_SOIL
  soilAnalog = analogRead(SOIL_AO_PIN);
  soilDry = digitalRead(SOIL_DO_PIN) == HIGH;
#endif

  // Build JSON — always send, even with partial data
  StaticJsonDocument<256> doc;
  doc["temp"] = dhtOk ? round(temp * 10.0) / 10.0 : 0;
  doc["humidity"] = dhtOk ? round(humidity * 10.0) / 10.0 : 0;
  doc["soilAnalog"] = soilAnalog;
  doc["soilDry"] = soilDry;
  doc["lux"] = round(lux * 10.0) / 10.0;
  doc["touch"] = false;
  doc["timestamp"] = millis() / 1000;  // Uptime — server replaces with real Unix timestamp

  String jsonStr;
  serializeJson(doc, jsonStr);

  // Socket.io message format: 42["sensorData",{...}]
  String socketMsg = "42[\"sensorData\"," + jsonStr + "]";

  if (wsConnected) {
    webSocket.sendTXT(socketMsg);
    Serial.printf("Sent: T=%.1f H=%.1f S=%d L=%.1f\n", temp, humidity, soilAnalog, lux);
  } else {
    Serial.println("Not connected, data not sent");
  }
}

void sendTouchEvent() {
  StaticJsonDocument<64> doc;
  doc["event"] = "touch";
  doc["timestamp"] = millis() / 1000;  // Uptime — server replaces with real Unix timestamp

  String jsonStr;
  serializeJson(doc, jsonStr);

  String socketMsg = "42[\"touchEvent\"," + jsonStr + "]";

  if (wsConnected) {
    webSocket.sendTXT(socketMsg);
    Serial.println("Touch event sent!");
  }
}

void loop() {
  webSocket.loop();

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    connectWiFi();
  }

  unsigned long now = millis();

  // Handle touch event (from interrupt) with non-blocking debounce
  if (touchDetected && (now - lastTouchTime >= 500)) {
    touchDetected = false;
    lastTouchTime = now;
    sendTouchEvent();
  }

  // Regular sensor readings
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    sendSensorData();
  }
}
