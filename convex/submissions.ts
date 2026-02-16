import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { PROBLEM_BANK } from "../server/problems";
import { computeElo, getDifficultyBonus } from "../src/lib/scoring";

/**
 * recordResults — called by the Next.js /api/finish route AFTER it has
 * validated submissions with QuickJS. This mutation trusts the validated
 * solvedProblemIds, computes ELO, and upserts the leaderboard.
 *
 * exploitBonus is computed by the API route from detected exploit patterns
 * (e.g., negative time, hidden flag). It's a capped additive bonus.
 */
export const recordResults = mutation({
  args: {
    sessionId: v.id("sessions"),
    github: v.string(),
    solvedProblemIds: v.array(v.string()),
    timeElapsedMs: v.number(),
    exploitBonus: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify session exists
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("session not found");

    const solvedCount = args.solvedProblemIds.length;
    // timeElapsedMs is already clamped by the API route
    const timeRemainingSecs = Math.max(0, 45 - Math.floor(args.timeElapsedMs / 1000));

    const solvedSet = new Set(args.solvedProblemIds);
    const difficultyBonus = getDifficultyBonus(
      PROBLEM_BANK.filter((p) => solvedSet.has(p.id)).map((p) => ({
        solved: true,
        difficulty: p.difficulty,
      })),
    );

    const baseElo = computeElo({ solvedCount, timeRemainingSecs, difficultyBonus });
    // Exploit bonus is additive and capped at the API layer
    const elo = baseElo + (args.exploitBonus ?? 0);

    // Upsert leaderboard — always increment attempts, only update score if better
    const existing = await ctx.db
      .query("leaderboard")
      .withIndex("by_github", (q) => q.eq("github", args.github))
      .first();

    if (!existing) {
      // First attempt for this user
      if (solvedCount > 0 || elo > 0) {
        await ctx.db.insert("leaderboard", {
          github: args.github,
          solved: solvedCount,
          timeSecs: Math.floor(args.timeElapsedMs / 1000),
          elo,
          sessionId: args.sessionId,
          attempts: 1,
        });
      }
    } else {
      // Increment attempt count, update score only if this beats their best
      const updates: Record<string, unknown> = {
        attempts: (existing.attempts ?? 1) + 1,
      };
      if (elo > existing.elo) {
        Object.assign(updates, {
          solved: solvedCount,
          timeSecs: Math.floor(args.timeElapsedMs / 1000),
          elo,
          sessionId: args.sessionId,
        });
      }
      await ctx.db.patch(existing._id, updates);
    }

    // Compute rank — ELO desc, then attempts asc (fewer attempts = higher rank)
    const top = await ctx.db
      .query("leaderboard")
      .withIndex("by_elo")
      .order("desc")
      .take(100);
    const sorted = top.sort((a, b) => {
      if (b.elo !== a.elo) return b.elo - a.elo;
      return (a.attempts ?? 1) - (b.attempts ?? 1);
    });
    // Find where this user's current score + attempts lands
    const userAttempts = (existing?.attempts ?? 0) + 1;
    const rankIdx = sorted.findIndex(
      (row) => row.elo < elo || (row.elo === elo && (row.attempts ?? 1) > userAttempts),
    );
    const rank = rankIdx === -1 ? sorted.length + 1 : rankIdx + 1;

    return { elo, solved: solvedCount, rank, timeRemaining: timeRemainingSecs };
  },
});

/** Public query so the /api/finish route can verify sessions */
export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});
