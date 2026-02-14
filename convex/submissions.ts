import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { PROBLEM_BANK } from "../server/problems";
import { computeElo, getDifficultyBonus } from "../src/lib/scoring";

/**
 * recordResults — called by the Next.js /api/finish route AFTER it has
 * validated submissions with QuickJS. This mutation trusts the validated
 * solvedProblemIds, computes ELO, and upserts the leaderboard.
 *
 * Validation happens on the same server as the API route (in-process QuickJS
 * sandbox), so there's no cross-origin issue.
 */
export const recordResults = mutation({
  args: {
    sessionId: v.id("sessions"),
    github: v.string(),
    solvedProblemIds: v.array(v.string()),
    timeElapsedMs: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify session exists
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("session not found");

    const solvedCount = args.solvedProblemIds.length;
    const timeRemainingSecs = Math.max(0, 45 - Math.floor(args.timeElapsedMs / 1000));

    const solvedSet = new Set(args.solvedProblemIds);
    const difficultyBonus = getDifficultyBonus(
      PROBLEM_BANK.filter((p) => solvedSet.has(p.id)).map((p) => ({
        solved: true,
        difficulty: p.difficulty,
      })),
    );

    const elo = computeElo({ solvedCount, timeRemainingSecs, difficultyBonus });

    // Upsert leaderboard — only if this score beats existing
    if (solvedCount > 0) {
      const existing = await ctx.db
        .query("leaderboard")
        .withIndex("by_github", (q) => q.eq("github", args.github))
        .first();

      const row = {
        github: args.github,
        solved: solvedCount,
        timeSecs: Math.floor(args.timeElapsedMs / 1000),
        elo,
        sessionId: args.sessionId,
      };

      if (!existing) {
        await ctx.db.insert("leaderboard", row);
      } else if (elo > existing.elo) {
        await ctx.db.patch(existing._id, row);
      }
    }

    // Compute rank
    const top = await ctx.db
      .query("leaderboard")
      .withIndex("by_elo")
      .order("desc")
      .take(100);
    const rankIdx = top.findIndex((row) => row.elo <= elo);
    const rank = rankIdx === -1 ? top.length + 1 : rankIdx + 1;

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
