import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { resolveGitHubFromHeader } from "../../../lib/github-auth";
import { auth } from "../../../../auth";

/**
 * POST /api/session
 * Creates a game session. Supports two auth methods:
 *   1. GitHub PAT via Authorization header (API agents)
 *   2. OAuth session cookie (browser users)
 */
export async function POST(request: Request) {
  // Try PAT first (API agents), then fall back to OAuth session (browser)
  let github = await resolveGitHubFromHeader(request);

  if (!github) {
    const session = await auth();
    github = (session?.user as { githubUsername?: string })?.githubUsername ?? null;
  }

  if (!github) {
    return NextResponse.json(
      {
        error: "GitHub authentication required",
        hint: "Send a GitHub PAT via Authorization: Bearer <token>, or sign in with OAuth",
      },
      { status: 401 },
    );
  }

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const result = await convex.action(api.sessions.create, {
      secret: process.env.CONVEX_MUTATION_SECRET!,
      github,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create session";
    const status = message.includes("rate limited") ? 429 : 500;
    console.error("/api/session error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
