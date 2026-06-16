import { useState, useEffect } from "react";

const today = () => new Date().toISOString().slice(0, 10);

const getDayLabel = (dateStr) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date(dateStr + "T12:00:00").getDay()];
};

const getLast7Days = () => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

// localStorage helpers
const loadFromStorage = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export default function WaterTracker() {
  const todayStr = today();

  const [goal, setGoal] = useState(() => loadFromStorage("water:goal", 8));
  const [history, setHistory] = useState(() => loadFromStorage("water:history", { [todayStr]: 0 }));
  const [editingGoal, setEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(String(goal));
  const [view, setView] = useState("today");
  const [ripple, setRipple] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // Persist goal
  useEffect(() => {
    saveToStorage("water:goal", goal);
  }, [goal]);

  // Persist history
  useEffect(() => {
    saveToStorage("water:history", history);
    setSaveStatus("saving");
    const t = setTimeout(() => setSaveStatus("saved"), 400);
    const t2 = setTimeout(() => setSaveStatus(""), 2000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [history]);

  const count = history[todayStr] ?? 0;
  const pct = Math.min(count / goal, 1);
  const left = Math.max(goal - count, 0);
  const done = count >= goal;

  const drinkGlass = () => {
    setHistory((h) => ({ ...h, [todayStr]: (h[todayStr] ?? 0) + 1 }));
    setRipple(true);
    setTimeout(() => setRipple(false), 400);
  };

  const undoGlass = () => {
    setHistory((h) => ({
      ...h,
      [todayStr]: Math.max((h[todayStr] ?? 0) - 1, 0),
    }));
  };

  const saveGoalFn = () => {
    const v = parseInt(tempGoal);
    if (v > 0 && v <= 30) setGoal(v);
    setEditingGoal(false);
  };

  const last7 = getLast7Days();
  const W = 260, H = 260, R = 130;
  const fillY = H * (1 - pct);
  const waveAmp = done ? 4 : 10;
  const wavePath = `
    M 0 ${fillY + Math.sin(0) * waveAmp}
    Q ${W * 0.25} ${fillY - waveAmp} ${W * 0.5} ${fillY}
    Q ${W * 0.75} ${fillY + waveAmp} ${W} ${fillY}
    L ${W} ${H} L 0 ${H} Z
  `;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1628 0%, #0d2044 50%, #0a1628 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#e8f4fd", padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: 420, padding: "28px 24px 8px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#5b9bd5", textTransform: "uppercase", marginBottom: 4 }}>Today</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e8f4fd" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </div>
        </div>
        {editingGoal ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number" value={tempGoal}
              onChange={e => setTempGoal(e.target.value)}
              style={{
                width: 48, padding: "6px 8px", borderRadius: 8, border: "1px solid #2a5a9e",
                background: "#0d2044", color: "#e8f4fd", fontSize: 16, textAlign: "center"
              }}
              min={1} max={30} autoFocus
            />
            <button onClick={saveGoalFn} style={{
              background: "#1e6fd9", border: "none", borderRadius: 8,
              padding: "6px 12px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600
            }}>✓</button>
          </div>
        ) : (
          <button onClick={() => { setEditingGoal(true); setTempGoal(String(goal)); }}
            style={{
              background: "rgba(30,80,160,0.3)", border: "1px solid #2a5a9e",
              borderRadius: 10, padding: "6px 14px", color: "#7bbfea", cursor: "pointer", fontSize: 13
            }}>
            Goal: {goal} 💧
          </button>
        )}
      </div>

      {/* Save status */}
      <div style={{
        height: 20, fontSize: 11,
        color: saveStatus === "saved" ? "#4ade80" : "#5b9bd5",
        marginBottom: 8, transition: "opacity 0.3s",
        opacity: saveStatus ? 1 : 0
      }}>
        {saveStatus === "saving" ? "💾 Saving..." : "✅ Saved to your browser!"}
      </div>

      {/* Tab switcher */}
      <div style={{
        display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 12,
        padding: 3, gap: 3, marginBottom: 24, maxWidth: 420, width: "calc(100% - 48px)"
      }}>
        {["today", "week"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 14, transition: "all 0.2s",
            background: view === v ? "#1e6fd9" : "transparent",
            color: view === v ? "#fff" : "#5b9bd5",
          }}>{v === "today" ? "Today" : "7-Day View"}</button>
        ))}
      </div>

      {view === "today" ? (
        <>
          {/* Circle progress */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <defs>
                <clipPath id="circle-clip">
                  <circle cx={R} cy={R} r={R - 4} />
                </clipPath>
                <radialGradient id="glow" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#4fa3e8" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#1e6fd9" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx={R} cy={R} r={R - 2} fill="none" stroke="#1a3a6e" strokeWidth={4} />
              <g clipPath="url(#circle-clip)">
                <rect x={0} y={0} width={W} height={H} fill="#0d2044" />
                <path d={wavePath} fill={done ? "#22c55e" : "#1e6fd9"} opacity={0.85} />
                <path d={wavePath} fill={done ? "#4ade80" : "#60a5fa"} opacity={0.25}
                  transform={`translate(-${W * 0.15} -4)`} />
              </g>
              <circle cx={R} cy={R} r={R - 4} fill="url(#glow)" />
              <text x={R} y={R - 14} textAnchor="middle" fill="#e8f4fd"
                fontSize={48} fontWeight={800} fontFamily="Inter, system-ui">
                {count}
              </text>
              <text x={R} y={R + 14} textAnchor="middle" fill="#7bbfea" fontSize={14}>
                of {goal} glasses
              </text>
              <text x={R} y={R + 36} textAnchor="middle"
                fill={done ? "#4ade80" : "#5b9bd5"} fontSize={12} fontWeight={600}>
                {done ? "🎉 Goal reached!" : `${left} to go`}
              </text>
            </svg>
          </div>

          {/* Drink button */}
          <button onClick={drinkGlass} style={{
            width: 160, height: 160, borderRadius: "50%",
            background: ripple
              ? "radial-gradient(circle, #60d0ff 0%, #1e6fd9 60%)"
              : "linear-gradient(145deg, #1e6fd9, #0d4fa8)",
            border: "4px solid rgba(100,180,255,0.25)",
            boxShadow: ripple
              ? "0 0 0 24px rgba(30,111,217,0.2), 0 8px 40px rgba(30,111,217,0.6)"
              : "0 8px 32px rgba(30,111,217,0.4)",
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
            transform: ripple ? "scale(0.95)" : "scale(1)",
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 44 }}>💧</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginTop: 4 }}>Drink!</span>
          </button>

          <button onClick={undoGlass} disabled={count === 0} style={{
            background: "transparent", border: "1px solid #2a5a9e",
            borderRadius: 10, padding: "8px 20px",
            color: count === 0 ? "#334" : "#7bbfea",
            cursor: count === 0 ? "default" : "pointer", fontSize: 13, marginBottom: 28
          }}>
            ↩ Undo last glass
          </button>

          {/* Glass icons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 320, marginBottom: 24 }}>
            {Array.from({ length: goal }).map((_, i) => (
              <span key={i} style={{ fontSize: 24, opacity: i < count ? 1 : 0.2, transition: "opacity 0.3s" }}>
                🥛
              </span>
            ))}
          </div>

          <div style={{
            maxWidth: 340, width: "calc(100% - 48px)",
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 12, padding: "12px 16px", fontSize: 12, color: "#86efac",
            lineHeight: 1.6, textAlign: "center"
          }}>
            ✅ Data saved to <strong>your browser's localStorage</strong>.<br />
            Works across refreshes on the same device & browser.
          </div>
        </>
      ) : (
        <div style={{ width: "calc(100% - 48px)", maxWidth: 420 }}>
          <div style={{ fontSize: 13, color: "#5b9bd5", marginBottom: 16, textAlign: "center" }}>
            Did you hit your goal of {goal} glasses each day?
          </div>
          {last7.map(date => {
            const c = history[date] ?? 0;
            const isToday = date === todayStr;
            const hit = c >= goal;
            const barPct = goal > 0 ? Math.min(c / goal, 1) : 0;
            return (
              <div key={date} style={{
                background: isToday ? "rgba(30,111,217,0.15)" : "rgba(255,255,255,0.04)",
                borderRadius: 14, padding: "14px 18px", marginBottom: 10,
                border: isToday ? "1px solid rgba(30,111,217,0.4)" : "1px solid transparent",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#e8f4fd" }}>{getDayLabel(date)}</span>
                    {isToday && <span style={{ marginLeft: 8, fontSize: 11, color: "#1e6fd9", fontWeight: 600, letterSpacing: 1 }}>TODAY</span>}
                    <div style={{ fontSize: 11, color: "#5b9bd5" }}>{date}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, marginBottom: 2 }}>{c === 0 ? "—" : hit ? "✅" : "🔵"}</div>
                    <div style={{ fontSize: 13, color: hit ? "#4ade80" : "#7bbfea", fontWeight: 600 }}>{c}/{goal}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${barPct * 100}%`,
                    background: hit ? "#22c55e" : "#1e6fd9",
                    borderRadius: 3, transition: "width 0.4s"
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#5b9bd5" }}>
            {last7.filter(d => (history[d] ?? 0) >= goal).length} / 7 days goal achieved
          </div>
        </div>
      )}
    </div>
  );
}
