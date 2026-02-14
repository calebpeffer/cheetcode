import { NextResponse } from "next/server";
import { createSession } from "../../../server/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { github?: string };
    const result = createSession(body.github ?? "");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to create session" },
      { status: 400 },
    );
  }
}
