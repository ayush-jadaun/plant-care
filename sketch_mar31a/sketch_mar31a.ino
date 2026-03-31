#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>

// ============ CONFIGURATION ============
#define WIFI_SSID     "OnePlus Nord 4"
#define WIFI_PASSWORD "datahelper"
#define SERVER_IP     "10.48.182.175"  // Your laptop's IP on the network
#define SERVER_PORT   3000

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

// Touch interrupt handler
void IRAM_ATTR onTouch() {
  touchDetected = true;
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Plant Health Tracker ===");

  // Pin setup
  pinMode(TOUCH_PIN, INPUT);
  pinMode(SOIL_DO_PIN, INPUT);

  // Attach touch interrupt
  attachInterrupt(digitalPinToInterrupt(TOUCH_PIN), onTouch, RISING);

  // Initialize sensors
  dht.begin();
  Wire.begin();
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 initialized");
  } else {
    Serial.println("BH1750 init failed!");
  }

  // Connect to WiFi
  connectWiFi();

  // Connect WebSocket
  webSocket.begin(SERVER_IP, SERVER_PORT, "/socket.io/?EIO=4&transport=websocket");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(RECONNECT_INTERVAL);
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
  // Read DHT22 (sends -1 if not connected)
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  bool dhtOk = !isnan(temp) && !isnan(humidity);
  if (!dhtOk) {
    Serial.println("DHT read failed, sending defaults");
    temp = -1;
    humidity = -1;
  }

  // Read BH1750 (returns -1 or -2 if not connected)
  float lux = lightMeter.readLightLevel();
  if (lux < 0) {
    Serial.println("BH1750 read failed, sending 0");
    lux = 0;
  }

  // Read soil sensor (analog reads noise ~0-100 if not connected)
  int soilAnalog = analogRead(SOIL_AO_PIN);
  bool soilDry = digitalRead(SOIL_DO_PIN) == HIGH;

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
