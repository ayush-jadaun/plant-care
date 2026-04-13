"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlantAvatarProps {
  state: "thriving" | "okay" | "stressed" | "critical";
  touchTriggered: boolean;
  onTouchAnimationEnd: () => void;
  touchSound?: string;
  muted: boolean;
}

const TOUCH_PHRASES = [
  "Hey! That tickles! 🌿",
  "Ooh, gentle please! 🌱",
  "I'm photosynthesizing here! ☀️",
  "Do I look like a petting zoo? 🌵",
  "That's my good leaf! 💚",
  "Whee! Do it again! 🎉",
  "Watch the stems, buddy! 🌾",
  "I felt that in my roots! 🌳",
];

const MOOD_PHRASES: Record<string, string[]> = {
  thriving: [
    "Life is good! 🌞",
    "I'm glowing today! ✨",
    "Best. Light. Ever. ☀️",
    "Feeling so hydrated! 💧",
    "~humming happily~ 🎶",
  ],
  okay: [
    "I'm doing alright 😌",
    "Could be better, could be worse 🌱",
    "Just vibing 🍃",
  ],
  stressed: [
    "Something's not right... 😟",
    "I don't feel so good 🥺",
    "Help me please? 💔",
    "My leaves are drooping 🥀",
  ],
  critical: [
    "I'M DYING OVER HERE! 😭",
    "WATER! PLEASE! 💀",
    "Is anyone there?! 😫",
    "This is NOT okay! 🆘",
    "I can't take much more... 😢",
    "*sobbing in plant* 😭",
  ],
};

const AMBIENT_SOUNDS: Record<string, { file: string; volume: number; interval: number }> = {
  thriving: { file: "happy-hum", volume: 0.15, interval: 30000 },
  okay: { file: "calm-breeze", volume: 0.1, interval: 45000 },
  stressed: { file: "worried-whimper", volume: 0.2, interval: 20000 },
  critical: { file: "crying", volume: 0.3, interval: 10000 },
};

const NOTE_SYMBOLS = ["♪", "♫", "♬", "♩"];
const CRY_SYMBOLS = ["💧", "😢", "💦"];

const stateConfig = {
  thriving: { hex: "#34d399", glow: "rgba(52, 211, 153, 0.25)" },
  okay: { hex: "#a3e635", glow: "rgba(163, 230, 53, 0.15)" },
  stressed: { hex: "#fbbf24", glow: "rgba(251, 191, 36, 0.15)" },
  critical: { hex: "#fb7185", glow: "rgba(251, 113, 133, 0.2)" },
};

export default function PlantAvatar({ state, touchTriggered, onTouchAnimationEnd, touchSound = "giggle", muted }: PlantAvatarProps) {
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [showTouch, setShowTouch] = useState(false);
  const touchSoundRef = useRef<HTMLAudioElement | null>(null);
  const ambientSoundRef = useRef<HTMLAudioElement | null>(null);
  const [floatingNotes, setFloatingNotes] = useState<{ id: number; x: number; symbol: string }[]>([]);
  const noteIdRef = useRef(0);
  const [prevState, setPrevState] = useState(state);

  const playAmbientSound = useCallback((soundFile: string, volume: number) => {
    if (muted) return;
    try {
      // Stop any currently playing ambient sound before starting a new one
      if (ambientSoundRef.current) {
        ambientSoundRef.current.pause();
        ambientSoundRef.current.currentTime = 0;
      }
      ambientSoundRef.current = new Audio(`/sounds/${soundFile}.mp3`);
      ambientSoundRef.current.volume = volume;
      ambientSoundRef.current.play().catch(() => {});
    } catch {}
  }, [muted]);

  // When muted changes to true, stop all currently playing sounds
  useEffect(() => {
    if (muted) {
      if (ambientSoundRef.current) {
        ambientSoundRef.current.pause();
        ambientSoundRef.current.currentTime = 0;
      }
      if (touchSoundRef.current) {
        touchSoundRef.current.pause();
        touchSoundRef.current.currentTime = 0;
      }
    }
  }, [muted]);

  useEffect(() => {
    if (state !== prevState) {
      setPrevState(state);
      const phrases = MOOD_PHRASES[state];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      setSpeechBubble(phrase);

      const ambient = AMBIENT_SOUNDS[state];
      playAmbientSound(ambient.file, ambient.volume);

      const timer = setTimeout(() => setSpeechBubble(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [state, prevState, playAmbientSound]);

  useEffect(() => {
    const ambient = AMBIENT_SOUNDS[state];
    const interval = setInterval(() => {
      const phrases = MOOD_PHRASES[state];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      setSpeechBubble(phrase);
      setTimeout(() => setSpeechBubble(null), 3000);
      playAmbientSound(ambient.file, ambient.volume);
    }, ambient.interval);
    return () => clearInterval(interval);
  }, [state, playAmbientSound]);

  useEffect(() => {
    if (touchTriggered) {
      const phrase = TOUCH_PHRASES[Math.floor(Math.random() * TOUCH_PHRASES.length)];
      setSpeechBubble(phrase);
      setShowTouch(true);

      if (!muted) {
        try {
          touchSoundRef.current = new Audio(`/sounds/${touchSound}.mp3`);
          touchSoundRef.current.volume = 0.5;
          touchSoundRef.current.play().catch(() => {});
        } catch {}
      }

      const timer = setTimeout(() => {
        setSpeechBubble(null);
        setShowTouch(false);
        onTouchAnimationEnd();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [touchTriggered, onTouchAnimationEnd, touchSound, muted]);

  useEffect(() => {
    if (state !== "thriving" && state !== "critical") {
      setFloatingNotes([]);
      return;
    }
    const symbols = state === "thriving" ? NOTE_SYMBOLS : CRY_SYMBOLS;
    const speed = state === "thriving" ? 1500 : 2000;

    const interval = setInterval(() => {
      const id = noteIdRef.current++;
      const x = 30 + Math.random() * 40;
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      setFloatingNotes((prev) => [...prev.slice(-5), { id, x, symbol }]);
    }, speed);
    return () => clearInterval(interval);
  }, [state]);

  const plantEmoji = {
    thriving: "🌿",
    okay: "🌱",
    stressed: "🥀",
    critical: "🍂",
  }[state];

  const faceEmoji = {
    thriving: "😊",
    okay: "😌",
    stressed: "😟",
    critical: "😫",
  }[state];

  const config = stateConfig[state];

  const animationClass = {
    thriving: "animate-bounce-slow",
    okay: "animate-sway",
    stressed: "animate-droop",
    critical: "animate-shiver",
  }[state];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible">
      <CardContent className="relative flex flex-col items-center py-8">
        {/* Floating symbols */}
        {floatingNotes.map((note) => (
          <span
            key={note.id}
            className="absolute text-xl pointer-events-none animate-float-up opacity-60"
            style={{
              left: `${note.x}%`,
              bottom: "70%",
              color: state === "critical" ? config.hex : config.hex,
            }}
          >
            {note.symbol}
          </span>
        ))}

        {/* Speech bubble */}
        {speechBubble && (
          <div
            className="absolute -top-4 bg-card border border-border/50 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm font-medium shadow-xl animate-pop-in z-10 max-w-[250px] text-center"
          >
            {speechBubble}
          </div>
        )}

        {/* Plant container with glow */}
        <div
          className={`relative text-center ${animationClass} ${showTouch ? "animate-wiggle" : ""}`}
          style={{
            filter: `drop-shadow(0 0 24px ${config.glow})`,
            transition: "filter 1s ease",
          }}
        >
          <div className="relative">
            <span className="text-8xl select-none">{plantEmoji}</span>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-4xl select-none">
              🪴
            </span>
          </div>
          <div className="mt-2 text-3xl">{faceEmoji}</div>
        </div>

        <Badge
          variant="outline"
          className="mt-4 border-transparent text-xs font-semibold uppercase tracking-widest"
          style={{
            backgroundColor: `color-mix(in oklch, ${config.hex}, transparent 88%)`,
            color: config.hex,
          }}
        >
          {state}
        </Badge>

        <style jsx>{`
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes sway {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(2deg); }
            75% { transform: rotate(-2deg); }
          }
          @keyframes droop {
            0%, 100% { transform: rotate(0deg) translateY(0); }
            50% { transform: rotate(3deg) translateY(3px); }
          }
          @keyframes shiver {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-3px); }
            75% { transform: translateX(3px); }
          }
          @keyframes wiggle {
            0%, 100% { transform: rotate(0deg); }
            20% { transform: rotate(-10deg); }
            40% { transform: rotate(10deg); }
            60% { transform: rotate(-5deg); }
            80% { transform: rotate(5deg); }
          }
          @keyframes float-up {
            0% { opacity: 0.6; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-80px) scale(1.3); }
          }
          @keyframes pop-in {
            0% { opacity: 0; transform: scale(0.5); }
            100% { opacity: 1; transform: scale(1); }
          }
          .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
          .animate-sway { animation: sway 4s ease-in-out infinite; }
          .animate-droop { animation: droop 5s ease-in-out infinite; }
          .animate-shiver { animation: shiver 0.3s ease-in-out infinite; }
          .animate-wiggle { animation: wiggle 0.5s ease-in-out; }
          .animate-float-up { animation: float-up 2s ease-out forwards; }
          .animate-pop-in { animation: pop-in 0.3s ease-out; }
        `}</style>
      </CardContent>
    </Card>
  );
}
