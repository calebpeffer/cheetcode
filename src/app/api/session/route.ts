import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { resolveGitHubFromHeader } from "../../../lib/github-auth";

/**
 * POST /api/session
 * Creates a game session for API-based agents using a GitHub PAT.
 *
 * Auth: `Authorization: Bearer <github-personal-access-token>`
 * Returns: { sessionId, startedAt, expiresAt, problems }
 */
export async function POST(request: Request) {
  // Verify GitHub identity from PAT
  const github = await resolveGitHubFromHeader(request);
  if (!github) {
    return NextResponse.json(
      {
        error: "GitHub authentication required",
        hint: "Send a GitHub Personal Access Token via Authorization: Bearer <token>",
      },
      { status: 401 },
    );
  }

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const result = await convex.mutation(api.sessions.create, { github });
    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/session error:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
