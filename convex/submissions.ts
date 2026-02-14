import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { PROBLEM_BANK } from "../server/problems";
import { computeElo, getDifficultyBonus } from "../src/lib/scoring";
import { validateSubmission } from "../worker/index";

type SubmissionPayload = {
  problemId: string;
  code: string;
};

async function validateWithWorker(
  payload: SubmissionPayload,
): Promise<{ passed: boolean }> {
  const problem = PROBLEM_BANK.find((item) => item.id === payload.problemId);
  if (!problem) {
    return { passed: false };
  }

  const url = process.env.WORKER_URL;
  if (!url) {
    return validateSubmission({ code: payload.code, testCases: problem.testCases });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: payload.code,
        testCases: problem.testCases,
      }),
    });

    if (!response.ok) {
      return { passed: false };
    }

    const data = (await response.json()) as { passed?: boolean };
    return { passed: Boolean(data.passed) };
  } catch {
    return { passed: false };
  }
}

/* ── Internal helpers so the action can read/write the DB ── */

export const getSession = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getLeaderboardByGithub = internalQuery({
  args: { github: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leaderboard")
      .withIndex("by_github", (q) => q.eq("github", args.github))
      .first();
  },
});

export const insertLeaderboard = internalMutation({
  args: {
    github: v.string(),
    solved: v.number(),
    timeSecs: v.number(),
    elo: v.number(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("leaderboard", args);
  },
});

export const patchLeaderboard = internalMutation({
  args: {
    id: v.id("leaderboard"),
    github: v.string(),
    solved: v.number(),
    timeSecs: v.number(),
    elo: v.number(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const getTopLeaderboard = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("leaderboard")
      .withIndex("by_elo")
      .order("desc")
      .take(100);
  },
});

/* ── Main action: validate submissions, compute ELO, update leaderboard ── */

export const submitResults = action({
  args: {
    sessionId: v.id("sessions"),
    github: v.string(),
    submissions: v.array(
      v.object({
        problemId: v.string(),
        code: v.string(),
      }),
    ),
    timeElapsed: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify session exists
    const session = await ctx.runQuery(internal.submissions.getSession, {
      sessionId: args.sessionId,
    });
    if (!session) throw new Error("session not found");

    // Validate each submission against the worker
    const details = await Promise.all(
      args.submissions.map(async (submission) => {
        const validation = await validateWithWorker(submission);
        return { problemId: submission.problemId, passed: validation.passed };
      }),
    );

    const solvedIds = new Set(
      details.filter((r) => r.passed).map((r) => r.problemId),
    );
    const solvedCount = solvedIds.size;
    const timeRemainingSecs = Math.max(0, 45 - Math.floor(args.timeElapsed / 1000));

    const difficultyBonus = getDifficultyBonus(
      PROBLEM_BANK.filter((p) => solvedIds.has(p.id)).map((p) => ({
        solved: true,
        difficulty: p.difficulty,
      })),
    );

    const elo = computeElo({ solvedCount, timeRemainingSecs, difficultyBonus });

    // Upsert leaderboard (only if better than existing)
    if (solvedCount > 0) {
      const existing = await ctx.runQuery(
        internal.submissions.getLeaderboardByGithub,
        { github: args.github },
      );

      const row = {
        github: args.github,
        solved: solvedCount,
        timeSecs: Math.floor(args.timeElapsed / 1000),
        elo,
        sessionId: args.sessionId,
      };

      if (!existing) {
        await ctx.runMutation(internal.submissions.insertLeaderboard, row);
      } else if (elo > existing.elo) {
        await ctx.runMutation(internal.submissions.patchLeaderboard, {
          id: existing._id,
          ...row,
        });
      }
    }

    // Compute rank
    const top = await ctx.runQuery(internal.submissions.getTopLeaderboard, {});
    const rankIdx: number = top.findIndex((row: { elo: number }) => row.elo <= elo);
    const rank: number = rankIdx === -1 ? top.length + 1 : rankIdx + 1;

    return { elo, solved: solvedCount, rank, timeRemaining: timeRemainingSecs, details };
  },
});
