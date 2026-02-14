import { v } from "convex/values";
import { action } from "./_generated/server";
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
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("session not found");

    const details = await Promise.all(
      args.submissions.map(async (submission) => {
        const validation = await validateWithWorker(submission);
        return { problemId: submission.problemId, passed: validation.passed };
      }),
    );

    const solvedProblems = details.filter((result) => result.passed);
    const solvedIds = new Set(solvedProblems.map((result) => result.problemId));
    const solvedCount = solvedProblems.length;
    const timeRemainingSecs = Math.max(0, 45 - Math.floor(args.timeElapsed / 1000));

    const difficultyBonus = getDifficultyBonus(
      PROBLEM_BANK.filter((problem) => solvedIds.has(problem.id)).map((problem) => ({
        solved: true,
        difficulty: problem.difficulty,
      })),
    );

    const elo = computeElo({ solvedCount, timeRemainingSecs, difficultyBonus });

    if (solvedCount > 0) {
      const existing = await ctx.db
        .query("leaderboard")
        .withIndex(
          "by_github",
          (query: { eq: (field: string, value: string) => unknown }) =>
            query.eq("github", args.github),
        )
        .first();

      const row = {
        github: args.github,
        solved: solvedCount,
        timeSecs: Math.floor(args.timeElapsed / 1000),
        elo,
        sessionId: args.sessionId,
      };

      if (!existing) {
        await ctx.db.insert("leaderboard", row);
      } else if (row.elo > existing.elo) {
        await ctx.db.patch(existing._id, row);
      }
    }

    const rank = await getRankByElo(ctx, elo);
    return {
      elo,
      solved: solvedCount,
      rank,
      timeRemaining: timeRemainingSecs,
      details,
    };
  },
});

async function getRankByElo(
  ctx: {
    db: {
      query: (table: string) => {
        withIndex: (index: string) => { order: (dir: "desc") => { take: (n: number) => Promise<{ elo: number }[]> } };
      };
    };
  },
  elo: number,
) {
  const top = await ctx.db
    .query("leaderboard")
    .withIndex("by_elo")
    .order("desc")
    .take(100);
  const index = top.findIndex((row: { elo: number }) => row.elo <= elo);
  return index === -1 ? top.length + 1 : index + 1;
}
