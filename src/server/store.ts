import { randomUUID } from "crypto";
import { PROBLEM_BANK, selectSessionProblems, stripSolution } from "../../server/problems";
import { computeElo, getDifficultyBonus } from "../lib/scoring";
import { validateSubmission } from "../../worker/index";

type SessionRow = {
  id: string;
  github: string;
  problemIds: string[];
  startedAt: number;
  expiresAt: number;
};

type LeaderboardRow = {
  github: string;
  solved: number;
  timeSecs: number;
  elo: number;
  sessionId: string;
};

type LeadRow = {
  github: string;
  email: string;
  xHandle?: string;
  flag?: string;
  elo: number;
  solved: number;
  sessionId: string;
};

const sessions = new Map<string, SessionRow>();
const leaderboard = new Map<string, LeaderboardRow>();
const leads = new Map<string, LeadRow>();

export function createSession(github: string) {
  if (!github.trim()) throw new Error("github is required");
  const picked = selectSessionProblems();
  const startedAt = Date.now();
  const expiresAt = startedAt + 45_000;
  const id = randomUUID();
  sessions.set(id, {
    id,
    github,
    problemIds: picked.map((problem) => problem.id),
    startedAt,
    expiresAt,
  });
  return { sessionId: id, startedAt, expiresAt, problems: picked.map(stripSolution) };
}

export async function submitResults(params: {
  sessionId: string;
  github: string;
  submissions: { problemId: string; code: string }[];
  timeElapsed: number;
}) {
  const session = sessions.get(params.sessionId);
  if (!session) throw new Error("session not found");

  const details = await Promise.all(
    params.submissions.map(async (submission) => {
      const problem = PROBLEM_BANK.find((item) => item.id === submission.problemId);
      if (!problem) return { problemId: submission.problemId, passed: false };
      const outcome = await validateSubmission({
        code: submission.code,
        testCases: problem.testCases,
      });
      return { problemId: submission.problemId, passed: outcome.passed };
    }),
  );

  const solvedIds = new Set(
    details.filter((item) => item.passed).map((item) => item.problemId),
  );
  const solved = solvedIds.size;
  const timeRemaining = Math.max(0, 45 - Math.floor(params.timeElapsed / 1000));
  const difficultyBonus = getDifficultyBonus(
    PROBLEM_BANK.filter((problem) => solvedIds.has(problem.id)).map((problem) => ({
      solved: true,
      difficulty: problem.difficulty,
    })),
  );
  const elo = computeElo({
    solvedCount: solved,
    timeRemainingSecs: timeRemaining,
    difficultyBonus,
  });

  if (solved > 0) {
    const existing = leaderboard.get(params.github);
    if (!existing || elo > existing.elo) {
      leaderboard.set(params.github, {
        github: params.github,
        solved,
        timeSecs: Math.floor(params.timeElapsed / 1000),
        elo,
        sessionId: params.sessionId,
      });
    }
  }

  const rank = getLeaderboard().findIndex((entry) => entry.elo <= elo) + 1;
  return { elo, solved, rank: rank || 1, timeRemaining, details };
}

export function getLeaderboard() {
  return [...leaderboard.values()].sort((a, b) => b.elo - a.elo).slice(0, 100);
}

export function submitLead(input: {
  github: string;
  email: string;
  xHandle?: string;
  flag?: string;
  sessionId: string;
}) {
  const score = leaderboard.get(input.github);
  if (!score || score.solved < 3) throw new Error("3+ solved required");
  if (!input.email.trim()) throw new Error("email required");
  leads.set(input.github, {
    github: input.github,
    email: input.email.trim(),
    xHandle: input.xHandle?.trim(),
    flag: input.flag,
    elo: score.elo,
    solved: score.solved,
    sessionId: input.sessionId,
  });
  return { ok: true };
}

export function getLeadByGithub(github: string) {
  return leads.get(github);
}

export function getSessionSolutions(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("session not found");

  const byId = new Map(PROBLEM_BANK.map((problem) => [problem.id, problem]));
  return session.problemIds.reduce<Record<string, string>>((acc, problemId) => {
    const problem = byId.get(problemId);
    if (problem) {
      acc[problemId] = problem.solution;
    }
    return acc;
  }, {});
}

export function resetStore() {
  sessions.clear();
  leaderboard.clear();
  leads.clear();
}
