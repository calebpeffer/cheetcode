import { NextResponse } from "next/server";
import { getSessionSolutions } from "../../../../server/store";

export async function POST(request: Request) {
  // Keep this endpoint dev-only so production gameplay is unaffected.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const solutions = getSessionSolutions(body.sessionId);
    return NextResponse.json({ solutions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "auto solve failed" },
      { status: 400 },
    );
  }
}
