import { useState, useEffect, useRef } from "react";
import DevelopersTab from "./DevelopersTab";

/* ─── DESIGN TOKENS ─────────────────────────────────────────── */
const T = {
  bg:      "#03060F",
  bg1:     "#060A18",
  bg2:     "#080E1F",
  surf:    "#0A1228",
  surf2:   "#0D1632",
  b0:      "rgba(25,50,140,0.15)",
  b1:      "rgba(50,90,220,0.25)",
  b2:      "rgba(80,120,255,0.45)",
  txt:     "#D8E8FF",
  sub:     "#6080B0",
  mut:     "#263050",
  acc:     "#3B6BF5",
  accHi:   "#7EB4FF",
  accLo:   "#1A3FC4",
  low:     "#0FD4A0",
  mod:     "#F5A623",
  high:    "#F97316",
  crit:    "#F04545",
  purple:  "#7B5CF0",
};

const BAND = {
  low:      { label:"Low",      c:T.low,  glow:"rgba(15,212,160,.3)",  bg:"rgba(15,212,160,.06)",  br:"rgba(15,212,160,.2)"  },
  moderate: { label:"Moderate", c:T.mod,  glow:"rgba(245,166,35,.3)",  bg:"rgba(245,166,35,.06)",  br:"rgba(245,166,35,.2)"  },
  high:     { label:"High",     c:T.high, glow:"rgba(249,115,22,.3)",  bg:"rgba(249,115,22,.06)",  br:"rgba(249,115,22,.2)"  },
  critical: { label:"Critical", c:T.crit, glow:"rgba(240,69,69,.35)",  bg:"rgba(240,69,69,.06)",   br:"rgba(240,69,69,.2)"   },
};
const bandOf = s => s>=80?"critical":s>=60?"high":s>=30?"moderate":"low";

/* ─── DATA ──────────────────────────────────────────────────── */
const DEVS = [
  { id:1, name:"Dev Krishnan",  h:"@dkrishnan · ml",      i:"DK", s:91, p:3, g:["#F04545","#7B5CF0"] },
  { id:2, name:"Rohan Patel",   h:"@rpatel · backend",    i:"RP", s:82, p:4, g:["#F04545","#F97316"] },
  { id:3, name:"Sneha Kumar",   h:"@skumar · frontend",   i:"SK", s:71, p:2, g:["#F97316","#F5A623"] },
  { id:4, name:"Arjun Mehta",   h:"@amehta · fullstack",  i:"AM", s:47, p:1, g:["#3B6BF5","#7B5CF0"] },
  { id:5, name:"Priya Venkat",  h:"@pvenkat · devops",    i:"PV", s:19, p:1, g:["#0FD4A0","#3B6BF5"] },
  { id:6, name:"Nisha Shah",    h:"@nshah · backend",     i:"NS", s:24, p:0, g:["#0FD4A0","#14C8C8"] },
];

const ALERTS = [
  { id:1, band:"critical", dev:"Dev Krishnan",  s:91, desc:"Night hotfix · 3 500 lines · 10 CI fails. Pause deploy.", age:"2m" },
  { id:2, band:"critical", dev:"Rohan Patel",   s:82, desc:"Hotfix label · 4 deadline tickets · cross-team changes.", age:"11m" },
  { id:3, band:"high",     dev:"Sneha Kumar",   s:71, desc:"Review gap 36 hrs · velocity spike 2.8×.", age:"28m" },
];

const HIST = [
  {d:"M",s:22},{d:"T",s:28},{d:"W",s:34},{d:"T",s:31},{d:"F",s:44},{d:"S",s:52},{d:"•",s:48}
];

const FACTORS = [
  { n:"night_commit_ratio",   v:"0.42",  p:72, c:T.crit },
  { n:"pr_lines_changed",     v:"1,840", p:58, c:T.high },
  { n:"consecutive_ci_fails", v:"4 runs",p:44, c:T.mod  },
];

const INTEGRATIONS = [
  { name:"GitHub",         s:"3 repos",      ab:"GH", bg:"#161B22", c:"#E6EDF3" },
  { name:"Jira",           s:"Sprint 12",    ab:"JR", bg:"#0052CC", c:"#4C9AFF" },
  { name:"Actions",        s:"81% pass",     ab:"GA", bg:"#0D1117", c:T.low     },
  { name:"Slack",          s:"#dev-alerts",  ab:"SL", bg:"#4A154B", c:"#ECB22E" },
];

/* ─── CAT LOGO SVG ───────────────────────────────────────────── */
function CatLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id="catGrad" cx="55%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#5B6CF0" />
          <stop offset="60%" stopColor="#2E2ABF" />
          <stop offset="100%" stopColor="#120E6B" />
        </radialGradient>
        <radialGradient id="earGrad" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#7B8FFF" />
          <stop offset="100%" stopColor="#2E2ABF" />
        </radialGradient>
        <filter id="catGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Body */}
      <ellipse cx="52" cy="68" rx="22" ry="24" fill="url(#catGrad)" filter="url(#catGlow)"/>
      {/* Head */}
      <circle cx="52" cy="42" r="20" fill="url(#catGrad)" filter="url(#catGlow)"/>
      {/* Left ear */}
      <polygon points="35,28 30,12 45,22" fill="url(#earGrad)"/>
      {/* Right ear */}
      <polygon points="65,26 72,11 60,22" fill="url(#earGrad)"/>
      {/* Ear inner left */}
      <polygon points="36,27 32,16 43,23" fill="#8090FF" opacity="0.6"/>
      {/* Ear inner right */}
      <polygon points="64,25 70,15 61,22" fill="#8090FF" opacity="0.6"/>
      {/* Tail */}
      <path d="M30,80 Q10,75 12,58 Q14,44 24,46" fill="none" stroke="url(#catGrad)" strokeWidth="7" strokeLinecap="round" filter="url(#catGlow)"/>
      {/* Eyes */}
      <ellipse cx="44" cy="40" rx="4" ry="4.5" fill="#03060F"/>
      <ellipse cx="60" cy="40" rx="4" ry="4.5" fill="#03060F"/>
      <circle cx="44" cy="39" r="1.2" fill="#5B6CF0" opacity="0.9"/>
      <circle cx="60" cy="39" r="1.2" fill="#5B6CF0" opacity="0.9"/>
      {/* Nose */}
      <polygon points="52,47 49.5,50 54.5,50" fill="#4050D0" opacity="0.8"/>
      {/* Whiskers */}
      <line x1="32" y1="49" x2="48" y2="50" stroke="#7B8FFF" strokeWidth="0.8" opacity="0.6"/>
      <line x1="32" y1="52" x2="48" y2="52" stroke="#7B8FFF" strokeWidth="0.8" opacity="0.5"/>
      <line x1="56" y1="50" x2="72" y2="49" stroke="#7B8FFF" strokeWidth="0.8" opacity="0.6"/>
      <line x1="56" y1="52" x2="72" y2="52" stroke="#7B8FFF" strokeWidth="0.8" opacity="0.5"/>
      {/* Collar */}
      <path d="M34,58 Q52,63 70,58" fill="none" stroke="#3B6BF5" strokeWidth="2.5" opacity="0.7"/>
      {/* Paws */}
      <ellipse cx="40" cy="90" rx="7" ry="4" fill="url(#catGrad)"/>
      <ellipse cx="62" cy="90" rx="7" ry="4" fill="url(#catGrad)"/>
    </svg>
  );
}

/* ─── ANIMATED BACKGROUND ───────────────────────────────────── */
function NebulaBg() {
  const ref = useRef(null);
  const anim = useRef(null);
  const cells = useRef([]);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const resize = () => { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    const C = 30, R = 22;
    cells.current = Array.from({ length: C * R }, (_, i) => ({
      c: i % C, r: Math.floor(i / C),
      p: Math.random(), sp: 0.001 + Math.random() * 0.002,
      a: 0.02, on: Math.random() < 0.05,
    }));
    const draw = () => {
      const W = cv.width, H = cv.height, cw = W / C, ch = H / R;
      ctx.clearRect(0, 0, W, H);
      cells.current.forEach(c => {
        if (c.on) { c.p += c.sp; if (c.p >= 1) { c.p = 0; c.on = Math.random() < 0.2; } c.a = Math.sin(c.p * Math.PI) * 0.13; }
        else { if (Math.random() < 0.0003) c.on = true; c.a = 0.02; }
        ctx.strokeStyle = `rgba(40,70,200,${c.a})`; ctx.lineWidth = 0.5;
        ctx.strokeRect(c.c * cw + .5, c.r * ch + .5, cw - 1, ch - 1);
        if (c.a > 0.07) { ctx.fillStyle = `rgba(30,55,180,${c.a * 0.18})`; ctx.fillRect(c.c * cw + 1, c.r * ch + 1, cw - 2, ch - 2); }
      });
      anim.current = requestAnimationFrame(draw);
    };
    anim.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(anim.current); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />;
}

/* ─── HOOKS ─────────────────────────────────────────────────── */
function useCountUp(target, dur = 1100, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, st = null;
    const to = setTimeout(() => {
      const run = ts => { if (!st) st = ts; const p = Math.min((ts - st) / dur, 1); setV(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) raf = requestAnimationFrame(run); };
      raf = requestAnimationFrame(run);
    }, delay);
    return () => { clearTimeout(to); cancelAnimationFrame(raf); };
  }, [target]);
  return v;
}

/* ─── ATOMS ─────────────────────────────────────────────────── */
function Tag({ band }) {
  const b = BAND[band];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, padding: "3px 8px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", background: b.bg, color: b.c, border: `1px solid ${b.br}` }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: b.c, boxShadow: `0 0 5px ${b.c}`, display: "inline-block" }} />
      {b.label}
    </span>
  );
}

function Ava({ i, g, sz = 28 }) {
  return (
    <div style={{ width: sz, height: sz, borderRadius: sz * 0.28, flexShrink: 0, background: `linear-gradient(135deg,${g[0]},${g[1]})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.34, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono',monospace", boxShadow: `0 2px 12px ${g[0]}44` }}>
      {i}
    </div>
  );
}

function ScoreBar({ score }) {
  const [w, setW] = useState(0);
  const b = BAND[bandOf(score)];
  useEffect(() => { const t = setTimeout(() => setW(score), 350); return () => clearTimeout(t); }, [score]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: b.c, width: 22, textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{score}</span>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, borderRadius: 2, background: b.c, boxShadow: score >= 75 ? `0 0 8px ${b.glow}` : "none", transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

/* ─── GAUGE ─────────────────────────────────────────────────── */
function Gauge({ score = 48 }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 500); return () => clearTimeout(t); }, []);
  const b = BAND[bandOf(score)];
  const cx = 110, cy = 108, r = 84;
  const pct = go ? score / 100 : 0;
  const ang = Math.PI + pct * Math.PI;
  const nx = cx + r * Math.cos(ang), ny = cy + r * Math.sin(ang);
  const seg = (f, t) => {
    const a1 = Math.PI + f * Math.PI, a2 = Math.PI + t * Math.PI;
    return `M${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} A${r},${r} 0 ${(t - f) > .5 ? 1 : 0},1 ${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)}`;
  };
  return (
    <div style={{ position: "relative", width: 220, height: 118, margin: "0 auto" }}>
      <svg width="220" height="118" viewBox="0 0 220 118">
        <path d={seg(0, 1)} fill="none" stroke="rgba(30,60,160,0.2)" strokeWidth="10" strokeLinecap="round" />
        {[[0, .3, T.low], [.3, .6, T.mod], [.6, .8, T.high], [.8, 1, T.crit]].map(([f, t, cl]) =>
          <path key={cl} d={seg(f, t)} fill="none" stroke={cl} strokeWidth="10" strokeLinecap="butt" opacity="0.18" />
        )}
        <path d={seg(0, pct)} fill="none" stroke={b.c} strokeWidth="10" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${b.c})`, transition: "all 1.3s cubic-bezier(.4,0,.2,1)" }} />
        <circle cx={go ? nx : cx - r} cy={go ? ny : cy} r="7" fill={T.bg2} stroke={b.c} strokeWidth="2.5"
          style={{ filter: `drop-shadow(0 0 8px ${b.c})`, transition: "all 1.3s cubic-bezier(.4,0,.2,1)" }} />
        {[["LOW", 18, 115, T.low], ["MOD", 100, 14, T.mod], ["HIGH", 178, 44, T.high], ["CRIT", 210, 115, T.crit]].map(([label, x, y, col]) =>
          <text key={label} x={x} y={y} fontSize="7.5" fill={col} fontFamily="JetBrains Mono" fontWeight="700" textAnchor={x > 110 ? "end" : "start"}>{label}</text>
        )}
      </svg>
      <div style={{ position: "absolute", top: "44%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: b.c, lineHeight: 1, fontFamily: "'Syne',sans-serif", textShadow: `0 0 28px ${b.c}55`, transition: "color 1.3s" }}>{score}</div>
        <div style={{ fontSize: 8, color: T.sub, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>Team SFRI</div>
      </div>
    </div>
  );
}

/* ─── BENTO CARD ─────────────────────────────────────────────── */
function BCard({ children, style = {}, delay = 0, glow = false, accent = false }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(160deg,${T.surf} 0%,${T.bg2} 100%)`,
        borderRadius: 18, border: `1px solid ${hov ? T.b1 : T.b0}`,
        overflow: "hidden", position: "relative",
        transition: "border-color 0.25s, box-shadow 0.25s, transform 0.2s",
        boxShadow: hov ? `0 0 40px rgba(30,70,220,.12), 0 8px 32px rgba(0,0,0,.4)` : `0 4px 24px rgba(0,0,0,.3)`,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        animation: `bentoIn 0.55s cubic-bezier(.4,0,.2,1) ${delay}s both`,
        ...style,
      }}>
      {/* top shimmer line */}
      {glow && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${T.accHi}50,transparent)` }} />}
      {accent && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 2, background: `linear-gradient(180deg,${T.acc},transparent)` }} />}
      {children}
    </div>
  );
}

/* ─── TOPBAR NAV ─────────────────────────────────────────────── */
const NAV_LINKS = ["Dashboard", "Developers", "PR Risk", "History", "Alerts", "Jira", "Integrations"];

function TopBar({ active, setActive, sec }) {
  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 50,
      background: `rgba(3,6,15,0.85)`,
      backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${T.b0}`,
      display: "flex", alignItems: "center", paddingInline: 24, gap: 0,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 36, flexShrink: 0 }}>
        <CatLogo size={34} />
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1, color: T.txt }}>
            Risk<span style={{ color: T.accHi }}>Lens</span>
          </div>
          <div style={{ fontSize: 7, color: T.mut, letterSpacing: "0.22em", marginTop: 1 }}>DEPLOY CO-PILOT</div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
        {NAV_LINKS.map(n => {
          const isActive = active === n;
          return (
            <button key={n} onClick={() => setActive(n)} style={{
              padding: "6px 13px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 11, fontFamily: "'JetBrains Mono',monospace", fontWeight: isActive ? 700 : 400,
              background: isActive ? "rgba(59,107,245,0.15)" : "transparent",
              color: isActive ? T.accHi : T.sub,
              transition: "all 0.15s",
              position: "relative",
            }}>
              {n}
              {n === "Alerts" && <span style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: "50%", background: T.crit, boxShadow: `0 0 7px ${T.crit}`, animation: "blink 2s infinite" }} />}
              {isActive && <div style={{ position: "absolute", bottom: -1, left: "20%", right: "20%", height: 1.5, background: T.accHi, borderRadius: 1 }} />}
            </button>
          );
        })}
      </nav>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Live badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(15,212,160,0.07)", border: "1px solid rgba(15,212,160,0.18)", fontSize: 9, color: T.low, letterSpacing: "0.08em" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.low, boxShadow: `0 0 8px ${T.low}`, animation: "blink 1.5s infinite" }} />
          LIVE · {sec}s
        </div>
        {/* Run Analysis */}
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", cursor: "pointer", background: `linear-gradient(135deg,${T.acc},${T.accLo})`, color: "white", border: "none", fontWeight: 700, letterSpacing: "0.05em", boxShadow: "0 0 20px rgba(59,107,245,0.4)", transition: "all 0.15s" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
          Run Analysis
        </button>
        {/* Avatar */}
        <Ava i="AM" g={[T.acc, T.purple]} sz={32} />
      </div>
    </header>
  );
}

/* ─── MAIN DASHBOARD ─────────────────────────────────────────── */
export default function RiskLensDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [sec, setSec] = useState(0);
  const teamScore = useCountUp(48, 1300, 400);
  const ciRate = useCountUp(81, 1100, 600);
  const hiPRs = useCountUp(3, 600, 300);
  const nightC = useCountUp(7, 700, 500);

  useEffect(() => { const id = setInterval(() => setSec(s => s + 1), 1000); return () => clearInterval(id); }, []);

  const KPI = [
    { label: "Team SFRI",     val: `${teamScore}`, band: "moderate", trend: "+12", trendUp: true,  sub: "vs yesterday",   ac: T.acc  },
    { label: "High Risk PRs", val: `${hiPRs}`,     band: "high",     trend: "+2",  trendUp: true,  sub: "open now",       ac: T.high },
    { label: "Night Commits", val: `${nightC}`,    band: "moderate", trend: "+3",  trendUp: true,  sub: "last 24 hrs",    ac: T.mod  },
    { label: "CI Pass Rate",  val: `${ciRate}%`,   band: "low",      trend: "+4%", trendUp: false, sub: "7-day rolling",  ac: T.low  },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.txt, fontFamily: "'JetBrains Mono',monospace", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(59,107,245,0.2);border-radius:2px}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes bentoIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanX{0%{left:-100%}100%{left:100%}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .dev-row:hover{background:rgba(40,80,220,0.06)!important}
        .alert-row:hover{background:rgba(255,255,255,0.015)!important}
        .int-tile:hover{border-color:rgba(59,107,245,0.4)!important;transform:translateY(-2px)}
        button:hover{opacity:0.88}
      `}</style>

      <NebulaBg />

      {/* ── Ambient orbs ── */}
      <div style={{ position: "fixed", top: "15%", left: "8%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,107,245,0.07) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "10%", right: "5%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(123,92,240,0.06) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <TopBar active={activeNav} setActive={setActiveNav} sec={sec} />

      {/* ══════════════ PAGE CONTENT ══════════════ */}
      <main style={{ paddingTop: 80, position: "relative", zIndex: 1 }}>

        {/* Developers tab */}
        {activeNav === "Developers" && <DevelopersTab />}

        {/* Dashboard tab (bento grid) */}
        {activeNav !== "Developers" && <div style={{ paddingInline: 24, paddingBottom: 48 }}>

        {/* ── Row 1: KPI 4-up ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
          {KPI.map((k, i) => {
            const b = BAND[k.band];
            return (
              <BCard key={i} delay={0.05 + i * 0.07} style={{ padding: "20px 22px" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg,${k.ac}cc,transparent)` }} />
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 50, background: `linear-gradient(180deg,${k.ac}0a,transparent)`, pointerEvents: "none" }} />
                <div style={{ fontSize: 8, color: T.mut, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>{k.label}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800, color: b.c, lineHeight: 1, marginBottom: 10, textShadow: `0 0 24px ${b.c}44` }}>{k.val}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: T.sub }}>
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700, background: k.trendUp ? "rgba(240,69,69,0.1)" : "rgba(15,212,160,0.1)", color: k.trendUp ? T.crit : T.low }}>{k.trend}</span>
                  {k.sub}
                </div>
              </BCard>
            );
          })}
        </div>

        {/* ── Row 2: Big 3-column bento ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 0.9fr", gap: 14, marginBottom: 14 }}>

          {/* ── Developer table (tall, left) ── */}
          <BCard delay={0.28} glow style={{ gridRow: "span 1" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${T.b0}` }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>Developer Risk Index</div>
                <div style={{ fontSize: 9, color: T.sub, marginTop: 2 }}>SFRI · 6 active contributors</div>
              </div>
              <Tag band="high" />
            </div>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 60px", padding: "8px 20px", gap: 10, fontSize: 8, color: T.mut, textTransform: "uppercase", letterSpacing: "0.12em", background: "rgba(5,10,30,0.5)", borderBottom: `1px solid ${T.b0}` }}>
              <span>Developer</span><span>SFRI</span><span>Band</span><span>PRs</span>
            </div>
            {/* Rows */}
            {DEVS.map((dev, i) => (
              <div key={dev.id} className="dev-row" style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 60px", alignItems: "center", padding: "12px 20px", gap: 10, borderBottom: i < DEVS.length - 1 ? `1px solid ${T.b0}` : "none", cursor: "pointer", transition: "background 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Ava i={dev.i} g={dev.g} sz={28} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.txt }}>{dev.name}</div>
                    <div style={{ fontSize: 9, color: T.sub, marginTop: 1 }}>{dev.h}</div>
                  </div>
                </div>
                <ScoreBar score={dev.s} />
                <Tag band={bandOf(dev.s)} />
                <span style={{ fontSize: 11, color: T.sub }}>{dev.p}</span>
              </div>
            ))}
          </BCard>

          {/* ── Middle column: Gauge + History ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Gauge hero */}
            <BCard delay={0.34} glow style={{ padding: "22px 20px 18px", flex: "0 0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700 }}>Team SFRI</div>
                  <div style={{ fontSize: 9, color: T.sub, marginTop: 2 }}>Silent Failure Risk Index</div>
                </div>
                <Tag band="moderate" />
              </div>
              <Gauge score={48} />
              {/* Factors */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 8, color: T.mut, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Top Risk Signals</div>
                {FACTORS.map(f => (
                  <div key={f.n} style={{ marginBottom: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 4 }}>
                      <span style={{ color: T.sub }}>{f.n}</span>
                      <span style={{ color: T.txt, fontWeight: 600 }}>{f.v}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${f.p}%`, background: f.c, borderRadius: 2, transition: "width 1.1s cubic-bezier(.4,0,.2,1) 0.6s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </BCard>

            {/* Recommendation */}
            <BCard delay={0.38} accent style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(59,107,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>💡</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.accHi, marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>Recommended Action</div>
                  <div style={{ fontSize: 9, color: T.sub, lineHeight: 1.7 }}>Require 2+ reviewers on open PRs. Delay DK's deploy 4+ hrs. Flag Rohan's hotfix for senior review.</div>
                </div>
              </div>
            </BCard>
          </div>

          {/* ── Right column: Alerts + 7-day history ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Live alerts */}
            <BCard delay={0.42} style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${T.b0}` }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700 }}>Live Alerts</div>
                  <div style={{ fontSize: 9, color: T.sub, marginTop: 2 }}>SFRI ≥ 75 · Slack-wired</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: T.low, padding: "3px 9px", borderRadius: 20, background: "rgba(15,212,160,0.07)", border: "1px solid rgba(15,212,160,0.18)" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.low, animation: "blink 1.5s infinite" }} />
                  3 active
                </div>
              </div>
              {ALERTS.map((a, i) => {
                const b = BAND[a.band];
                return (
                  <div key={a.id} className="alert-row" style={{ display: "flex", gap: 10, padding: "12px 18px", borderBottom: i < ALERTS.length - 1 ? `1px solid ${T.b0}` : "none", cursor: "pointer", transition: "background 0.15s" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: b.c, boxShadow: `0 0 8px ${b.glow}`, flexShrink: 0, marginTop: 4, animation: a.band === "critical" ? "blink 2s infinite" : "none" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>
                        <span style={{ color: b.c }}>{b.label.toUpperCase()} </span>
                        <span style={{ color: T.txt }}>— {a.dev}</span>
                      </div>
                      <div style={{ fontSize: 9, color: T.sub, lineHeight: 1.5 }}>{a.desc}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 8, color: T.mut }}>{a.age}</span>
                        <span style={{ fontSize: 8, color: T.low }}>Slack ✓</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </BCard>

            {/* 7-day mini chart */}
            <BCard delay={0.46} style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700 }}>7-Day Trend</div>
                <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 3, background: "rgba(245,166,35,0.08)", color: T.mod, border: "1px solid rgba(245,166,35,0.2)", fontWeight: 700, letterSpacing: "0.1em" }}>↑ RISING</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
                {HIST.map((d, i) => {
                  const b = BAND[bandOf(d.s)];
                  const maxS = Math.max(...HIST.map(x => x.s));
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ width: "100%", borderRadius: "3px 3px 0 0", height: `${(d.s / maxS) * 100}%`, minHeight: 3, background: d.d === "•" ? b.c : `${b.c}70`, boxShadow: d.d === "•" ? `0 0 12px ${b.glow}` : "none", transition: `height 0.85s cubic-bezier(.4,0,.2,1) ${i * 0.08}s` }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {HIST.map(d => <div key={d.d} style={{ flex: 1, textAlign: "center", fontSize: 8, color: d.d === "•" ? T.sub : T.mut }}>{d.d}</div>)}
              </div>
            </BCard>
          </div>
        </div>

        {/* ── Row 3: Integrations full-width bento ── */}
        <BCard delay={0.5} glow>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", borderBottom: `1px solid ${T.b0}` }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700 }}>Connected Integrations</div>
              <div style={{ fontSize: 9, color: T.sub, marginTop: 2 }}>4 of 4 sources active · auto-sync 60s</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: T.low }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.low, boxShadow: `0 0 6px ${T.low}` }} />
              All systems nominal
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "14px 20px" }}>
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="int-tile" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 12, background: T.bg2, border: `1px solid ${T.b0}`, cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: int.bg, border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: int.c, fontFamily: "'JetBrains Mono',monospace", boxShadow: `0 0 14px ${int.c}22` }}>{int.ab}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.txt }}>{int.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.low }} />
                    <span style={{ fontSize: 9, color: T.low }}>{int.s}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BCard>

        </div>}

      </main>
    </div>
  );
}