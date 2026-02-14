import { NextResponse } from "next/server";
import { getLeaderboard } from "../../../server/store";

export async function GET() {
  return NextResponse.json({ entries: getLeaderboard() });
}
