import { v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  selectSessionProblems,
  stripSolution,
} from "../server/problems";
import { validateGithub } from "../src/lib/validation";

export const create = mutation({
  args: { github: v.string() },
  handler: async (ctx, args) => {
    const ghResult = validateGithub(args.github);
    if (ghResult.ok === false) throw new Error(ghResult.error);
    const github = ghResult.value;

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
    };
  },
});
