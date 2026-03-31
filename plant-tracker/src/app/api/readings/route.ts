import { NextRequest, NextResponse } from "next/server";
import { getReadingsForRange } from "@/lib/dataStore";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") || "24h";
  if (!["24h", "7d", "30d"].includes(range)) {
    return NextResponse.json({ error: "Invalid range. Use 24h, 7d, or 30d" }, { status: 400 });
  }
  const readings = getReadingsForRange(range);
  return NextResponse.json(readings);
}
