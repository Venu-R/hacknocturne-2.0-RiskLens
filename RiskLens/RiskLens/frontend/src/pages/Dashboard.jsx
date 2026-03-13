import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/index";
import { DEMO_SCENARIOS, DEMO_TEAM_OPTIONS } from "../data/demoScenarios";

/* ─── DESIGN TOKENS ─────────────────────────────────────────── */
const T = {
  bg:     "#03060F",
  bg1:    "#060A18",
  bg2:    "#080E1F",
  surf:   "#0A1228",
  surf2:  "#0D1632",
  b0:     "rgba(25,50,140,0.15)",
  b1:     "rgba(50,90,220,0.25)",
  b2:     "rgba(80,120,255,0.45)",
  txt:    "#D8E8FF",
  sub:    "#6080B0",
  mut:    "#263050",
  acc:    "#3B6BF5",
  accHi:  "#7EB4FF",
  accLo:  "#1A3FC4",
  low:    "#0FD4A0",
  mod:    "#F5A623",
  high:   "#F97316",
  crit:   "#F04545",
  purple: "#7B5CF0",
};

const DARK_THEME = { ...T };
const LIGHT_THEME = {
  bg: "#F3F7FF",
  bg1: "#EAF2FF",
  bg2: "#FFFFFF",
  surf: "#FFFFFF",
  surf2: "#F4F8FF",
  b0: "rgba(120,150,220,0.20)",
  b1: "rgba(70,110,220,0.35)",
  b2: "rgba(60,100,220,0.50)",
  txt: "#132243",
  sub: "#3F5F95",
  mut: "#8EA4C8",
  acc: "#2E61EE",
  accHi: "#4E82FF",
  accLo: "#1C43B9",
  low: "#0AAB7D",
  mod: "#C27B13",
  high: "#D46A1D",
  crit: "#C53B3B",
  purple: "#6D50E0",
};

const BAND = {
  low:      { label:"Low",      c:T.low,  glow:"rgba(15,212,160,.3)",  bg:"rgba(15,212,160,.06)",  br:"rgba(15,212,160,.2)"  },
  moderate: { label:"Moderate", c:T.mod,  glow:"rgba(245,166,35,.3)",  bg:"rgba(245,166,35,.06)",  br:"rgba(245,166,35,.2)"  },
  high:     { label:"High",     c:T.high, glow:"rgba(249,115,22,.3)",  bg:"rgba(249,115,22,.06)",  br:"rgba(249,115,22,.2)"  },
  critical: { label:"Critical", c:T.crit, glow:"rgba(240,69,69,.35)",  bg:"rgba(240,69,69,.06)",   br:"rgba(240,69,69,.2)"   },
};
const bandOf = s => s>=80?"critical":s>=60?"high":s>=30?"moderate":"low";

function applyTheme(mode) {
  const selected = mode === "light" ? LIGHT_THEME : DARK_THEME;
  Object.assign(T, selected);
  Object.assign(BAND.low,      { c:T.low,  glow:`${T.low}55`,  bg:`${T.low}12`,  br:`${T.low}40`  });
  Object.assign(BAND.moderate, { c:T.mod,  glow:`${T.mod}55`,  bg:`${T.mod}12`,  br:`${T.mod}40`  });
  Object.assign(BAND.high,     { c:T.high, glow:`${T.high}55`, bg:`${T.high}12`, br:`${T.high}40` });
  Object.assign(BAND.critical, { c:T.crit, glow:`${T.crit}66`, bg:`${T.crit}12`, br:`${T.crit}40` });
}

/* ─── STATIC DEMO DATA ──────────────────────────────────────── */
const FALLBACK_DEVS = [
  { id:1, name:"Dev Krishnan",  h:"@dkrishnan · ml",      i:"DK", s:91, p:3, g:["#F04545","#7B5CF0"] },
  { id:2, name:"Rohan Patel",   h:"@rpatel · backend",    i:"RP", s:82, p:4, g:["#F04545","#F97316"] },
  { id:3, name:"Sneha Kumar",   h:"@skumar · frontend",   i:"SK", s:71, p:2, g:["#F97316","#F5A623"] },
  { id:4, name:"Arjun Mehta",   h:"@amehta · fullstack",  i:"AM", s:47, p:1, g:["#3B6BF5","#7B5CF0"] },
  { id:5, name:"Priya Venkat",  h:"@pvenkat · devops",    i:"PV", s:19, p:1, g:["#0FD4A0","#3B6BF5"] },
  { id:6, name:"Nisha Shah",    h:"@nshah · backend",     i:"NS", s:24, p:0, g:["#0FD4A0","#14C8C8"] },
];

const ALERTS_DATA = [
  { id:1, band:"critical", dev:"Dev Krishnan",  s:91, desc:"Night hotfix · 3,500 lines · 10 CI fails. Pause deploy.", age:"2m" },
  { id:2, band:"critical", dev:"Rohan Patel",   s:82, desc:"Hotfix label · 4 deadline tickets · cross-team changes.", age:"11m" },
  { id:3, band:"high",     dev:"Sneha Kumar",   s:71, desc:"Review gap 36 hrs · velocity spike 2.8×.", age:"28m" },
];

const FACTORS = [
  { n:"night_commit_ratio",   v:"0.42",  p:72, c:T.crit },
  { n:"pr_lines_changed",     v:"1,840", p:58, c:T.high },
  { n:"consecutive_ci_fails", v:"4 runs",p:44, c:T.mod  },
];

const INTEGRATIONS = [
  { name:"GitHub",  s:"3 repos",     ab:"GH", bg:"#161B22", c:"#E6EDF3" },
  { name:"Jira",    s:"Sprint 12",   ab:"JR", bg:"#0052CC", c:"#4C9AFF" },
  { name:"Actions", s:"81% pass",    ab:"GA", bg:"#0D1117", c:T.low     },
  { name:"Slack",   s:"#dev-alerts", ab:"SL", bg:"#4A154B", c:"#ECB22E" },
];

const FALLBACK_GITHUB_EVENTS = [
  { type:"PR",    label:"#4471 payments: hotfix rate-limit bypass", branch:"hotfix/rate-limit", score:91, time:"2m ago",  band:"critical" },
  { type:"PUSH",  label:"auth-service: 6 commits off-hours",        branch:"main",              score:82, time:"11m ago", band:"critical" },
  { type:"PR",    label:"#4468 frontend: checkout flow refactor",   branch:"feat/checkout",     score:71, time:"28m ago", band:"high"     },
  { type:"MERGE", label:"#4465 notifications: bump deps",           branch:"main",              score:18, time:"1h ago",  band:"low"      },
];

const JIRA_TICKETS = [
  { id:"PAY-891",  title:"Rate limit bypass investigation",   status:"In Progress", linked:true,  pr:"#4471", churn:3, band:"critical" },
  { id:"AUTH-204", title:"Session token rotation — deadline", status:"Review",      linked:true,  pr:"#4472", churn:4, band:"critical" },
  { id:"FE-312",   title:"Checkout flow redesign",            status:"In Review",   linked:true,  pr:"#4468", churn:1, band:"high"     },
  { id:"PLAT-77",  title:"Dep bump notification service",     status:"Done",        linked:true,  pr:"#4465", churn:0, band:"low"      },
  { id:"AUTH-199", title:"MFA fallback edge case",            status:"Open",        linked:false, pr:null,    churn:2, band:"moderate" },
];

const SLACK_SIGNALS = [
  { ch:"#payments",  msg:"Hold off on payments module until Thursday — pending compliance sign-off", author:"priya.v", time:"2d ago",  flagged:true,  match:"payments-api" },
  { ch:"#auth-team", msg:"MFA fallback still flaky, don't ship auth changes without my review",     author:"dev.k",   time:"6h ago",  flagged:true,  match:"auth-service" },
  { ch:"#deploys",   msg:"Staging looks clean, CI green across the board",                           author:"nisha.s", time:"1h ago",  flagged:false, match:null           },
  { ch:"#incidents", msg:"March SEV-2 postmortem: always link Jira before payments deploys",        author:"arjun.m", time:"18d ago", flagged:false, match:"payments-api" },
];

function toRelativeTime(iso) {
  if (!iso) return "now";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "now";
  const diffMs = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function gradientForScore(score) {
  if (score >= 80) return ["#F04545", "#7B5CF0"];
  if (score >= 60) return ["#F97316", "#F5A623"];
  if (score >= 30) return ["#3B6BF5", "#7B5CF0"];
  return ["#0FD4A0", "#14C8C8"];
}

function scoreFromPull(pull) {
  const changes = (pull?.additions || 0) + (pull?.deletions || 0);
  const files = pull?.changed_files || 0;
  const hotfix = (pull?.labels || []).some((l) => /hotfix|urgent|critical/i.test(l));
  const raw = Math.min(100, Math.round(changes / 80 + files * 3 + (hotfix ? 25 : 0)));
  return raw;
}

function buildCommitPressureTrend(commits) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const counts = new Array(7).fill(0);
  commits.forEach((c) => {
    const ts = new Date(c?.timestamp || c?.date || c?.created_at || 0);
    if (Number.isNaN(ts.getTime())) return;
    ts.setHours(0, 0, 0, 0);
    const idx = days.findIndex((d) => d.getTime() === ts.getTime());
    if (idx >= 0) counts[idx] += 1;
  });

  return days.map((d, idx) => {
    const c = counts[idx];
    return {
      d: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      s: Math.min(100, 10 + c * 14),
      count: c,
      iso: d.toISOString(),
    };
  });
}

function toDeveloperRow(member, idx) {
  const login = member?.login;
  if (!login || login === "unknown") return null;
  const score = Number(member?.score || 0);
  return {
    id: idx + 1,
    name: login,
    h: `@${login} · contributor`,
    i: login.slice(0, 2).toUpperCase(),
    s: score,
    p: Number(member?.commits_7d || 0),
    g: gradientForScore(score),
  };
}

/* ─── CAT LOGO SVG ──────────────────────────────────────────── */
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
      <ellipse cx="52" cy="68" rx="22" ry="24" fill="url(#catGrad)" filter="url(#catGlow)"/>
      <circle cx="52" cy="42" r="20" fill="url(#catGrad)" filter="url(#catGlow)"/>
      <polygon points="35,28 30,12 45,22" fill="url(#earGrad)"/>
      <polygon points="65,26 72,11 60,22" fill="url(#earGrad)"/>
      <polygon points="36,27 32,16 43,23" fill="#8090FF" opacity="0.6"/>
      <polygon points="64,25 70,15 61,22" fill="#8090FF" opacity="0.6"/>
      <path d="M30,80 Q10,75 12,58 Q14,44 24,46" fill="none" stroke="url(#catGrad)" strokeWidth="7" strokeLinecap="round" filter="url(#catGlow)"/>
      <ellipse cx="44" cy="40" rx="4" ry="4.5" fill="#03060F"/>
      <ellipse cx="60" cy="40" rx="4" ry="4.5" fill="#03060F"/>
      <circle cx="44" cy="39" r="1.2" fill="#5B6CF0" opacity="0.9"/>
      <circle cx="60" cy="39" r="1.2" fill="#5B6CF0" opacity="0.9"/>
      <polygon points="52,47 49.5,50 54.5,50" fill="#4050D0" opacity="0.8"/>
      <line x1="32" y1="49" x2="48" y2="50" stroke="#7B8FFF" strokeWidth="0.8" opacity="0.6"/>
      <line x1="32" y1="52" x2="48" y2="52" stroke="#7B8FFF" strokeWidth="0.8" opacity="0.5"/>
      <line x1="56" y1="50" x2="72" y2="49" stroke="#7B8FFF" strokeWidth="0.8" opacity="0.6"/>
      <line x1="56" y1="52" x2="72" y2="52" stroke="#7B8FFF" strokeWidth="0.8" opacity="0.5"/>
      <path d="M34,58 Q52,63 70,58" fill="none" stroke="#3B6BF5" strokeWidth="2.5" opacity="0.7"/>
      <ellipse cx="40" cy="90" rx="7" ry="4" fill="url(#catGrad)"/>
      <ellipse cx="62" cy="90" rx="7" ry="4" fill="url(#catGrad)"/>
    </svg>
  );
}

/* ─── ANIMATED GRID BG ──────────────────────────────────────── */
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
  return <canvas ref={ref} style={{ position:"fixed", inset:0, width:"100%", height:"100%", zIndex:0, pointerEvents:"none" }}/>;
}

/* ─── COUNT UP HOOK ─────────────────────────────────────────── */
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
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:9, padding:"3px 8px", borderRadius:4, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", background:b.bg, color:b.c, border:`1px solid ${b.br}` }}>
      <span style={{ width:4, height:4, borderRadius:"50%", background:b.c, boxShadow:`0 0 5px ${b.c}`, display:"inline-block" }}/>
      {b.label}
    </span>
  );
}

function Ava({ i, g, sz = 28 }) {
  return (
    <div style={{ width:sz, height:sz, borderRadius:sz*0.28, flexShrink:0, background:`linear-gradient(135deg,${g[0]},${g[1]})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:sz*0.34, fontWeight:700, color:"#fff", fontFamily:"'JetBrains Mono',monospace", boxShadow:`0 2px 12px ${g[0]}44` }}>
      {i}
    </div>
  );
}

function ScoreBar({ score }) {
  const [w, setW] = useState(0);
  const b = BAND[bandOf(score)];
  useEffect(() => { const t = setTimeout(() => setW(score), 350); return () => clearTimeout(t); }, [score]);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ fontSize:12, fontWeight:700, color:b.c, width:22, textAlign:"right", fontFamily:"'JetBrains Mono',monospace" }}>{score}</span>
      <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.05)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${w}%`, borderRadius:2, background:b.c, boxShadow:score>=75?`0 0 8px ${b.glow}`:"none", transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
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
    return `M${cx+r*Math.cos(a1)},${cy+r*Math.sin(a1)} A${r},${r} 0 ${(t-f)>.5?1:0},1 ${cx+r*Math.cos(a2)},${cy+r*Math.sin(a2)}`;
  };
  return (
    <div style={{ position:"relative", width:220, height:118, margin:"0 auto" }}>
      <svg width="220" height="118" viewBox="0 0 220 118">
        <path d={seg(0,1)} fill="none" stroke="rgba(30,60,160,0.2)" strokeWidth="10" strokeLinecap="round"/>
        {[[0,.3,T.low],[.3,.6,T.mod],[.6,.8,T.high],[.8,1,T.crit]].map(([f,t,cl]) =>
          <path key={cl} d={seg(f,t)} fill="none" stroke={cl} strokeWidth="10" strokeLinecap="butt" opacity="0.18"/>
        )}
        <path d={seg(0,pct)} fill="none" stroke={b.c} strokeWidth="10" strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 8px ${b.c})`, transition:"all 1.3s cubic-bezier(.4,0,.2,1)" }}/>
        <circle cx={go?nx:cx-r} cy={go?ny:cy} r="7" fill={T.bg2} stroke={b.c} strokeWidth="2.5"
          style={{ filter:`drop-shadow(0 0 8px ${b.c})`, transition:"all 1.3s cubic-bezier(.4,0,.2,1)" }}/>
        {[["LOW",18,115,T.low],["MOD",100,14,T.mod],["HIGH",178,44,T.high],["CRIT",210,115,T.crit]].map(([label,x,y,col]) =>
          <text key={label} x={x} y={y} fontSize="7.5" fill={col} fontFamily="JetBrains Mono" fontWeight="700" textAnchor={x>110?"end":"start"}>{label}</text>
        )}
      </svg>
      <div style={{ position:"absolute", top:"44%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
        <div style={{ fontSize:40, fontWeight:800, color:b.c, lineHeight:1, fontFamily:"'Syne',sans-serif", textShadow:`0 0 28px ${b.c}55`, transition:"color 1.3s" }}>{score}</div>
        <div style={{ fontSize:8, color:T.sub, letterSpacing:"0.18em", textTransform:"uppercase", marginTop:3, fontFamily:"'JetBrains Mono',monospace" }}>Team SFRI</div>
      </div>
    </div>
  );
}

/* ─── BENTO CARD ─────────────────────────────────────────────── */
function BCard({ children, style={}, delay=0, glow=false, accent=false }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background:`linear-gradient(160deg,${T.surf} 0%,${T.bg2} 100%)`,
        borderRadius:18, border:`1px solid ${hov?T.b1:T.b0}`,
        overflow:"hidden", position:"relative",
        transition:"border-color 0.25s, box-shadow 0.25s, transform 0.2s",
        boxShadow:hov?`0 0 40px rgba(30,70,220,.12), 0 8px 32px rgba(0,0,0,.4)`:`0 4px 24px rgba(0,0,0,.3)`,
        transform:hov?"translateY(-2px)":"translateY(0)",
        animation:`bentoIn 0.55s cubic-bezier(.4,0,.2,1) ${delay}s both`,
        ...style,
      }}>
      {glow && <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${T.accHi}50,transparent)` }}/>}
      {accent && <div style={{ position:"absolute", top:0, left:0, bottom:0, width:2, background:`linear-gradient(180deg,${T.acc},transparent)` }}/>}
      {children}
    </div>
  );
}

/* ─── NAV ────────────────────────────────────────────────────── */
const NAV_LINKS = ["Dashboard","Developers","GitHub","Jira","Slack","Alerts"];

function TopBar({
  active,
  setActive,
  sec,
  user,
  onLogout,
  onRunAnalysis,
  analyzing,
  themeMode,
  onToggleTheme,
  hasActiveAlerts,
  demoMode,
  onToggleDemoMode,
  selectedTeam,
  onSelectTeam,
}) {
  const initials = user?.username ? user.username.slice(0,2).toUpperCase() : "??";
  return (
    <header style={{
      position:"fixed", top:0, left:0, right:0, height:56, zIndex:50,
      background: themeMode === "light" ? "#F3F7FF" : "rgba(3,6,15,0.9)",
      backdropFilter: themeMode === "light" ? "none" : "blur(20px)",
      borderBottom:`1px solid ${T.b0}`,
      boxShadow: themeMode === "light" ? "0 1px 0 rgba(120,150,220,0.18)" : "none",
      display:"flex", alignItems:"center", paddingInline:24, gap:0,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:36, flexShrink:0 }}>
        <CatLogo size={34}/>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, letterSpacing:"-0.3px", lineHeight:1, color:"#D8E8FF" }}>
            Risk<span style={{ color:"#7EB4FF" }}>Lens</span>
          </div>
        </div>
      </div>

      <nav style={{ display:"flex", alignItems:"center", gap:2, flex:1 }}>
        {NAV_LINKS.map(n => {
          const isActive = active === n;
          return (
            <button key={n} onClick={() => setActive(n)} style={{
              padding:"6px 13px", borderRadius:8, border:"none", cursor:"pointer",
              fontSize:11, fontFamily:"'JetBrains Mono',monospace", fontWeight:isActive?700:400,
              background:isActive?"rgba(59,107,245,0.15)":"transparent",
              color:isActive?T.accHi:T.sub, transition:"all 0.15s", position:"relative",
            }}>
              {n}
              {n==="Alerts" && hasActiveAlerts && <span style={{ position:"absolute", top:4, right:4, width:5, height:5, borderRadius:"50%", background:T.crit, boxShadow:`0 0 7px ${T.crit}`, animation:"blink 2s infinite" }}/>}
              {isActive && <div style={{ position:"absolute", bottom:-1, left:"20%", right:"20%", height:1.5, background:T.accHi, borderRadius:1 }}/>}
            </button>
          );
        })}
      </nav>

      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <button
          onClick={onToggleTheme}
          title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
          style={{ border:`1px solid ${T.b1}`, background:"transparent", color:T.sub, borderRadius:8, padding:"6px 10px", fontSize:10, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}
        >
          {themeMode === "dark" ? "Light" : "Dark"}
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, background:"rgba(15,212,160,0.07)", border:"1px solid rgba(15,212,160,0.18)", fontSize:9, color:T.low, letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace" }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:T.low, boxShadow:`0 0 8px ${T.low}`, animation:"blink 1.5s infinite" }}/>
          LIVE · {sec}s
        </div>
        <button
          onClick={onToggleDemoMode}
          style={{ border:`1px solid ${demoMode ? T.accHi : T.b1}`, background:demoMode?"rgba(59,107,245,0.14)":"transparent", color:demoMode?T.accHi:T.sub, borderRadius:8, padding:"6px 10px", fontSize:10, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}
        >
          {demoMode ? "Demo: ON" : "Demo: OFF"}
        </button>
        <select
          value={selectedTeam}
          onChange={(e) => onSelectTeam(e.target.value)}
          disabled={!demoMode}
          style={{ border:`1px solid ${T.b1}`, background:"transparent", color:T.sub, borderRadius:8, padding:"6px 8px", fontSize:10, fontFamily:"'JetBrains Mono',monospace", opacity:demoMode?1:0.6 }}
        >
          {DEMO_TEAM_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button onClick={onRunAnalysis} disabled={analyzing} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:8, fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:analyzing?"not-allowed":"pointer", background:analyzing?"rgba(59,107,245,0.3)":`linear-gradient(135deg,${T.acc},${T.accLo})`, color:"white", border:"none", fontWeight:700, letterSpacing:"0.05em", boxShadow:"0 0 20px rgba(59,107,245,0.4)", transition:"all 0.15s", opacity:analyzing?0.7:1 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
          {analyzing ? "Analyzing..." : "Run Analysis"}
        </button>
        {/* User + Logout */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Ava i={initials} g={[T.acc, T.purple]} sz={32}/>
          <span style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{user?.username}</span>
          <button onClick={onLogout} title="Logout" style={{ background:"none", border:"none", cursor:"pointer", color:T.sub, fontSize:10, padding:"4px 8px", borderRadius:6, transition:"all 0.15s" }}
            onMouseEnter={e => e.target.style.color=T.crit} onMouseLeave={e => e.target.style.color=T.sub}>
            ⎋ out
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─── DEVELOPERS TAB ─────────────────────────────────────────── */
function DevelopersTab({ developers, loading, githubConnected }) {
  const rows = developers;
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.txt, marginBottom:4 }}>Developer Risk Index</div>
        <div style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>SFRI per contributor · 6 active · live</div>
      </div>
      <BCard delay={0.05} glow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 180px 100px 60px", padding:"10px 20px", gap:10, fontSize:8, color:T.mut, textTransform:"uppercase", letterSpacing:"0.12em", background:"rgba(5,10,30,0.5)", borderBottom:`1px solid ${T.b0}` }}>
          <span>Developer</span><span>SFRI</span><span>Band</span><span>PRs</span>
        </div>
        {loading && (
          <div style={{ padding:"16px 20px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>
            Loading contributors from GitHub...
          </div>
        )}
        {!loading && !githubConnected && (
          <div style={{ padding:"16px 20px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>
            Connect GitHub to view contributor risk.
          </div>
        )}
        {!loading && githubConnected && rows.length === 0 && (
          <div style={{ padding:"16px 20px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>
            No contributor data available yet for this repository.
          </div>
        )}
        {!loading && rows.map((dev, i) => (
          <div key={dev.id} style={{ display:"grid", gridTemplateColumns:"1fr 180px 100px 60px", alignItems:"center", padding:"14px 20px", gap:10, borderBottom:i<rows.length-1?`1px solid ${T.b0}`:"none", cursor:"pointer", transition:"background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(40,80,220,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Ava i={dev.i} g={dev.g} sz={32}/>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:T.txt }}>{dev.name}</div>
                <div style={{ fontSize:9, color:T.sub, marginTop:2 }}>{dev.h}</div>
              </div>
            </div>
            <ScoreBar score={dev.s}/>
            <Tag band={bandOf(dev.s)}/>
            <span style={{ fontSize:11, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{dev.p}</span>
          </div>
        ))}
      </BCard>
    </div>
  );
}

/* ─── GITHUB TAB ─────────────────────────────────────────────── */
function GithubTab({ repos, githubEvents, repoStats, loading, githubConnected }) {
  const liveRepoStats = repoStats;
  const events = githubEvents;
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.txt, marginBottom:4 }}>GitHub Activity</div>
        <div style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{repos.length||3} repos · Live sync</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <BCard delay={0.05} glow>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.b0}` }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.txt }}>Recent PR Events</div>
            <div style={{ fontSize:9, color:T.sub, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>live · auto-scored on open</div>
          </div>
          {loading && (
            <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>
              Loading GitHub events...
            </div>
          )}
          {!loading && !githubConnected && (
            <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>
              Connect GitHub to view activity.
            </div>
          )}
          {!loading && githubConnected && events.length === 0 && (
            <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>
              No recent PR or commit events found.
            </div>
          )}
          {!loading && events.map((e,i) => {
            const b = BAND[e.band];
            return (
              <div key={i} style={{ display:"flex", gap:12, padding:"13px 18px", borderBottom:i<events.length-1?`1px solid ${T.b0}`:undefined, cursor:"pointer" }}>
                <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:b.bg, border:`1px solid ${b.br}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:8, fontWeight:700, color:b.c, fontFamily:"'JetBrains Mono',monospace" }}>{e.type}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, color:T.txt, fontWeight:500, marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.label}</div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:9, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>→ {e.branch}</span>
                    <span style={{ fontSize:8, color:T.sub }}>{e.time}</span>
                  </div>
                </div>
                <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:b.c, fontFamily:"'JetBrains Mono',monospace" }}>{e.score}</span>
                  <Tag band={e.band}/>
                </div>
              </div>
            );
          })}
        </BCard>
        <BCard delay={0.1} glow>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.b0}` }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.txt }}>Repo Health</div>
            <div style={{ fontSize:9, color:T.sub, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>SFRI per repository</div>
          </div>
          {loading && (
            <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>
              Loading repository health...
            </div>
          )}
          {!loading && liveRepoStats.map((r,i) => (
            <div key={i} style={{ padding:"12px 18px", borderBottom:i<liveRepoStats.length-1?`1px solid ${T.b0}`:undefined }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:T.txt, fontFamily:"'JetBrains Mono',monospace" }}>{r.name}</div>
                  <div style={{ fontSize:9, color:T.sub, marginTop:1 }}>{r.commits} commits · {r.openPRs} open PRs · {r.failRate}% CI fail</div>
                </div>
                <Tag band={bandOf(r.sfri)}/>
              </div>
              <ScoreBar score={r.sfri}/>
            </div>
          ))}
        </BCard>
      </div>
    </div>
  );
}

/* ─── JIRA TAB ───────────────────────────────────────────────── */
function JiraTab({ jiraIssues, jiraSummary, jiraLoading, jiraConnected }) {
  const statusColor = { "In Progress":T.accHi, "Review":T.mod, "In Review":T.mod, "Done":T.low, "Open":T.sub };
  const rows = jiraIssues || [];
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.txt, marginBottom:4 }}>Jira Tickets</div>
        <div style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{jiraConnected ? `${rows.length} active issues · live` : "Connect Jira to load ticket data"}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:14 }}>
        <BCard delay={0.05} glow>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.b0}` }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.txt }}>Ticket Risk Correlation</div>
            <div style={{ fontSize:9, color:T.sub, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>churn · link status · SFRI impact</div>
          </div>
          {jiraLoading && <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>Loading Jira issues...</div>}
          {!jiraLoading && !jiraConnected && <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>Jira not connected.</div>}
          {!jiraLoading && jiraConnected && rows.length === 0 && <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>No active Jira issues found.</div>}
          {!jiraLoading && rows.map((t,i) => {
            const b = BAND[t.band];
            return (
              <div key={t.id || i} style={{ padding:"13px 18px", borderBottom:i<rows.length-1?`1px solid ${T.b0}`:undefined, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }}>
                <div style={{ width:4, alignSelf:"stretch", borderRadius:2, background:b.c, flexShrink:0, opacity:0.8 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:9, color:b.c, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{t.id}</span>
                    <span style={{ fontSize:8, padding:"1px 6px", borderRadius:3, background:`${statusColor[t.status]}18`, color:statusColor[t.status], fontFamily:"'JetBrains Mono',monospace" }}>{t.status}</span>
                    {!t.linked && <span style={{ fontSize:8, padding:"1px 6px", borderRadius:3, background:"rgba(240,69,69,.1)", color:T.crit, border:`1px solid rgba(240,69,69,.2)`, fontFamily:"'JetBrains Mono',monospace" }}>⚠ unlinked</span>}
                  </div>
                  <div style={{ fontSize:11, color:T.txt, marginBottom:3 }}>{t.title || t.summary}</div>
                  <div style={{ fontSize:9, color:T.sub }}>
                    {t.pr ? <span>Linked PR: <span style={{ color:T.accHi }}>{t.pr}</span></span> : <span style={{ color:T.crit }}>No PR linked</span>}
                    <span style={{ marginLeft:10 }}>Priority: <span style={{ color:t.priority==="High"?T.crit:t.priority==="Medium"?T.mod:T.low }}>{t.priority || "Low"}</span></span>
                  </div>
                </div>
                <Tag band={t.band}/>
              </div>
            );
          })}
        </BCard>
        <BCard delay={0.1} style={{ padding:"18px" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, color:T.txt, marginBottom:14 }}>Sprint Snapshot</div>
          {[
            ["Total Tickets", String(jiraSummary.total)],
            ["Due <24h", String(jiraSummary.due24h)],
            ["Due 24-48h", String(jiraSummary.due48h)],
            ["Done", String(jiraSummary.done)],
          ].map(([lbl,val],i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${T.b0}` }}>
              <span style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{lbl}</span>
              <span style={{ fontSize:14, fontWeight:700, color:i===1?T.crit:T.txt, fontFamily:"'Syne',sans-serif" }}>{val}</span>
            </div>
          ))}
          <div style={{ marginTop:16, padding:"12px", borderRadius:8, background:"rgba(59,107,245,0.07)", border:`1px solid rgba(59,107,245,0.14)` }}>
            <div style={{ fontSize:9, color:T.accHi, fontWeight:700, marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>LIVE NOTE</div>
            <div style={{ fontSize:10, color:T.sub, lineHeight:1.7 }}>{jiraConnected ? "Snapshot updates from your Jira cloud every minute." : "Connect Jira to enable sprint and deadline telemetry."}</div>
          </div>
        </BCard>
      </div>
    </div>
  );
}

/* ─── SLACK TAB ──────────────────────────────────────────────── */
function SlackTab({ integrationStatus, slackEvents }) {
  const connected = Boolean(integrationStatus?.slack);
  const configuredChannel = integrationStatus?.slack_channel || "#risklens-alerts";
  const events = slackEvents || [];
  const flagged = events.filter((e) => e.flagged).length;
  const channelCoverage = events.reduce((acc, e) => {
    const key = e.ch || configuredChannel;
    if (!acc[key]) acc[key] = { msgs: 0, flagged: 0 };
    acc[key].msgs += 1;
    if (e.flagged) acc[key].flagged += 1;
    return acc;
  }, {});
  const coverageRows = Object.keys(channelCoverage).length
    ? Object.entries(channelCoverage).map(([ch, v]) => ({ ch, msgs: v.msgs, flagged: v.flagged, col: v.flagged ? T.crit : T.low }))
    : [{ ch: configuredChannel, msgs: 0, flagged: 0, col: T.low }];
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.txt, marginBottom:4 }}>Slack Signals</div>
        <div style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{connected ? "Webhook connected · latest delivery events" : "Connect Slack webhook to stream deliveries"}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:14 }}>
        <BCard delay={0.05} glow>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.b0}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.txt }}>Matched Signals</div>
              <div style={{ fontSize:9, color:T.sub, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>surfaced against open PRs</div>
            </div>
            <span style={{ fontSize:9, padding:"3px 8px", borderRadius:3, background:"rgba(240,69,69,0.09)", color:T.crit, border:`1px solid rgba(240,69,69,0.2)`, fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>{flagged} flagged</span>
          </div>
          {!connected && <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>Slack not connected.</div>}
          {connected && events.length === 0 && <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>No live Slack deliveries yet. Run analysis on risky repos to trigger alerts.</div>}
          {events.map((s,i) => (
            <div key={i} style={{ padding:"14px 18px", borderBottom:i<events.length-1?`1px solid ${T.b0}`:undefined, cursor:"pointer" }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", marginTop:4, flexShrink:0, background:s.flagged?T.crit:T.sub, boxShadow:s.flagged?`0 0 8px ${T.crit}`:undefined, animation:s.flagged?"blink 2s infinite":undefined }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:T.accHi, fontFamily:"'JetBrains Mono',monospace" }}>{s.ch}</span>
                    <span style={{ fontSize:8, color:T.sub }}>{s.time}</span>
                    {s.match && <span style={{ fontSize:8, padding:"1px 5px", borderRadius:3, background:"rgba(79,142,255,0.1)", color:T.accHi, border:"1px solid rgba(79,142,255,0.2)", fontFamily:"'JetBrains Mono',monospace" }}>→ {s.match}</span>}
                  </div>
                  <div style={{ fontSize:10, color:s.flagged?T.txt:T.sub, lineHeight:1.6 }}>"{s.msg}"</div>
                  <div style={{ fontSize:9, color:T.sub, marginTop:4 }}>— {s.author}</div>
                </div>
                {s.flagged && <Tag band="critical"/>}
              </div>
            </div>
          ))}
        </BCard>
        <BCard delay={0.1} style={{ padding:"18px" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, color:T.txt, marginBottom:14 }}>Channel Coverage</div>
          {coverageRows.map((ch,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${T.b0}` }}>
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:T.txt, fontFamily:"'JetBrains Mono',monospace" }}>{ch.ch}</div>
                <div style={{ fontSize:8, color:T.sub, marginTop:2 }}>{ch.msgs} relevant msgs</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:ch.col, fontFamily:"'JetBrains Mono',monospace" }}>
                {ch.flagged>0?`${ch.flagged} flagged`:"clear"}
              </span>
            </div>
          ))}
          <div style={{ marginTop:16, padding:"12px", borderRadius:8, background:"rgba(59,107,245,0.06)", border:`1px solid rgba(59,107,245,0.14)` }}>
            <div style={{ fontSize:9, color:T.accHi, fontWeight:700, marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>DELIVERY STATUS</div>
            <div style={{ fontSize:10, color:T.sub, lineHeight:1.7 }}>{connected ? "Waiting for next webhook delivery event." : "Slack webhook is not configured in backend/.env"}</div>
          </div>
        </BCard>
      </div>
    </div>
  );
}

/* ─── ALERTS TAB ─────────────────────────────────────────────── */
function AlertsTab({ developers, githubEvents, integrationStatus }) {
  const eventAlerts = (githubEvents || [])
    .filter((e) => e.band === "high" || e.band === "critical")
    .slice(0, 10)
    .map((e, idx) => ({
      id: idx + 1,
      band: e.band,
      dev: e.branch || "contributor",
      s: e.score,
      desc: e.label,
      age: e.time,
    }));

  const contributorAlerts = (developers || [])
    .filter((d) => d.s >= 60)
    .slice(0, 5)
    .map((d, idx) => ({
      id: idx + 100,
      band: bandOf(d.s),
      dev: d.name,
      s: d.s,
      desc: `Live GitHub risk signal from recent activity for ${d.name}.`,
      age: "live",
    }));

  const alerts = eventAlerts.length ? eventAlerts : contributorAlerts;
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.txt, marginBottom:4 }}>All Alerts</div>
        <div style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>SFRI ≥ 60 · {integrationStatus?.slack ? "Slack-wired" : "local only"} · {alerts.length} active</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {alerts.length === 0 && (
          <BCard delay={0.05} style={{ padding:"18px 22px" }}>
            <div style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>No elevated alerts right now.</div>
          </BCard>
        )}
        {alerts.map((a,i) => {
          const b = BAND[a.band];
          return (
            <BCard key={i} delay={i*0.06} accent style={{ padding:"18px 22px" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:b.c, boxShadow:`0 0 10px ${b.glow}`, flexShrink:0, marginTop:4, animation:a.band==="critical"?"blink 2s infinite":undefined }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:6 }}>
                    <Tag band={a.band}/>
                    <span style={{ fontSize:12, fontWeight:600, color:T.txt }}>{a.dev}</span>
                    <span style={{ fontSize:9, fontWeight:700, color:b.c, fontFamily:"'JetBrains Mono',monospace", marginLeft:"auto" }}>SFRI {a.s}</span>
                    <span style={{ fontSize:9, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{a.age}</span>
                  </div>
                  <div style={{ fontSize:10, color:T.sub, lineHeight:1.7 }}>{a.desc}</div>
                  <div style={{ marginTop:8, fontSize:9, color:integrationStatus?.slack ? T.low : T.sub }}>{integrationStatus?.slack ? "✓ Slack notified" : "Slack not connected"}</div>
                </div>
              </div>
            </BCard>
          );
        })}
      </div>
    </div>
  );
}

/* ─── INTEGRATIONS TAB ───────────────────────────────────────── */
function IntegrationsTab({ integrationStatus, onConnectGitHub, onConnectJira }) {
  const connected = integrationStatus || { github:false, jira:false, slack:false };
  const items = [
    { name:"GitHub",  s:connected.github?"Connected":"Not Connected", ab:"GH", bg:"#161B22", c:"#E6EDF3", detail:connected.github?"Repos synced · live":"Click to connect", ok:connected.github, onConnect:onConnectGitHub },
    { name:"Jira",    s:connected.jira?"Connected":"Not Connected",   ab:"JR", bg:"#0052CC", c:"#4C9AFF", detail:connected.jira?"Sprint data synced":"Click to connect",  ok:connected.jira,   onConnect:onConnectJira   },
    { name:"Actions", s:"GitHub CI",    ab:"GA", bg:"#0D1117", c:T.low,     detail:"Uses GitHub token · auto", ok:connected.github, onConnect:null },
    { name:"Slack",   s:connected.slack?"Connected":"Not Connected", ab:"SL", bg:"#4A154B", c:"#ECB22E", detail:connected.slack?"Webhook active":"Set SLACK_WEBHOOK_URL in backend/.env", ok:connected.slack, onConnect:null },
  ];
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.txt, marginBottom:4 }}>Connected Integrations</div>
        <div style={{ fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>Connect your tools to enable live risk analysis</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {items.map((int,i) => (
          <BCard key={i} delay={i*0.07} style={{ padding:"22px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:int.bg, border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:int.c, fontFamily:"'JetBrains Mono',monospace" }}>{int.ab}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.txt }}>{int.name}</div>
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:int.ok?T.low:T.sub }}/>
                  <span style={{ fontSize:9, color:int.ok?T.low:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{int.s}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize:9, color:T.sub, fontFamily:"'JetBrains Mono',monospace", marginBottom:int.onConnect?12:0 }}>{int.detail}</div>
            {int.onConnect && !int.ok && (
              <button onClick={int.onConnect} style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${T.b1}`, background:"rgba(59,107,245,0.1)", color:T.accHi, fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", fontWeight:700, marginTop:4 }}>
                Connect {int.name}
              </button>
            )}
          </BCard>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN DASHBOARD TAB ─────────────────────────────────────── */
function DashboardTab({
  teamScore,
  ciRate,
  hiPRs,
  nightC,
  riskResult,
  developers,
  githubDataLoading,
  githubEvents,
  commitTrend,
  integrationStatus,
  repos,
  repoStats,
  sec,
}) {
  const score = riskResult?.score || teamScore || 0;
  const rows = developers;
  const avgDeveloperScore = rows.length ? Math.round(rows.reduce((sum, d) => sum + d.s, 0) / rows.length) : 0;
  const factors = riskResult?.top_factors
    ? riskResult.top_factors.map((f,i) => ({ n:f, v:["0.42","1,840","4 runs"][i]||"—", p:[72,58,44][i]||30, c:[T.crit,T.high,T.mod][i] }))
    : FACTORS;

  const trendData = commitTrend?.length ? commitTrend : buildCommitPressureTrend([]);
  const trendDelta = (trendData[trendData.length - 1]?.count || 0) - (trendData[0]?.count || 0);
  const trendLabel = trendDelta > 0 ? "RISING" : trendDelta < 0 ? "COOLING" : "STABLE";
  const trendColor = trendDelta > 0 ? T.mod : trendDelta < 0 ? T.low : T.accHi;

  const integrationItems = [
    {
      name: "GitHub",
      ab: "GH",
      bg: "#161B22",
      c: "#E6EDF3",
      ok: Boolean(integrationStatus?.github),
      status: integrationStatus?.github ? `${repos.length} repos` : "Not connected",
    },
    {
      name: "Jira",
      ab: "JR",
      bg: "#0052CC",
      c: "#4C9AFF",
      ok: Boolean(integrationStatus?.jira),
      status: integrationStatus?.jira ? "Site linked" : "Not connected",
    },
    {
      name: "Actions",
      ab: "GA",
      bg: "#0D1117",
      c: T.low,
      ok: Boolean(integrationStatus?.github),
      status: repoStats.length
        ? `${Math.round(repoStats.reduce((acc, r) => acc + (100 - r.failRate), 0) / repoStats.length)}% pass`
        : "Waiting for CI data",
    },
    {
      name: "Slack",
      ab: "SL",
      bg: "#4A154B",
      c: "#ECB22E",
      ok: Boolean(integrationStatus?.slack),
      status: integrationStatus?.slack ? "Webhook active" : "Webhook missing",
    },
  ];
  const activeIntegrations = integrationItems.filter((i) => i.ok).length;

  const KPI = [
    { label:"Team SFRI",     val:`${teamScore}`, band:bandOf(teamScore), trend:`${teamScore}`, trendUp:teamScore>=60, sub:"team average",  ac:T.acc  },
    { label:"High Risk PRs", val:`${hiPRs}`,     band:"high",     trend:`${hiPRs}`, trendUp:hiPRs>0, sub:"open now",      ac:T.high },
    { label:"Night Commits", val:`${nightC}`,    band:"moderate", trend:`${nightC}`, trendUp:nightC>0, sub:"last 7 days",   ac:T.mod  },
    { label:"CI Pass Rate",  val:`${ciRate}%`,   band:ciRate>=85?"low":ciRate>=65?"moderate":"high", trend:`${ciRate}%`, trendUp:false, sub:"7-day rolling", ac:T.low  },
  ];

  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      {/* KPI Row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:14 }}>
        {KPI.map((k,i) => {
          const b = BAND[k.band];
          return (
            <BCard key={i} delay={0.05+i*0.07} style={{ padding:"20px 22px" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,${k.ac}cc,transparent)` }}/>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:50, background:`linear-gradient(180deg,${k.ac}0a,transparent)`, pointerEvents:"none" }}/>
              <div style={{ fontSize:8, color:T.mut, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono',monospace" }}>{k.label}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:36, fontWeight:800, color:b.c, lineHeight:1, marginBottom:10, textShadow:`0 0 24px ${b.c}44` }}>{k.val}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:10, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>
                <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, fontWeight:700, background:k.trendUp?"rgba(240,69,69,0.1)":"rgba(15,212,160,0.1)", color:k.trendUp?T.crit:T.low }}>{k.trend}</span>
                {k.sub}
              </div>
            </BCard>
          );
        })}
      </div>

      {/* Main 3-col bento */}
      <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr 0.9fr", gap:14, marginBottom:14 }}>

        {/* Developer table */}
        <BCard delay={0.28} glow>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:`1px solid ${T.b0}` }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.txt }}>Developer Risk Index</div>
              <div style={{ fontSize:9, color:T.sub, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>
                {githubDataLoading ? "SFRI · syncing contributors..." : `SFRI · ${rows.length} active contributors`}
              </div>
            </div>
            <Tag band={bandOf(avgDeveloperScore)}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 80px 60px", padding:"8px 20px", gap:10, fontSize:8, color:T.mut, textTransform:"uppercase", letterSpacing:"0.12em", background:"rgba(5,10,30,0.5)", borderBottom:`1px solid ${T.b0}` }}>
            <span>Developer</span><span>SFRI</span><span>Band</span><span>PRs</span>
          </div>
          {!githubDataLoading && rows.map((dev,i) => (
            <div
              key={dev.id}
              style={{ display:"grid", gridTemplateColumns:"1fr 120px 80px 60px", alignItems:"center", padding:"12px 20px", gap:10, borderBottom:i<rows.length-1?`1px solid ${T.b0}`:"none", cursor:"pointer", transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(40,80,220,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <Ava i={dev.i} g={dev.g} sz={28}/>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:T.txt }}>{dev.name}</div>
                  <div style={{ fontSize:9, color:T.sub, marginTop:1 }}>{dev.h}</div>
                </div>
              </div>
              <ScoreBar score={dev.s}/>
              <Tag band={bandOf(dev.s)}/>
              <span style={{ fontSize:11, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{dev.p}</span>
            </div>
          ))}
        </BCard>

        {/* Middle: Gauge + Recommendation */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <BCard delay={0.34} glow style={{ padding:"22px 20px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.txt }}>Team SFRI</div>
                <div style={{ fontSize:9, color:T.sub, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>Silent Failure Risk Index</div>
              </div>
              <Tag band={bandOf(score)}/>
            </div>
            <Gauge score={score}/>
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:8, color:T.mut, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:10, fontFamily:"'JetBrains Mono',monospace" }}>Top Risk Signals</div>
              {factors.map(f => (
                <div key={f.n} style={{ marginBottom:9 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, marginBottom:4, fontFamily:"'JetBrains Mono',monospace" }}>
                    <span style={{ color:T.sub }}>{f.n}</span>
                    <span style={{ color:T.txt, fontWeight:600 }}>{f.v}</span>
                  </div>
                  <div style={{ height:3, background:"rgba(255,255,255,0.04)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${f.p}%`, background:f.c, borderRadius:2, transition:"width 1.1s cubic-bezier(.4,0,.2,1) 0.6s" }}/>
                  </div>
                </div>
              ))}
            </div>
          </BCard>
          <BCard delay={0.38} accent style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(59,107,245,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>💡</div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:T.accHi, marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Recommended Action</div>
                <div style={{ fontSize:9, color:T.sub, lineHeight:1.7, fontFamily:"'JetBrains Mono',monospace" }}>
                  {riskResult?.recommendation || "Require 2+ reviewers on open PRs. Delay deploy 4+ hrs. Flag hotfix for senior review."}
                </div>
              </div>
            </div>
          </BCard>
        </div>

        {/* Right: Repo Pulse + 7-day */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <BCard delay={0.42} style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:`1px solid ${T.b0}` }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.txt }}>Repository Pulse</div>
                <div style={{ fontSize:9, color:T.sub, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>Current repo health overview</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:T.low, padding:"3px 9px", borderRadius:20, background:"rgba(15,212,160,0.07)", border:"1px solid rgba(15,212,160,0.18)", fontFamily:"'JetBrains Mono',monospace" }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:T.low, animation:"blink 1.5s infinite" }}/>
                {repoStats.length} repos
              </div>
            </div>
            {repoStats.slice(0, 6).map((repo,i) => {
              const b = BAND[bandOf(repo.sfri)];
              return (
                <div key={repo.name} style={{ display:"flex", gap:10, padding:"12px 18px", borderBottom:i<Math.min(repoStats.length,6)-1?`1px solid ${T.b0}`:undefined, cursor:"pointer" }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:b.c, boxShadow:`0 0 8px ${b.glow}`, flexShrink:0, marginTop:4 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, fontWeight:700, marginBottom:2, fontFamily:"'JetBrains Mono',monospace" }}>
                      <span style={{ color:b.c }}>{b.label.toUpperCase()} </span>
                      <span style={{ color:T.txt }}>— {repo.name}</span>
                    </div>
                    <div style={{ fontSize:9, color:T.sub, lineHeight:1.5 }}>{repo.commits} commits · {repo.openPRs} open PRs · {repo.failRate}% CI fail</div>
                    <div style={{ display:"flex", gap:8, marginTop:4 }}>
                      <span style={{ fontSize:8, color:T.mut, fontFamily:"'JetBrains Mono',monospace" }}>SFRI {repo.sfri}</span>
                      <span style={{ fontSize:8, color:T.low }}>Live</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {repoStats.length === 0 && (
              <div style={{ padding:"14px 18px", color:T.sub, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}>
                Connect GitHub to view repository pulse.
              </div>
            )}
          </BCard>

          <BCard delay={0.46} style={{ padding:"14px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, color:T.txt }}>7-Day Commit Pressure</div>
              <span style={{ fontSize:8, padding:"2px 7px", borderRadius:3, background:`${trendColor}1a`, color:trendColor, border:`1px solid ${trendColor}44`, fontWeight:700, letterSpacing:"0.1em", fontFamily:"'JetBrains Mono',monospace" }}>
                {trendDelta > 0 ? "↑" : trendDelta < 0 ? "↓" : "→"} {trendLabel}
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:64 }}>
              {trendData.map((d,i) => {
                const b = BAND[bandOf(d.s)];
                const maxS = Math.max(...trendData.map(x => x.s), 1);
                return (
                  <div key={d.iso || i} title={`${d.count} commits`} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%", justifyContent:"flex-end" }}>
                    <div style={{ width:"100%", borderRadius:"3px 3px 0 0", height:`${(d.s/maxS)*100}%`, minHeight:3, background:i===trendData.length-1?b.c:`${b.c}70`, boxShadow:i===trendData.length-1?`0 0 12px ${b.glow}`:"none", transition:`height 0.85s cubic-bezier(.4,0,.2,1) ${i*0.08}s` }}/>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:6, marginTop:6 }}>
              {trendData.map((d, i) => (
                <div key={`${d.iso}-label`} style={{ flex:1, textAlign:"center", fontSize:8, color:i===trendData.length-1?T.sub:T.mut, fontFamily:"'JetBrains Mono',monospace" }}>
                  {d.d}
                </div>
              ))}
            </div>
          </BCard>
        </div>
      </div>

      {/* Integrations row */}
      <BCard delay={0.5} glow>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 22px", borderBottom:`1px solid ${T.b0}` }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.txt }}>Connected Integrations</div>
            <div style={{ fontSize:9, color:T.sub, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>{activeIntegrations} of 4 sources active · auto-sync 60s</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:9, color:T.sub, fontFamily:"'JetBrains Mono',monospace" }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:T.low, boxShadow:`0 0 6px ${T.low}` }}/>
            Last refresh: {sec}s ago
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, padding:"14px 20px" }}>
          {integrationItems.map(int => (
            <div key={int.name} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", borderRadius:12, background:T.bg2, border:`1px solid ${T.b0}`, cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(59,107,245,0.4)"; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.b0; e.currentTarget.style.transform="translateY(0)"; }}>
              <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:int.bg, border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:int.c, fontFamily:"'JetBrains Mono',monospace" }}>{int.ab}</div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:T.txt }}>{int.name}</div>
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                  <div style={{ width:4, height:4, borderRadius:"50%", background:int.ok ? T.low : T.sub }}/>
                  <span style={{ fontSize:9, color:int.ok ? T.low : T.sub, fontFamily:"'JetBrains Mono',monospace" }}>{int.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </BCard>
    </div>
  );
}

/* ─── ROOT DASHBOARD ─────────────────────────────────────────── */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [sec, setSec] = useState(0);
  const [repos, setRepos] = useState([]);
  const [riskResult, setRiskResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState({ github:false, jira:false });
  const [developers, setDevelopers] = useState([]);
  const [repoStats, setRepoStats] = useState([]);
  const [githubEvents, setGithubEvents] = useState([]);
  const [githubDataLoading, setGithubDataLoading] = useState(false);
  const [commitTrend, setCommitTrend] = useState([]);
  const [jiraIssues, setJiraIssues] = useState([]);
  const [jiraSummary, setJiraSummary] = useState({ total:0, due24h:0, due48h:0, done:0 });
  const [jiraLoading, setJiraLoading] = useState(false);
  const [slackEvents, setSlackEvents] = useState([]);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("risklens-theme") || "dark");
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem("risklens-demo-mode") === "true");
  const [selectedTeam, setSelectedTeam] = useState(() => localStorage.getItem("risklens-demo-team") || "low");

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const applyDemoScenario = (teamKey) => {
    const scenario = DEMO_SCENARIOS[teamKey] || DEMO_SCENARIOS.low;
    setIntegrationStatus(scenario.integrationStatus);
    setRiskResult(scenario.riskResult);
    setDevelopers(scenario.developers);
    setRepoStats(scenario.repoStats);
    setGithubEvents(scenario.githubEvents);
    setCommitTrend(scenario.commitTrend);
    setJiraIssues(scenario.jiraIssues);
    setJiraSummary(scenario.jiraSummary);
    setSlackEvents(scenario.slackEvents);
    setRepos(
      scenario.repoStats.map((r, idx) => ({
        id: idx + 1,
        name: r.name,
        full_name: `demo/${r.name}`,
        private: false,
        updated_at: new Date().toISOString(),
      }))
    );
    setGithubDataLoading(false);
    setJiraLoading(false);
  };

  const rawTeamScore = developers.length
    ? Math.round(developers.reduce((sum, d) => sum + d.s, 0) / developers.length)
    : Number(riskResult?.score || 0);
  const rawCiRate = repoStats.length
    ? Math.round(repoStats.reduce((sum, r) => sum + (100 - r.failRate), 0) / repoStats.length)
    : 0;
  const rawHiPRs = githubEvents.filter((e) => e.type === "PR" && (e.band === "high" || e.band === "critical")).length;
  const rawNightCommits = commitTrend.reduce((sum, d) => sum + Number(d.count || 0), 0);
  const hasActiveAlerts = rawHiPRs > 0 || developers.some((d) => d.s >= 60);

  const teamScore = useCountUp(rawTeamScore, 900, 120);
  const ciRate    = useCountUp(rawCiRate, 900, 150);
  const hiPRs     = useCountUp(rawHiPRs, 700, 100);
  const nightC    = useCountUp(rawNightCommits, 800, 120);

  useEffect(() => { const id = setInterval(() => setSec(s => s+1), 1000); return () => clearInterval(id); }, []);

  // Fetch integration status & repos on mount
  useEffect(() => {
    if (demoMode) return;
    let mounted = true;

    const refreshConnections = () => {
      api.get("/integrations/status").then(r => {
        if (!mounted) return;
        setIntegrationStatus(r.data || { github:false, jira:false, slack:false });
      }).catch(() => {});

      api.get("/github/repos").then(r => {
        if (!mounted) return;
        setRepos(r.data?.repos || []);
      }).catch(() => {
        if (!mounted) return;
        setRepos([]);
      });
    };

    refreshConnections();
    const id = setInterval(refreshConnections, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) return;
    if (!repos.length) {
      setRepoStats([]);
      setGithubEvents([]);
      setDevelopers([]);
      setCommitTrend([]);
      setGithubDataLoading(false);
      return;
    }
    setGithubDataLoading(true);

    const publicRepos = repos.filter((r) => !r?.private);
    const targetRepos = publicRepos.length ? publicRepos : repos;
    const firstRepo = targetRepos[0]?.full_name || targetRepos[0]?.name;

    const fetchRepoStats = async () => {
      const stats = await Promise.all(
        targetRepos.map(async (repo) => {
          const repoFullName = repo?.full_name || repo?.name;
          if (!repoFullName) {
            return { name: repo?.name || "repo", commits: 0, openPRs: 0, failRate: 0, sfri: 0 };
          }

          const [commitsResp, pullsResp, ciResp] = await Promise.allSettled([
            api.get("/github/commits", { params: { repo: repoFullName, days: 7 } }),
            api.get("/github/pulls", { params: { repo: repoFullName } }),
            api.get("/github/cicd", { params: { repo: repoFullName } }),
          ]);

          const commits = commitsResp.status === "fulfilled" ? (commitsResp.value.data?.commits || []).length : 0;
          const openPRs = pullsResp.status === "fulfilled" ? (pullsResp.value.data?.pulls || []).length : 0;
          const runs = ciResp.status === "fulfilled" ? (ciResp.value.data?.runs || []) : [];
          const completedRuns = runs.filter((r) => ["success", "failure", "timed_out"].includes(r?.conclusion));
          const failedRuns = completedRuns.filter((r) => ["failure", "timed_out"].includes(r?.conclusion));
          const failRate = completedRuns.length ? Math.round((failedRuns.length / completedRuns.length) * 100) : 0;
          const sfri = Math.min(100, Math.round(openPRs * 10 + failRate * 0.8 + commits * 0.6));

          return {
            name: repo?.name || repoFullName,
            commits,
            openPRs,
            failRate,
            sfri,
          };
        })
      );
      setRepoStats(stats.filter(Boolean));
    };

    const fetchEventsAndDevelopers = async () => {
      if (!firstRepo) return;

      const [pullsResp, commitsResp, teamRiskResp] = await Promise.allSettled([
        api.get("/github/pulls", { params: { repo: firstRepo } }),
        api.get("/github/commits", { params: { repo: firstRepo, days: 7 } }),
        api.get("/team-risk", { params: { repo: firstRepo } }),
      ]);

      const pulls = pullsResp.status === "fulfilled" ? (pullsResp.value.data?.pulls || []) : [];
      const commits = commitsResp.status === "fulfilled" ? (commitsResp.value.data?.commits || []) : [];
      setCommitTrend(buildCommitPressureTrend(commits));

      // Improve first paint speed: expand trend to all repos in the background.
      if (targetRepos.length > 1) {
        Promise.allSettled(
          targetRepos.map((repo) => api.get("/github/commits", { params: { repo: repo?.full_name || repo?.name, days: 7 } }))
        ).then((responses) => {
          const allCommits = responses
            .filter((r) => r.status === "fulfilled")
            .flatMap((r) => r.value?.data?.commits || []);
          if (allCommits.length) {
            setCommitTrend(buildCommitPressureTrend(allCommits));
          }
        }).catch(() => {});
      }

      const pullEvents = pulls.slice(0, 4).map((pull) => {
        const score = scoreFromPull(pull);
        return {
          type: "PR",
          label: `#${pull.id} ${pull.title}`,
          branch: pull.author || "unknown",
          score,
          time: toRelativeTime(pull.created_at),
          band: bandOf(score),
        };
      });

      const commitEvents = commits.slice(0, Math.max(0, 4 - pullEvents.length)).map((commit) => {
        const text = commit.message || "Commit";
        const score = Math.min(100, Math.max(10, text.length));
        return {
          type: "PUSH",
          label: text,
          branch: commit.author || "unknown",
          score,
          time: toRelativeTime(commit.timestamp),
          band: bandOf(score),
        };
      });

      const mergedEvents = [...pullEvents, ...commitEvents];
      setGithubEvents(mergedEvents);
      setSlackEvents(
        mergedEvents
          .filter((e) => e.band === "high" || e.band === "critical")
          .slice(0, 8)
          .map((e) => ({
            ch: integrationStatus?.slack_channel || "#risklens-alerts",
            msg: `Risk signal: ${e.label}`,
            author: e.branch || "system",
            time: e.time || "live",
            flagged: e.band === "critical",
            match: e.type,
          }))
      );

      if (teamRiskResp.status === "fulfilled") {
        const members = teamRiskResp.value.data?.members || [];
        setDevelopers(members.map(toDeveloperRow).filter(Boolean));
      } else {
        const me = user?.username || "you";
        setDevelopers([
          {
            id: 1,
            name: me,
            h: `@${me} · contributor`,
            i: me.slice(0, 2).toUpperCase(),
            s: riskResult?.score || 0,
            p: 0,
            g: gradientForScore(riskResult?.score || 0),
          },
        ]);
      }
    };

    fetchRepoStats();
    fetchEventsAndDevelopers().finally(() => {
      setGithubDataLoading(false);
    });
  }, [repos, riskResult?.score, user?.username, integrationStatus?.slack_channel, demoMode]);

  useEffect(() => {
    if (demoMode) return;
    if (!integrationStatus?.jira) {
      setJiraIssues([]);
      setJiraSummary({ total:0, due24h:0, due48h:0, done:0 });
      return;
    }

    let mounted = true;
    const refreshJira = () => {
      setJiraLoading(true);
      api.get("/jira/my-issues").then((r) => {
        if (!mounted) return;
        const issues = r.data?.issues || [];
        const due24h = Number(r.data?.deadline_pressure?.deadline_24h_count || 0);
        const due48h = Number(r.data?.deadline_pressure?.deadline_48h_count || 0);
        const mapped = issues.map((i) => ({
          id: i.key,
          title: i.summary,
          status: i.status || "Open",
          linked: false,
          pr: null,
          priority: i.priority || "Medium",
          band: i.priority === "Highest" || i.priority === "High" ? "high" : i.priority === "Medium" ? "moderate" : "low",
        }));
        setJiraIssues(mapped);
        setJiraSummary({
          total: issues.length,
          due24h,
          due48h,
          done: issues.filter((x) => /done|closed|resolved/i.test(x.status || "")).length,
        });
      }).catch(() => {
        if (!mounted) return;
        setJiraIssues([]);
        setJiraSummary({ total:0, due24h:0, due48h:0, done:0 });
      }).finally(() => {
        if (!mounted) return;
        setJiraLoading(false);
      });
    };

    refreshJira();
    const id = setInterval(refreshJira, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, [integrationStatus?.jira, demoMode]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleRunAnalysis = async () => {
    if (demoMode) {
      setAnalyzing(true);
      setTimeout(() => {
        applyDemoScenario(selectedTeam);
        setAnalyzing(false);
      }, 500);
      return;
    }
    if (repos.length === 0) return;
    setAnalyzing(true);
    try {
      const publicRepos = repos.filter((r) => !r?.private);
      const repo = (publicRepos.length ? publicRepos : repos)[0];
      const repoFullName = repo?.full_name || repo?.name;
      if (!repoFullName) {
        setAnalyzing(false);
        return;
      }
      const res = await api.post("/predict", { repo: repoFullName });
      setRiskResult(res.data);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("risklens-theme", next);
      return next;
    });
  };

  const handleToggleDemoMode = () => {
    setDemoMode((prev) => {
      const next = !prev;
      localStorage.setItem("risklens-demo-mode", String(next));
      if (next) {
        applyDemoScenario(selectedTeam);
      }
      return next;
    });
  };

  const handleSelectTeam = (teamKey) => {
    setSelectedTeam(teamKey);
    localStorage.setItem("risklens-demo-team", teamKey);
    if (demoMode) {
      applyDemoScenario(teamKey);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.txt, fontFamily:"'JetBrains Mono',monospace", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(59,107,245,0.2);border-radius:2px}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes bentoIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        button:hover{opacity:0.88}
      `}</style>

      <NebulaBg/>

      {/* Ambient orbs */}
      <div style={{ position:"fixed", top:"15%", left:"8%", width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,107,245,0.07) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
      <div style={{ position:"fixed", bottom:"10%", right:"5%", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(123,92,240,0.06) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>

      <TopBar
        active={activeNav}
        setActive={setActiveNav}
        sec={sec}
        user={user}
        onLogout={handleLogout}
        onRunAnalysis={handleRunAnalysis}
        analyzing={analyzing}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        hasActiveAlerts={hasActiveAlerts}
        demoMode={demoMode}
        onToggleDemoMode={handleToggleDemoMode}
        selectedTeam={selectedTeam}
        onSelectTeam={handleSelectTeam}
      />

      <main style={{ paddingTop:80, position:"relative", zIndex:1 }}>
        {activeNav === "Dashboard"     && <DashboardTab teamScore={teamScore} ciRate={ciRate} hiPRs={hiPRs} nightC={nightC} riskResult={riskResult} developers={developers} githubDataLoading={githubDataLoading} githubEvents={githubEvents} commitTrend={commitTrend} integrationStatus={integrationStatus} repos={repos} repoStats={repoStats} sec={sec}/>}
        {activeNav === "Developers"    && <DevelopersTab developers={developers} loading={githubDataLoading} githubConnected={integrationStatus.github}/>}
        {activeNav === "GitHub"        && <GithubTab repos={repos} githubEvents={githubEvents} repoStats={repoStats} loading={githubDataLoading} githubConnected={integrationStatus.github}/>}
        {activeNav === "Jira"          && <JiraTab jiraIssues={jiraIssues} jiraSummary={jiraSummary} jiraLoading={jiraLoading} jiraConnected={integrationStatus.jira}/>}
        {activeNav === "Slack"         && <SlackTab integrationStatus={integrationStatus} slackEvents={slackEvents}/>}
        {activeNav === "Alerts"        && <AlertsTab developers={developers} githubEvents={githubEvents} integrationStatus={integrationStatus}/>}
      </main>
    </div>
  );
}
