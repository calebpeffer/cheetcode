import { NextResponse } from "next/server";
import { submitResults } from "../../../server/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      github: string;
      submissions: { problemId: string; code: string }[];
      timeElapsed: number;
    };
    const result = await submitResults(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to submit" },
      { status: 400 },
    );
  }
}
