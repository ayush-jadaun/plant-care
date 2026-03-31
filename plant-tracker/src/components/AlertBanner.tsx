"use client";

import { useState } from "react";

interface AlertBannerProps {
  alerts: string[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a));
  if (visibleAlerts.length === 0) return null;

  function dismiss(alert: string) {
    setDismissed((prev) => new Set([...prev, alert]));
    // Auto-undismiss after 60s so it can reappear if still an issue
    setTimeout(() => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(alert);
        return next;
      });
    }, 60000);
  }

  return (
    <div className="w-full">
      {visibleAlerts.map((alert) => (
        <div
          key={alert}
          className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse"
        >
          <span className="text-xl">&#9888;</span>
          <span className="text-sm font-medium flex-1">{alert}</span>
          <button
            onClick={() => dismiss(alert)}
            className="text-red-400/50 hover:text-red-400 text-lg leading-none px-1"
            title="Dismiss for 60s"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
