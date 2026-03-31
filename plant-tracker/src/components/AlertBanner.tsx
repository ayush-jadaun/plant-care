"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

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
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <Alert
          key={alert}
          className="border-sensor-rose/20 bg-sensor-rose/5"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-4 text-sensor-rose shrink-0" />
            <AlertDescription className="flex-1 text-sensor-rose/90 text-sm">
              {alert}
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => dismiss(alert)}
              className="text-sensor-rose/40 hover:text-sensor-rose hover:bg-sensor-rose/10"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
