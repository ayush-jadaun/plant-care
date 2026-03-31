import { NextRequest, NextResponse } from "next/server";
import { getDailySummary } from "@/lib/dataStore";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Provide date as YYYY-MM-DD" }, { status: 400 });
  }
  const summary = getDailySummary(date);
  if (!summary) {
    return NextResponse.json({ error: "No data for this date" }, { status: 404 });
  }
  return NextResponse.json(summary);
}
