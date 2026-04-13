"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Reading {
  timestamp: number;
  temp: number;
  humidity: number;
  soilAnalog: number;
  lux: number;
  healthScore: number;
}

interface Stats {
  temp: { avg: number; min: number; max: number };
  humidity: { avg: number; min: number; max: number };
  soil: { avg: number; min: number; max: number };
  lux: { avg: number; min: number; max: number };
  health: { avg: number; min: number; max: number };
  count: number;
}

interface PdfExportData {
  plantName: string;
  range: string;
  stats: Stats;
  readings: Reading[];
  weather?: {
    current?: {
      temp: number | null;
      humidity: number | null;
      windSpeed: number | null;
      cloudCover: number | null;
    };
    daily?: Array<{
      date: string;
      tempMax: number;
      tempMin: number;
      precipitation: number;
    }>;
  };
  careAdvice?: string;
  touchCount?: number;
}

export function exportPlantReportPDF(data: PdfExportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 50;

  // Colors
  const green: [number, number, number] = [34, 197, 94];
  const gray: [number, number, number] = [100, 116, 139];
  const dark: [number, number, number] = [15, 23, 42];

  // ===== HEADER =====
  doc.setFillColor(...green);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PLANT HEALTH TRACKER", 40, 20);

  y = 60;
  doc.setTextColor(...dark);
  doc.setFontSize(22);
  doc.text(data.plantName, 40, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  const now = new Date();
  doc.text(
    `Report generated: ${now.toLocaleString()} • Range: ${data.range.toUpperCase()} • ${data.stats.count} readings`,
    40,
    y
  );
  y += 25;

  // ===== HEALTH SCORE HERO =====
  const healthScore = data.stats.health.avg;
  const healthColor: [number, number, number] =
    healthScore >= 80 ? [34, 197, 94] : healthScore >= 60 ? [132, 204, 22] : healthScore >= 40 ? [234, 179, 8] : [239, 68, 68];
  const healthState =
    healthScore >= 80 ? "THRIVING" : healthScore >= 60 ? "OKAY" : healthScore >= 40 ? "STRESSED" : "CRITICAL";

  doc.setFillColor(...healthColor);
  doc.roundedRect(40, y, pageWidth - 80, 60, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text(`${healthScore.toFixed(0)}%`, 60, y + 42);
  doc.setFontSize(12);
  doc.text(healthState, 160, y + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Overall Health Score", 160, y + 44);
  y += 80;

  // ===== SENSOR STATS TABLE =====
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Sensor Statistics", 40, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Sensor", "Average", "Min", "Max"]],
    body: [
      ["Temperature", `${data.stats.temp.avg.toFixed(1)} °C`, `${data.stats.temp.min.toFixed(1)} °C`, `${data.stats.temp.max.toFixed(1)} °C`],
      ["Humidity", `${data.stats.humidity.avg.toFixed(0)} %`, `${data.stats.humidity.min.toFixed(0)} %`, `${data.stats.humidity.max.toFixed(0)} %`],
      ["Soil Moisture", `${data.stats.soil.avg.toFixed(0)} %`, `${data.stats.soil.min.toFixed(0)} %`, `${data.stats.soil.max.toFixed(0)} %`],
      ["Light", `${data.stats.lux.avg.toFixed(0)} lux`, `${data.stats.lux.min.toFixed(0)} lux`, `${data.stats.lux.max.toFixed(0)} lux`],
      ["Health Score", `${data.stats.health.avg.toFixed(0)} %`, `${data.stats.health.min.toFixed(0)} %`, `${data.stats.health.max.toFixed(0)} %`],
    ],
    headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    margin: { left: 40, right: 40 },
  });

  const lastY1 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  y = (lastY1 ?? y + 100) + 20;

  // ===== WEATHER SECTION =====
  if (data.weather?.current) {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text("Outdoor Weather (Prayagraj)", 40, y);
    y += 15;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    const w = data.weather.current;
    doc.text(
      `Temp: ${w.temp}°C   |   Humidity: ${w.humidity}%   |   Wind: ${w.windSpeed} km/h   |   Clouds: ${w.cloudCover}%`,
      40,
      y
    );
    y += 18;

    if (data.weather.daily && data.weather.daily.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Min", "Max", "Precipitation"]],
        body: data.weather.daily.map((d) => [
          d.date,
          `${d.tempMin.toFixed(0)} °C`,
          `${d.tempMax.toFixed(0)} °C`,
          `${d.precipitation.toFixed(1)} mm`,
        ]),
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 40, right: 40 },
      });
      const lastY2 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
      y = (lastY2 ?? y + 80) + 20;
    }
  }

  // ===== AI CARE ADVICE =====
  if (data.careAdvice) {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text("AI Care Recommendations", 40, y);
    y += 15;

    doc.setFillColor(240, 253, 244);
    const adviceLines = doc.splitTextToSize(data.careAdvice, pageWidth - 100);
    const boxHeight = adviceLines.length * 12 + 16;
    doc.roundedRect(40, y, pageWidth - 80, boxHeight, 6, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(adviceLines, 48, y + 14);
    y += boxHeight + 20;
  }

  // ===== ACTIVITY =====
  if (y > 720) {
    doc.addPage();
    y = 50;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...dark);
  doc.text("Activity", 40, y);
  y += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text(`• Total sensor readings: ${data.stats.count}`, 48, y);
  y += 14;
  if (data.touchCount !== undefined) {
    doc.text(`• Times plant was touched today: ${data.touchCount}`, 48, y);
    y += 14;
  }

  // ===== RECENT READINGS TABLE =====
  if (data.readings.length > 0) {
    if (y > 600) {
      doc.addPage();
      y = 50;
    }
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text("Recent Readings (last 20)", 40, y);
    y += 10;

    const recentReadings = data.readings.slice(-20).reverse();
    autoTable(doc, {
      startY: y,
      head: [["Time", "Temp (°C)", "Humidity (%)", "Soil (raw)", "Light (lux)", "Health (%)"]],
      body: recentReadings.map((r) => [
        new Date(r.timestamp * 1000).toLocaleTimeString(),
        r.temp.toFixed(1),
        r.humidity.toFixed(0),
        r.soilAnalog.toString(),
        r.lux.toFixed(0),
        (r.healthScore ?? 0).toFixed(0),
      ]),
      headStyles: { fillColor: green, textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 40, right: 40 },
    });
  }

  // ===== FOOTER on every page =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(
      `Plant Health Tracker • Generated ${now.toLocaleDateString()} • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  // Save
  const filename = `plant-report-${data.plantName.replace(/\s+/g, "-")}-${now.toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
