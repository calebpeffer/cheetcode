import { NextResponse } from "next/server";
import { submitLead } from "../../../server/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      github: string;
      email: string;
      xHandle?: string;
      flag?: string;
      sessionId: string;
    };
    const result = submitLead(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to submit lead" },
      { status: 400 },
    );
  }
}
