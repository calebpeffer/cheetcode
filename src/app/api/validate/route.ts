import { NextResponse } from "next/server";
import { getQuickJS, type QuickJSWASMModule } from "quickjs-emscripten";

/**
 * POST /api/validate
 * Sandboxed code validation — runs user code inside a QuickJS WASM VM.
 * User code has ZERO access to Node.js, filesystem, network, or host process.
 */

type TestCase = {
  input: Record<string, unknown>;
  expected: unknown;
};

type Payload = {
  code: string;
  testCases: TestCase[];
};

const FLAG = "🔥{you_found_the_fire}";

// Cache WASM module at module scope
let _qjs: QuickJSWASMModule | null = null;
async function getQJS(): Promise<QuickJSWASMModule> {
  if (!_qjs) _qjs = await getQuickJS();
  return _qjs;
}

/** Run all test cases in a single VM — one VM per request */
async function runValidation(
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

    // Define function once
    const fnResult = vm.evalCode(`const __fn__ = (${code}); __fn__;`);
    if ("error" in fnResult) { fnResult.error.dispose(); return false; }
    fnResult.value.dispose();

    // Test each case
    for (const tc of testCases) {
      const args = JSON.stringify(Object.values(tc.input));
      const expected = JSON.stringify(tc.expected);
      const result = vm.evalCode(
        `JSON.stringify(__fn__(...${args})) === ${JSON.stringify(expected)};`
      );
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
    const { code, testCases } = (await request.json()) as Payload;

    if (!code || !Array.isArray(testCases)) {
      return NextResponse.json({ passed: false }, { status: 400 });
    }

    const qjs = await getQJS();
    const passed = await runValidation(qjs, code, testCases);
    return NextResponse.json({ passed });
  } catch {
    return NextResponse.json({ passed: false }, { status: 500 });
  }
}
