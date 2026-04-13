"use client";

import { useState, useRef, useEffect } from "react";
import type { HealthResult, SensorData } from "@/lib/thresholds";
import { soilAnalogToPercent } from "@/lib/thresholds";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Trash2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface ChatPanelProps {
  sensorData: SensorData | null;
  healthResult: HealthResult | null;
  plantName: string;
}

export default function ChatPanel({ sensorData, healthResult, plantName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.history)) {
          setMessages(
            data.history.map((m: { role: string; content: string }) => ({
              role: m.role === "user" ? "user" : "model",
              content: m.content,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function clearChat() {
    if (clearing || messages.length === 0) return;
    if (!confirm("Clear all chat history with your plant?")) return;
    setClearing(true);
    try {
      await fetch("/api/chat", { method: "DELETE" });
      setMessages([]);
    } catch {}
    setClearing(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    // Build context — use fallbacks if sensor data hasn't arrived yet
    const context = {
      plantName,
      temp: sensorData?.temp ?? 0,
      humidity: sensorData?.humidity ?? 0,
      soilMoisture: sensorData ? soilAnalogToPercent(sensorData.soilAnalog) : 0,
      lux: sensorData?.lux ?? 0,
      healthScore: healthResult?.score ?? 0,
      healthState: healthResult?.state ?? "okay",
      alerts: healthResult?.alerts ?? [],
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, context }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "model", content: data.response || "..." },
      ]);
    } catch (err) {
      console.error("Chat send error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "model", content: "My roots are tangled... try again? 🌱" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col h-[400px]">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Chat with {plantName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={clearChat}
          disabled={clearing || messages.length === 0}
          title="Clear chat history"
          className="text-muted-foreground hover:text-sensor-rose hover:bg-sensor-rose/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-3xl mb-2">🌱</span>
            <p className="text-sm text-muted-foreground">Say hi to {plantName}!</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Powered by Gemini 2.5 Flash</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-primary/10 text-primary rounded-br-sm border border-primary/20"
                  : "bg-muted/50 text-foreground rounded-bl-sm border border-border/50"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/50 border border-border/50 px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-muted-foreground">
              <span className="animate-pulse">thinking with my leaves...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <form
        className="p-3 border-t border-border/50 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Talk to ${plantName}...`}
          className="flex-1"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} size="icon">
          <Send className="size-4" />
        </Button>
      </form>
    </Card>
  );
}
