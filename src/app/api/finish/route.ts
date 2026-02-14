import { NextResponse } from "next/server";
import { getQuickJS, type QuickJSWASMModule } from "quickjs-emscripten";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { PROBLEM_BANK } from "../../../../server/problems";
import type { Id } from "../../../../convex/_generated/dataModel";
import { validateGithub, validateCode } from "../../../lib/validation";

/**
 * POST /api/finish
 * End-to-end game submission handler:
 *   1. Validate each submission in a QuickJS WASM sandbox (secure, in-process)
 *   2. Call Convex mutation to compute ELO and upsert leaderboard
 *   3. Return results to client
 */

type TestCase = {
  input: Record<string, unknown>;
  expected: unknown;
};

type Submission = {
  problemId: string;
  code: string;
};

type RequestBody = {
  sessionId: string;
  github: string;
  submissions: Submission[];
  timeElapsed: number;
};

const FLAG = "🔥{you_found_the_fire}";

// Cache the WASM module at module scope — loaded once, reused across requests
let _qjs: QuickJSWASMModule | null = null;
async function getQJS(): Promise<QuickJSWASMModule> {
  if (!_qjs) _qjs = await getQuickJS();
  return _qjs;
}

/**
 * Validate all test cases for one problem in a single VM context.
 * One VM per problem — fast, isolated, no cross-problem state leaks.
 */
async function validateSubmission(
  qjs: QuickJSWASMModule,
  code: string,
  testCases: TestCase[],
): Promise<boolean> {
  const vm = qjs.newContext();
  try {
    // Inject console no-op + easter egg
    const setup = vm.evalCode(
      `globalThis.console={log(){},warn(){},error(){},info(){}};` +
      `globalThis.__FIRECRAWL__="${FLAG}";`
    );
    if ("error" in setup) { setup.error.dispose(); return false; }
    setup.value.dispose();

    // Define the user's function once
    const fnResult = vm.evalCode(`const __fn__ = (${code}); __fn__;`);
    if ("error" in fnResult) { fnResult.error.dispose(); return false; }
    fnResult.value.dispose();

    // Run each test case against the already-defined function
    for (const tc of testCases) {
      const args = JSON.stringify(Object.values(tc.input));
      const expected = JSON.stringify(tc.expected);
      const testScript = `JSON.stringify(__fn__(...${args})) === ${JSON.stringify(expected)};`;

      const result = vm.evalCode(testScript);
      if ("error" in result) { result.error.dispose(); return false; }
      const passed = vm.dump(result.value) === true;
      result.value.dispose();
      if (!passed) return false;
    }

    return true;
  } finally {
    vm.dispose();
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { sessionId, github, submissions, timeElapsed } = body;

    if (!sessionId || !github || !Array.isArray(submissions)) {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }

    // Server-side input validation
    const ghResult = validateGithub(github);
    if (ghResult.ok === false) {
      return NextResponse.json({ error: ghResult.error }, { status: 400 });
    }

    // Load QuickJS WASM once, reuse for all problems
    const qjs = await getQJS();

    // Validate each submission (one VM per problem, all test cases inside it)
    const solvedProblemIds: string[] = [];
    for (const sub of submissions) {
      const problem = PROBLEM_BANK.find((p) => p.id === sub.problemId);
      if (!problem || !sub.code.trim()) continue;

      // Reject oversized code submissions
      const codeResult = validateCode(sub.code);
      if (codeResult.ok === false) continue;

      const passed = await validateSubmission(qjs, codeResult.value, problem.testCases);
      if (passed) solvedProblemIds.push(sub.problemId);
    }

    // Call Convex to record results + update leaderboard
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const result = await convex.mutation(api.submissions.recordResults, {
      sessionId: sessionId as Id<"sessions">,
      github,
      solvedProblemIds,
      timeElapsedMs: timeElapsed,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/finish error:", err);
    return NextResponse.json(
      { error: "submission failed", elo: 0, solved: 0, rank: 0, timeRemaining: 0 },
      { status: 500 },
    );
  }
}
