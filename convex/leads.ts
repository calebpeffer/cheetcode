import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const submit = mutation({
  args: {
    github: v.string(),
    email: v.string(),
    xHandle: v.optional(v.string()),
    flag: v.optional(v.string()),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("session not found");
    }

    const leaderboardRow = await ctx.db
      .query("leaderboard")
      .withIndex("by_github", (query) => query.eq("github", args.github))
      .first();

    if (!leaderboardRow || leaderboardRow.solved < 3) {
      throw new Error("3+ solved required");
    }
    if (!args.email.trim()) {
      throw new Error("email required");
    }

    const existing = await ctx.db
      .query("leads")
      .withIndex("by_github", (query) => query.eq("github", args.github))
      .first();

    const payload = {
      github: args.github,
      email: args.email.trim(),
      xHandle: args.xHandle?.trim() || undefined,
      flag: args.flag,
      elo: leaderboardRow.elo,
      solved: leaderboardRow.solved,
      sessionId: args.sessionId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return { ok: true, upserted: "updated" };
    }

    await ctx.db.insert("leads", payload);
    return { ok: true, upserted: "created" };
  },
});
