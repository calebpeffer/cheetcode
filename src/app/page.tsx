"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { GameProblem } from "@/lib/types";
import type { Id } from "../../convex/_generated/dataModel";

type Screen = "landing" | "playing" | "results";

type ResultsData = {
  elo: number;
  solved: number;
  rank: number;
  timeRemaining: number;
};

const ROUND_MS = 45_000;

function diffBadge(d: string) {
  if (d === "easy") return "badge-easy";
  if (d === "medium") return "badge-medium";
  return "badge-hard";
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [github, setGithub] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [problems, setProblems] = useState<GameProblem[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [localPass, setLocalPass] = useState<Record<string, boolean | null>>({});
  const [results, setResults] = useState<ResultsData | null>(null);
  const [email, setEmail] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [flag, setFlag] = useState("");
  const [submittedLead, setSubmittedLead] = useState(false);
  const [isAutoSolving, setIsAutoSolving] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [now, setNow] = useState(Date.now());
  const workerRef = useRef<Worker | null>(null);
  const skipAutoFinishRef = useRef(false);
  const canAutoSolve = process.env.NODE_ENV !== "production";

  // ── Convex hooks ──
  const leaderboard = useQuery(api.leaderboard.getAll) ?? [];
  const createSession = useMutation(api.sessions.create);
  const submitResultsAction = useAction(api.submissions.submitResults);
  const submitLeadMutation = useMutation(api.leads.submit);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/codeRunner.worker.ts", import.meta.url),
    );
    workerRef.current.onmessage = (
      event: MessageEvent<{ id: string; passed: boolean }>,
    ) => {
      setLocalPass((cur) => ({ ...cur, [event.data.id]: event.data.passed }));
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const timeLeftMs = useMemo(() => Math.max(0, expiresAt - now), [expiresAt, now]);
  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const progress = expiresAt ? Math.max(0, Math.min(100, (timeLeftMs / ROUND_MS) * 100)) : 0;
  const solvedLocal = useMemo(
    () => problems.filter((p) => localPass[p.id] === true).length,
    [problems, localPass],
  );
  const timeUp = screen === "playing" && timeLeftMs === 0;

  const finishGame = useCallback(async () => {
    if (!sessionId || results) return;
    try {
      const d = await submitResultsAction({
        sessionId,
        github,
        timeElapsed: ROUND_MS - timeLeftMs,
        submissions: problems.map((p) => ({
          problemId: p.id,
          code: codes[p.id] ?? "",
        })),
      });
      setResults(d);
      setScreen("results");
    } catch (err) {
      console.error("submitResults failed:", err);
    }
  }, [sessionId, results, github, timeLeftMs, problems, codes, submitResultsAction]);

  useEffect(() => {
    if (screen !== "playing") return;
    if (timeLeftMs === 0) void finishGame();
    else if (solvedLocal === 10 && !skipAutoFinishRef.current) void finishGame();
  }, [timeLeftMs, solvedLocal, screen, finishGame]);

  async function startGame() {
    try {
      const d = await createSession({ github });
      setSessionId(d.sessionId);
      setExpiresAt(d.expiresAt);
      // Convex returns problems with the right shape
      setProblems(d.problems as unknown as GameProblem[]);
      setCodes(Object.fromEntries(d.problems.map((p: { id: string; starterCode: string }) => [p.id, p.starterCode])));
      setLocalPass({});
      setSubmittedLead(false);
      setResults(null);
      setSelectedIdx(0);
      skipAutoFinishRef.current = false;
      setScreen("playing");
    } catch (err) {
      console.error("createSession failed:", err);
    }
  }

  function runLocalCheck(problem: GameProblem) {
    setLocalPass((cur) => ({ ...cur, [problem.id]: null }));
    setTimeout(() => {
      workerRef.current?.postMessage({
        id: problem.id,
        code: codes[problem.id] ?? problem.starterCode,
        testCases: problem.testCases,
      });
    }, 300);
  }

  async function submitLeadForm() {
    if (!sessionId) return;
    try {
      await submitLeadMutation({ github, email, xHandle, flag, sessionId });
      setSubmittedLead(true);
    } catch (err) {
      console.error("submitLead failed:", err);
    }
  }

  function resetAll() {
    setScreen("landing");
    setSessionId(null);
    setExpiresAt(0);
    setProblems([]);
    setCodes({});
    setLocalPass({});
    setResults(null);
    setEmail("");
    setXHandle("");
    setFlag("");
    setSubmittedLead(false);
    setSelectedIdx(0);
  }

  async function shareScore() {
    if (!results) return;
    const text = `I just scored ${results.elo} on the Firecrawl CTF — 10 problems, 45 seconds. 🔥 Think you can beat it? ${window.location.origin}`;
    await navigator.clipboard.writeText(text);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function autoSolve() {
    if (!sessionId || !canAutoSolve) return;
    setIsAutoSolving(true);
    skipAutoFinishRef.current = true;
    try {
      // Auto-solve uses a local API route (dev-only) — pass problem IDs directly
      const r = await fetch("/api/dev/auto-solve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problemIds: problems.map((p) => p.id) }),
      });
      if (!r.ok) return;
      const d = (await r.json()) as { solutions: Record<string, string> };
      setCodes((cur) => ({ ...cur, ...d.solutions }));
      problems.forEach((p) => {
        if (!d.solutions[p.id]) return;
        workerRef.current?.postMessage({
          id: p.id,
          code: d.solutions[p.id],
          testCases: p.testCases,
        });
      });
    } finally {
      setIsAutoSolving(false);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     LANDING
     ═══════════════════════════════════════════════════════════ */
  if (screen === "landing") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9f9f9",
          padding: "80px 24px",
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        <div style={{ width: "100%", maxWidth: 600, textAlign: "center" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
            <span style={{ fontSize: 40 }}>🔥</span>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fa5d19", margin: 0, letterSpacing: -1 }}>
              FIRECRAWL CTF
            </h1>
          </div>

          {/* Headline card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e5e5",
              borderRadius: 16,
              padding: "48px 40px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ fontSize: 44, fontWeight: 800, color: "#262626", margin: 0, lineHeight: 1.1, letterSpacing: -0.5 }}>
              10 problems. 45 seconds.
            </p>
            <p style={{ fontSize: 16, color: "rgba(0,0,0,0.45)", margin: "12px 0 0", fontWeight: 400 }}>
              Good luck.
            </p>
          </div>

          {/* Info chips */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 28 }}>
            {["Solve all 10 coding challenges", "You have 45 seconds", "That's 4.5 seconds per problem"].map((t) => (
              <span
                key={t}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "rgba(0,0,0,0.45)",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* GitHub input card */}
          <div
            style={{
              maxWidth: 420,
              margin: "36px auto 0",
              background: "#ffffff",
              border: "1px solid #e5e5e5",
              borderRadius: 16,
              padding: "28px 32px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <label style={{ display: "block", textAlign: "left", fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.4)", marginBottom: 8 }}>
              github.com/
            </label>
            <input
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="your-handle"
              style={{
                width: "100%",
                height: 48,
                borderRadius: 10,
                border: "1px solid #e5e5e5",
                background: "#f3f3f3",
                padding: "0 16px",
                fontSize: 15,
                fontFamily: "var(--font-geist-mono), monospace",
                color: "#262626",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#fa5d19")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
            />
            {/* Primary CTA — Firecrawl branded button */}
            <button
              disabled={!github.trim()}
              onClick={startGame}
              className="btn-heat"
              style={{
                width: "100%",
                height: 52,
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: 2,
                marginTop: 16,
                fontFamily: "inherit",
              }}
            >
              START
            </button>
          </div>

          {/* Leaderboard toggle */}
          <button
            onClick={() => setShowLeaderboard((c) => !c)}
            style={{
              display: "block",
              margin: "28px auto 0",
              background: "none",
              border: "none",
              color: "rgba(0,0,0,0.4)",
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 4,
              fontFamily: "inherit",
            }}
          >
            {showLeaderboard ? "hide leaderboard" : "view leaderboard"}
          </button>

          {showLeaderboard && (
            <div
              style={{
                maxWidth: 520,
                margin: "20px auto 0",
                background: "#ffffff",
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    {["#", "Player", "Solved", "ELO"].map((h) => (
                      <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.4)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "16px 18px", fontSize: 13, color: "rgba(0,0,0,0.4)" }}>
                        No entries yet.
                      </td>
                    </tr>
                  )}
                  {leaderboard.map((row, i) => (
                    <tr key={row.github} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 700, color: i < 3 ? "#fa5d19" : "rgba(0,0,0,0.3)" }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: "10px 18px", fontSize: 13, color: "#262626" }}>@{row.github}</td>
                      <td style={{ padding: "10px 18px", fontSize: 13, color: row.solved === 10 ? "#1a9338" : "rgba(0,0,0,0.4)" }}>
                        {row.solved}/10
                      </td>
                      <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: row.elo > 1000 ? "#fa5d19" : "rgba(0,0,0,0.4)" }}>
                        {row.elo.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PLAYING — 5×2 grid, all 10 problems visible
     ═══════════════════════════════════════════════════════════ */
  if (screen === "playing") {
    const timerBg = secondsLeft <= 10 ? "#dc2626" : secondsLeft <= 20 ? "#fa5d19" : "#1a9338";
    const timerFg = secondsLeft <= 10 ? "#dc2626" : secondsLeft <= 20 ? "#fa5d19" : "#1a9338";

    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#f9f9f9",
          fontFamily: "'SF Mono', 'Fira Code', var(--font-geist-mono), monospace",
        }}
      >
        {/* ── Header bar ── */}
        <div
          style={{
            height: 44,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            borderBottom: "1px solid #e5e5e5",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fa5d19", letterSpacing: -0.5 }}>
              FIRECRAWL CTF
            </span>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", marginLeft: 4 }}>@{github}</span>
            {canAutoSolve && (
              <button
                onClick={autoSolve}
                disabled={isAutoSolving}
                style={{
                  marginLeft: 8,
                  padding: "2px 10px",
                  fontSize: 10,
                  fontWeight: 600,
                  background: "#f3f3f3",
                  color: "rgba(0,0,0,0.5)",
                  border: "1px solid #e5e5e5",
                  borderRadius: 4,
                  cursor: isAutoSolving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {isAutoSolving ? "solving..." : "⚡ Auto Solve"}
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Solved */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", textTransform: "uppercase" }}>Solved</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: solvedLocal === 10 ? "#1a9338" : "#262626" }}>
                {solvedLocal}<span style={{ color: "rgba(0,0,0,0.25)" }}>/10</span>
              </span>
            </div>
            {/* Timer */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 140, height: 5, background: "#e5e5e5", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: timerBg,
                    borderRadius: 4,
                    transition: "width 100ms linear, background 500ms",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: timerFg,
                  minWidth: 48,
                  textAlign: "right",
                  transition: "color 500ms",
                  ...(secondsLeft <= 10 ? { animation: "timer-pulse 0.6s ease-in-out infinite" } : {}),
                }}
              >
                {timeUp ? "TIME" : `0:${String(secondsLeft).padStart(2, "0")}`}
              </span>
            </div>
          </div>
        </div>

        {/* ── 5×2 Challenge Grid ── */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: 6,
            padding: 6,
            minHeight: 0,
          }}
        >
          {problems.map((problem, idx) => {
            const status =
              problem.id in localPass
                ? localPass[problem.id] === null
                  ? "submitting"
                  : localPass[problem.id]
                    ? "passed"
                    : "failed"
                : "idle";

            const borderColor =
              status === "passed" ? "#22c55e" : status === "failed" ? "#ef4444" : "#e5e5e5";
            const bgColor =
              status === "passed" ? "#f0fdf4" : status === "failed" ? "#fef2f2" : "#ffffff";

            return (
              <div
                key={problem.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                  background: bgColor,
                  transition: "all 300ms",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                {/* Panel header */}
                <div
                  style={{
                    padding: "5px 8px",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, color: "rgba(0,0,0,0.3)" }}>#{idx + 1}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#262626", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                      {problem.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 6px",
                      borderRadius: 999,
                      fontWeight: 600,
                      background:
                        problem.difficulty === "hard"
                          ? "rgba(220,38,38,0.10)"
                          : problem.difficulty === "medium"
                            ? "rgba(180,83,9,0.10)"
                            : "rgba(26,147,56,0.10)",
                      color:
                        problem.difficulty === "hard"
                          ? "#dc2626"
                          : problem.difficulty === "medium"
                            ? "#b45309"
                            : "#1a9338",
                    }}
                  >
                    {problem.difficulty}
                  </span>
                </div>

                {/* Description */}
                <div style={{ padding: "5px 8px", flexShrink: 0 }}>
                  <p style={{ fontSize: 10, color: "rgba(0,0,0,0.5)", lineHeight: 1.4, margin: 0 }}>
                    {problem.description.length > 120
                      ? problem.description.slice(0, 120) + "..."
                      : problem.description}
                  </p>
                  <pre
                    style={{
                      fontSize: 9,
                      color: "rgba(0,0,0,0.4)",
                      background: "#f3f3f3",
                      padding: 4,
                      borderRadius: 4,
                      marginTop: 4,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.4,
                    }}
                  >
                    {problem.example}
                  </pre>
                </div>

                {/* Code textarea */}
                <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: 0, padding: "0 8px" }}>
                  <textarea
                    value={codes[problem.id] ?? ""}
                    onChange={(e) => setCodes((cur) => ({ ...cur, [problem.id]: e.target.value }))}
                    disabled={timeUp || status === "passed"}
                    placeholder={problem.signature}
                    spellCheck={false}
                    style={{
                      flex: "1 1 auto",
                      minHeight: 40,
                      width: "100%",
                      resize: "none",
                      background: "#fafafa",
                      color: status === "passed" ? "#1a9338" : "#262626",
                      border: "1px solid #e5e5e5",
                      borderRadius: 4,
                      padding: 6,
                      fontSize: 10,
                      lineHeight: 1.4,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Submit button */}
                <div style={{ padding: "5px 8px", flexShrink: 0 }}>
                  <button
                    onClick={() => runLocalCheck(problem)}
                    disabled={timeUp || status === "passed" || !(codes[problem.id] ?? "").trim()}
                    style={{
                      width: "100%",
                      padding: "4px 0",
                      borderRadius: 4,
                      border: "none",
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: timeUp || status === "passed" || !(codes[problem.id] ?? "").trim() ? "not-allowed" : "pointer",
                      background:
                        status === "passed"
                          ? "rgba(26,147,56,0.1)"
                          : timeUp
                            ? "#e5e5e5"
                            : "#fa5d19",
                      color:
                        status === "passed"
                          ? "#1a9338"
                          : timeUp
                            ? "rgba(0,0,0,0.3)"
                            : "#fff",
                      transition: "all 150ms",
                    }}
                  >
                    {status === "passed"
                      ? "✓ PASSED"
                      : status === "failed"
                        ? "✗ RETRY"
                        : status === "submitting"
                          ? "..."
                          : "SUBMIT"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Time's up overlay ── */}
        {timeUp && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div style={{ textAlign: "center", background: "#ffffff", borderRadius: 20, padding: "48px 56px", border: "1px solid #e5e5e5", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
              <p style={{ fontSize: 52, fontWeight: 800, color: solvedLocal === 10 ? "#1a9338" : "#dc2626", margin: 0 }}>
                {solvedLocal === 10 ? "ALL CLEAR 🔥" : "TIME'S UP"}
              </p>
              <p style={{ fontSize: 22, color: "rgba(0,0,0,0.45)", margin: "8px 0 0" }}>
                {solvedLocal}/10 solved
              </p>
              <button
                onClick={() => void finishGame()}
                className="btn-heat"
                style={{
                  marginTop: 32,
                  padding: "14px 48px",
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: "inherit",
                  letterSpacing: 1,
                }}
              >
                SEE RESULTS
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RESULTS
     ═══════════════════════════════════════════════════════════ */
  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    borderRadius: 10,
    border: "1px solid #e5e5e5",
    background: "#f3f3f3",
    padding: "0 16px",
    fontSize: 14,
    fontFamily: "var(--font-geist-mono), monospace",
    color: "#262626",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9f9f9",
        padding: "80px 24px",
        fontFamily: "var(--font-geist-mono), monospace",
      }}
    >
      {results && (
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: 20,
            padding: "48px 44px",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          {/* Headline */}
          <h2
            style={{
              fontSize: 44,
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.1,
              color: results.solved === 10 ? "#fa5d19" : "#262626",
            }}
          >
            {results.solved <= 2
              ? "TIME'S UP"
              : results.solved < 10
                ? "NOT BAD"
                : "ALL CLEAR 🔥"}
          </h2>

          {results.solved <= 2 && (
            <p style={{ marginTop: 16, fontSize: 15, color: "rgba(0,0,0,0.45)" }}>
              You probably need a different approach.
            </p>
          )}
          {results.solved === 10 && (
            <p style={{ marginTop: 16, fontSize: 15, fontWeight: 600, color: "#fa5d19" }}>
              We want to talk to you.
            </p>
          )}

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 0,
              marginTop: 36,
              background: "#f3f3f3",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {[
              { label: "Solved", value: `${results.solved}/10`, color: "#262626" },
              { label: "ELO", value: results.elo.toLocaleString(), color: "#fa5d19" },
              { label: "Rank", value: `#${results.rank}`, color: "#262626" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  padding: "20px 16px",
                  borderRight: i < 2 ? "1px solid #e5e5e5" : "none",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(0,0,0,0.35)", margin: 0 }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: 26, fontWeight: 800, color: stat.color, margin: "8px 0 0" }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Capture form — inline row */}
          {results.solved >= 3 && !submittedLead && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={(e) => (e.target.style.borderColor = "#fa5d19")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
                />
                <input
                  value={github}
                  readOnly
                  style={{ ...inputStyle, flex: 1, color: "rgba(0,0,0,0.35)" }}
                />
                <input
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                  placeholder="@x_handle"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={(e) => (e.target.style.borderColor = "#fa5d19")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
                />
                <input
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="🔥{...}"
                  style={{ ...inputStyle, flex: 0.7 }}
                  onFocus={(e) => (e.target.style.borderColor = "#fa5d19")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
                />
                <button
                  disabled={!email.trim()}
                  onClick={submitLeadForm}
                  className="btn-heat"
                  style={{
                    height: 44,
                    padding: "0 24px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  SUBMIT
                </button>
              </div>
            </div>
          )}

          {submittedLead && (
            <p style={{ marginTop: 28, fontSize: 15, fontWeight: 600, color: "#1a9338" }}>
              You&apos;re in. Share for the next challenge 🔥
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
            <button
              onClick={shareScore}
              className="btn-heat"
              style={{
                flex: 1,
                height: 46,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                fontFamily: "inherit",
              }}
            >
              SHARE ON X
            </button>
            <button
              onClick={resetAll}
              className="btn-ghost"
              style={{
                flex: 1,
                height: 46,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                fontFamily: "inherit",
              }}
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
