import { v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  PROBLEM_BANK,
  selectSessionProblems,
  stripSolution,
} from "../server/problems";

export const create = mutation({
  args: { github: v.string() },
  handler: async (ctx, args) => {
    const github = args.github.trim();
    if (!github) {
      throw new Error("github is required");
    }

    const picked = selectSessionProblems();
    const startedAt = Date.now();
    const expiresAt = startedAt + 45_000;
    const sessionId = await ctx.db.insert("sessions", {
      github,
      problemIds: picked.map((problem) => problem.id),
      startedAt,
      expiresAt,
    });

    return {
      sessionId,
      startedAt,
      expiresAt,
      problems: picked.map(stripSolution),
      // Included for tests and server-side conveniences only.
      allProblemIds: PROBLEM_BANK.map((problem) => problem.id),
    };
  },
});
