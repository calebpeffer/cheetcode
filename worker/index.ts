type WorkerTestCase = {
  input: Record<string, unknown>;
  expected: unknown;
};

type WorkerPayload = {
  code: string;
  testCases: WorkerTestCase[];
};

const FLAG = "🔥{you_found_the_fire}";
const preamble = `globalThis.__FIRECRAWL__ = "${FLAG}";`;

function hasInfiniteLoopPattern(code: string): boolean {
  return /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/.test(code);
}

function runCase(code: string, testCase: WorkerTestCase): boolean {
  // Basic guard for obvious infinite loops in this compact worker implementation.
  if (hasInfiniteLoopPattern(code)) return false;
  const fn = new Function(`${preamble}\nreturn (${code});`)() as (
    ...args: unknown[]
  ) => unknown;
  const actual = fn(...Object.values(testCase.input));
  return JSON.stringify(actual) === JSON.stringify(testCase.expected);
}

export async function validateSubmission(payload: WorkerPayload) {
  const results = payload.testCases.map((testCase) => {
    try {
      return { match: runCase(payload.code, testCase) };
    } catch {
      return { match: false };
    }
  });

  return { passed: results.every((result) => result.match) };
}

const workerHandler = {
  async fetch(request: Request) {
    const payload = (await request.json()) as WorkerPayload;
    return Response.json(await validateSubmission(payload));
  },
};

export default workerHandler;
