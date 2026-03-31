"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { SensorData } from "./thresholds";

export interface UsePlantSocketReturn {
  sensorData: SensorData | null;
  touchTriggered: boolean;
  connected: boolean;
  resetTouch: () => void;
}

export function usePlantSocket(): UsePlantSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [touchTriggered, setTouchTriggered] = useState(false);
  const [connected, setConnected] = useState(false);

  const resetTouch = useCallback(() => {
    setTouchTriggered(false);
  }, []);

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to plant server");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from plant server");
      setConnected(false);
    });

    socket.on("sensorData", (data: SensorData) => {
      setSensorData(data);
    });

    socket.on("touchEvent", () => {
      setTouchTriggered(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { sensorData, touchTriggered, connected, resetTouch };
}
