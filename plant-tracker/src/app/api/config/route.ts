import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/dataStore";

export async function GET() {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  // Basic validation
  if (typeof body.plantName !== "string" || body.plantName.length > 50) {
    return NextResponse.json({ error: "Invalid plantName" }, { status: 400 });
  }
  if (!body.thresholds || !body.weights) {
    return NextResponse.json({ error: "Missing thresholds or weights" }, { status: 400 });
  }
  const validSounds = ["chime", "boop", "nature", "giggle"];
  if (!validSounds.includes(body.touchSound)) {
    return NextResponse.json({ error: "Invalid touchSound" }, { status: 400 });
  }

  // Sanitize plantName to prevent XSS
  body.plantName = body.plantName.replace(/[<>"'&]/g, "");

  writeConfig(body);
  return NextResponse.json({ success: true });
}
