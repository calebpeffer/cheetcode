import { query } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_elo")
      .order("desc")
      .take(100);

    // Sort by ELO desc, then by attempts asc (fewer attempts = higher rank)
    return entries.sort((a, b) => {
      if (b.elo !== a.elo) return b.elo - a.elo;
      return (a.attempts ?? 1) - (b.attempts ?? 1);
    });
  },
});
