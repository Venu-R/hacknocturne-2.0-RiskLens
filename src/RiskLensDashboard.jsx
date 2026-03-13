import { useState, useEffect, useRef } from "react";

/* ─── DESIGN TOKENS — Deep Navy / Electric Cobalt / Violet Glow ─ */
const C = {
  void:    "#010409",
  ink:     "#030812",
  deep:    "#050D1E",
  navy:    "#081020",
  slate:   "#0C1830",
  panel:   "#0E1F3A",
  rim:     "rgba(20,60,180,0.18)",
  rimHi:   "rgba(40,90,255,0.32)",
  txt:     "#C8DCFF",
  muted:   "#8AAAD4",
  ghost:   "#6688BB",
  cobalt:  "#2356F6",
  sky:     "#4F8EFF",
  ice:     "#A8CBFF",
  violet:  "#5B2EE8",
  indigo:  "#3A1FA8",
  low:     "#00E5B0",
  mod:     "#FFAA2B",
  high:    "#FF5E1A",
  crit:    "#E8293A",
};

const BAND = {
  low:      { l:"Low",      c:C.low,    glow:"rgba(0,229,176,.28)",  bg:"rgba(0,229,176,.05)",   br:"rgba(0,229,176,.18)"  },
  moderate: { l:"Moderate", c:C.mod,    glow:"rgba(255,170,43,.28)", bg:"rgba(255,170,43,.05)",  br:"rgba(255,170,43,.18)" },
  high:     { l:"High",     c:C.high,   glow:"rgba(255,94,26,.28)",  bg:"rgba(255,94,26,.05)",   br:"rgba(255,94,26,.18)"  },
  critical: { l:"Critical", c:C.crit,   glow:"rgba(232,41,58,.32)",  bg:"rgba(232,41,58,.05)",   br:"rgba(232,41,58,.18)"  },
};
const bandOf = s => s >= 80 ? "critical" : s >= 60 ? "high" : s >= 30 ? "moderate" : "low";

/* ─── DATA ── */
const ALERTS = [
  { id:1, band:"critical", repo:"payments-api",  s:91, desc:"Hotfix · 3,500 lines · 10 CI failures. Recommend deploy hold.", age:"2m",  tags:["#payments","hotfix"] },
  { id:2, band:"critical", repo:"auth-service",  s:82, desc:"Cross-team changes across 4 deadline tickets. Needs senior review.", age:"11m", tags:["#auth","deadline"] },
  { id:3, band:"high",     repo:"frontend-web",  s:71, desc:"Review gap 36h · velocity spike 2.8×. Auto-linked to JIRA-4471.", age:"28m", tags:["#frontend"] },
];

const HIST = [
  {d:"Mon",s:22},{d:"Tue",s:28},{d:"Wed",s:34},{d:"Thu",s:31},{d:"Fri",s:44},{d:"Sat",s:52},{d:"Now",s:48}
];

const FACTORS = [
  { n:"night_commit_ratio",   v:"0.42",   p:72, c:C.crit },
  { n:"pr_lines_changed",     v:"1,840",  p:58, c:C.high },
  { n:"consecutive_ci_fails", v:"4 runs", p:44, c:C.mod  },
];

const GITHUB_EVENTS = [
  { type:"PR",     label:"#4471 payments: hotfix rate-limit bypass", branch:"hotfix/rate-limit", score:91, time:"2m ago",  band:"critical" },
  { type:"PUSH",   label:"auth-service: 6 commits off-hours",        branch:"main",              score:82, time:"11m ago", band:"critical" },
  { type:"PR",     label:"#4468 frontend: checkout flow refactor",   branch:"feat/checkout",     score:71, time:"28m ago", band:"high"     },
  { type:"MERGE",  label:"#4465 notifications: bump deps",           branch:"main",              score:18, time:"1h ago",  band:"low"      },
];

const JIRA_TICKETS = [
  { id:"PAY-891",  title:"Rate limit bypass investigation",       status:"In Progress", linked:true,  pr:"#4471", churn:3, band:"critical" },
  { id:"AUTH-204", title:"Session token rotation — deadline",     status:"Review",      linked:true,  pr:"#4472", churn:4, band:"critical" },
  { id:"FE-312",   title:"Checkout flow redesign",                status:"In Review",   linked:true,  pr:"#4468", churn:1, band:"high"     },
  { id:"PLAT-77",  title:"Dep bump notification service",         status:"Done",        linked:true,  pr:"#4465", churn:0, band:"low"      },
  { id:"AUTH-199", title:"MFA fallback edge case",                status:"Open",        linked:false, pr:null,    churn:2, band:"moderate" },
];

const SLACK_SIGNALS = [
  { ch:"#payments",   msg:"Hold off on payments module until Thursday — pending compliance sign-off", author:"priya.v", time:"2d ago",  flagged:true,  match:"payments-api" },
  { ch:"#auth-team",  msg:"MFA fallback still flaky, don't ship auth changes without my review",     author:"dev.k",   time:"6h ago",  flagged:true,  match:"auth-service" },
  { ch:"#deploys",    msg:"Staging looks clean, CI green across the board",                           author:"nisha.s", time:"1h ago",  flagged:false, match:null          },
  { ch:"#incidents",  msg:"March SEV-2 postmortem: always link Jira before payments deploys",        author:"arjun.m", time:"18d ago", flagged:false, match:"payments-api" },
];

/* ─── LOGO — Faithful to the uploaded cat SVG ─────────────────── */
function CatLogo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink:0 }}>
      <defs>
        <radialGradient id="lg1" cx="50%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#4A5EFF"/>
          <stop offset="55%"  stopColor="#2930C0"/>
          <stop offset="100%" stopColor="#0D0C70"/>
        </radialGradient>
        <radialGradient id="lg2" cx="50%" cy="25%" r="60%">
          <stop offset="0%"   stopColor="#6A7FFF"/>
          <stop offset="100%" stopColor="#2930C0"/>
        </radialGradient>
        <filter id="lglow"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="52" cy="68" rx="22" ry="23" fill="url(#lg1)" filter="url(#lglow)"/>
      <circle  cx="52" cy="42" r="20"          fill="url(#lg1)" filter="url(#lglow)"/>
      <polygon points="35,28 29,11 45,22"       fill="url(#lg2)"/>
      <polygon points="65,26 73,10 60,22"       fill="url(#lg2)"/>
      <polygon points="37,26 33,15 44,23"       fill="#7888FF" opacity="0.55"/>
      <polygon points="63,24 70,14 61,22"       fill="#7888FF" opacity="0.55"/>
      <path d="M31,82 Q10,76 13,58 Q15,44 25,47" fill="none" stroke="url(#lg1)" strokeWidth="7" strokeLinecap="round" filter="url(#lglow)"/>
      <ellipse cx="44" cy="40" rx="3.8" ry="4.4" fill="#020618"/>
      <ellipse cx="60" cy="40" rx="3.8" ry="4.4" fill="#020618"/>
      <circle  cx="44" cy="39" r="1.1" fill="#5060F0" opacity="0.9"/>
      <circle  cx="60" cy="39" r="1.1" fill="#5060F0" opacity="0.9"/>
      <polygon points="52,47 49.5,50 54.5,50" fill="#3040C0" opacity="0.75"/>
      <line x1="32" y1="49" x2="48" y2="50" stroke="#6A78FF" strokeWidth="0.8" opacity="0.55"/>
      <line x1="32" y1="52" x2="48" y2="52" stroke="#6A78FF" strokeWidth="0.8" opacity="0.45"/>
      <line x1="56" y1="50" x2="72" y2="49" stroke="#6A78FF" strokeWidth="0.8" opacity="0.55"/>
      <line x1="56" y1="52" x2="72" y2="52" stroke="#6A78FF" strokeWidth="0.8" opacity="0.45"/>
      <path d="M35,58 Q52,63 70,58" fill="none" stroke="#2356F6" strokeWidth="2.2" opacity="0.65"/>
      <ellipse cx="40" cy="90" rx="7" ry="4" fill="url(#lg1)"/>
      <ellipse cx="62" cy="90" rx="7" ry="4" fill="url(#lg1)"/>
    </svg>
  );
}

/* ─── ANIMATED GRID BG ─────────────────────────────────────────── */
function GridBg() {
  const ref = useRef(null);
  const raf = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    let W, H;
    const resize = () => { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    const cells = [];
    const COLS = 40, ROWS = 28;
    for (let i = 0; i < COLS * ROWS; i++) {
      cells.push({ c: i % COLS, r: Math.floor(i / COLS), phase: Math.random() * Math.PI * 2, speed: 0.003 + Math.random() * 0.004, active: Math.random() < 0.04 });
    }
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const cw = W / COLS, ch = H / ROWS;
      t += 0.016;
      cells.forEach(cell => {
        const alpha = cell.active ? Math.max(0, Math.sin(t * cell.speed * 60 + cell.phase)) * 0.14 + 0.018 : 0.018;
        ctx.strokeStyle = `rgba(35,86,246,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cell.c * cw + 0.5, cell.r * ch + 0.5, cw - 1, ch - 1);
        if (alpha > 0.08) {
          ctx.fillStyle = `rgba(20,50,200,${alpha * 0.15})`;
          ctx.fillRect(cell.c * cw + 1, cell.r * ch + 1, cw - 2, ch - 2);
        }
        if (Math.random() < 0.0002) cell.active = !cell.active;
      });
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, width:"100%", height:"100%", zIndex:0, pointerEvents:"none" }}/>;
}

/* ─── COUNT UP HOOK ─────────────────────────────────────────────── */
function useCount(target, dur = 1200, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const to = setTimeout(() => {
      let st = null;
      const run = ts => { if (!st) st = ts; const p = Math.min((ts-st)/dur,1); setV(Math.round((1-Math.pow(1-p,3))*target)); if(p<1) raf=requestAnimationFrame(run); };
      raf = requestAnimationFrame(run);
    }, delay);
    return () => { clearTimeout(to); cancelAnimationFrame(raf); };
  }, [target]);
  return v;
}

/* ─── ATOMS ─────────────────────────────────────────────────────── */
function Chip({ band, size = "sm" }) {
  const b = BAND[band];
  const fs = size === "sm" ? 8 : 9;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:fs, padding:"2px 7px", borderRadius:3, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace", background:b.bg, color:b.c, border:`1px solid ${b.br}` }}>
      <span style={{ width:3.5, height:3.5, borderRadius:"50%", background:b.c, boxShadow:`0 0 5px ${b.c}`, display:"inline-block" }}/>
      {b.l}
    </span>
  );
}

function ScoreBar({ score }) {
  const [w, setW] = useState(0);
  const b = BAND[bandOf(score)];
  useEffect(() => { const t = setTimeout(() => setW(score), 400); return () => clearTimeout(t); }, [score]);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
      <span style={{ fontSize:11, fontWeight:700, color:b.c, width:20, textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{score}</span>
      <div style={{ flex:1, height:3, background:"rgba(255,255,255,0.04)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${w}%`, borderRadius:2, background:b.c, boxShadow:`0 0 6px ${b.c}88`, transition:"width 1.1s cubic-bezier(.4,0,.2,1)" }}/>
      </div>
    </div>
  );
}

/* ─── GAUGE ─────────────────────────────────────────────────────── */
function Gauge({ score = 48 }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 600); return () => clearTimeout(t); }, []);
  const b = BAND[bandOf(score)];
  const cx=110, cy=110, r=86;
  const pct = go ? score/100 : 0;
  const ang = Math.PI + pct * Math.PI;
  const nx = cx + r * Math.cos(ang), ny = cy + r * Math.sin(ang);
  const arc = (f, t) => {
    const a1 = Math.PI + f*Math.PI, a2 = Math.PI + t*Math.PI;
    return `M${cx+r*Math.cos(a1)},${cy+r*Math.sin(a1)} A${r},${r} 0 ${(t-f)>.5?1:0},1 ${cx+r*Math.cos(a2)},${cy+r*Math.sin(a2)}`;
  };
  return (
    <div style={{ position:"relative", width:220, height:122, margin:"0 auto" }}>
      <svg width="220" height="122" viewBox="0 0 220 122">
        <defs>
          <linearGradient id="gtrack" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={C.low}  stopOpacity="0.5"/>
            <stop offset="40%"  stopColor={C.mod}  stopOpacity="0.5"/>
            <stop offset="70%"  stopColor={C.high} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={C.crit} stopOpacity="0.5"/>
          </linearGradient>
        </defs>
        <path d={arc(0,1)} fill="none" stroke="rgba(20,50,160,0.15)" strokeWidth="12" strokeLinecap="round"/>
        {[[0,.3,C.low],[.3,.6,C.mod],[.6,.8,C.high],[.8,1,C.crit]].map(([f,t,cl]) =>
          <path key={cl} d={arc(f,t)} fill="none" stroke={cl} strokeWidth="12" strokeLinecap="butt" opacity="0.15"/>
        )}
        <path d={arc(0,pct)} fill="none" stroke={b.c} strokeWidth="12" strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 10px ${b.c})`, transition:"all 1.4s cubic-bezier(.4,0,.2,1)" }}/>
        <circle cx={go?nx:cx-r} cy={go?ny:cy} r="8" fill={C.void} stroke={b.c} strokeWidth="2.5"
          style={{ filter:`drop-shadow(0 0 10px ${b.c})`, transition:"all 1.4s cubic-bezier(.4,0,.2,1)" }}/>
        {[["LOW",18,118,C.low],["MOD",96,12,C.mod],["HIGH",182,42,C.high],["CRIT",212,118,C.crit]].map(([lbl,x,y,col]) =>
          <text key={lbl} x={x} y={y} fontSize="7" fill={col} fontFamily="DM Mono" fontWeight="700" textAnchor={x>110?"end":"start"}>{lbl}</text>
        )}
      </svg>
      <div style={{ position:"absolute", top:"42%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
        <div style={{ fontSize:42, fontWeight:900, color:b.c, lineHeight:1, fontFamily:"'Syne',sans-serif", textShadow:`0 0 30px ${b.c}44`, transition:"color 1.4s" }}>{score}</div>
        <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.2em", textTransform:"uppercase", marginTop:3, fontFamily:"'DM Mono',monospace" }}>Team SFRI</div>
      </div>
    </div>
  );
}

/* ─── CARD ───────────────────────────────────────────────────────── */
function Card({ children, style={}, delay=0, accent=false, glow=false }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background:`linear-gradient(160deg,${C.panel} 0%,${C.navy} 100%)`,
        borderRadius:14, border:`1px solid ${hov ? C.rimHi : C.rim}`,
        overflow:"hidden", position:"relative",
        transition:"border-color .22s,box-shadow .22s,transform .18s",
        boxShadow: hov ? `0 0 40px rgba(20,60,220,.12),0 8px 40px rgba(0,0,0,.5)` : `0 4px 28px rgba(0,0,0,.35)`,
        transform: hov ? "translateY(-1px)" : "none",
        animation:`fadeUp .5s cubic-bezier(.4,0,.2,1) ${delay}s both`,
        ...style,
      }}>
      {glow && <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${C.sky}44,transparent)` }}/>}
      {accent && <div style={{ position:"absolute", top:0, left:0, bottom:0, width:2, background:`linear-gradient(180deg,${C.cobalt},transparent)` }}/>}
      {children}
    </div>
  );
}

/* ─── TOP BAR ─────────────────────────────────────────────────────── */
const NAV = ["Dashboard","GitHub","Jira","Slack","History","Alerts","Integrations"];

function TopBar({ active, setActive, sec }) {
  return (
    <header style={{
      position:"fixed", top:0, left:0, right:0, height:54, zIndex:50,
      background:"rgba(2,5,14,0.88)", backdropFilter:"blur(22px)",
      borderBottom:`1px solid ${C.rim}`,
      display:"flex", alignItems:"center", paddingInline:22, gap:0,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:32, flexShrink:0 }}>
        <CatLogo size={32}/>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, letterSpacing:"-0.4px", lineHeight:1, color:C.txt }}>
            Risk<span style={{ color:C.sky }}>Lens</span>
          </div>
          <div style={{ fontSize:7, color:C.muted, letterSpacing:"0.22em", marginTop:1, fontFamily:"'DM Mono',monospace" }}>DEPLOY CO-PILOT</div>
        </div>
      </div>
      <nav style={{ display:"flex", alignItems:"center", gap:1, flex:1 }}>
        {NAV.map(n => {
          const isA = active === n;
          return (
            <button key={n} onClick={() => setActive(n)} style={{
              padding:"6px 12px", borderRadius:7, border:"none", cursor:"pointer",
              fontSize:11, fontFamily:"'DM Mono',monospace", fontWeight: isA ? 700 : 400,
              background: isA ? "rgba(35,86,246,0.13)" : "transparent",
              color: isA ? C.ice : C.muted, transition:"all .14s", position:"relative",
            }}>
              {n}
              {n==="Alerts" && <span style={{ position:"absolute", top:5, right:5, width:4, height:4, borderRadius:"50%", background:C.crit, boxShadow:`0 0 6px ${C.crit}`, animation:"pulse 2s infinite" }}/>}
              {isA && <div style={{ position:"absolute", bottom:-1, left:"18%", right:"18%", height:1.5, background:C.sky, borderRadius:1 }}/>}
            </button>
          );
        })}
      </nav>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background:"rgba(0,229,176,0.06)", border:"1px solid rgba(0,229,176,0.16)", fontSize:9, color:C.low, fontFamily:"'DM Mono',monospace" }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:C.low, boxShadow:`0 0 7px ${C.low}`, animation:"pulse 1.5s infinite" }}/>
          LIVE · {sec}s
        </div>
        <button style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:7, fontSize:10, fontFamily:"'DM Mono',monospace", cursor:"pointer", background:`linear-gradient(135deg,${C.cobalt},${C.indigo})`, color:"white", border:"none", fontWeight:700, letterSpacing:"0.04em", boxShadow:"0 0 22px rgba(35,86,246,0.38)", transition:"all .14s" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5,3 19,12 5,21"/></svg>
          Run Analysis
        </button>
        <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg,${C.cobalt},${C.violet})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", fontFamily:"'DM Mono',monospace", boxShadow:`0 2px 14px ${C.cobalt}44` }}>AM</div>
      </div>
    </header>
  );
}

/* ─── GITHUB TAB ────────────────────────────────────────────────── */
function GithubTab() {
  const repoStats = [
    { name:"payments-api",  commits:47, openPRs:3, failRate:38, sfri:88 },
    { name:"auth-service",  commits:29, openPRs:2, failRate:22, sfri:74 },
    { name:"frontend-web",  commits:18, openPRs:4, failRate:12, sfri:58 },
    { name:"platform-core", commits:11, openPRs:1, failRate:5,  sfri:22 },
  ];
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.txt, marginBottom:4 }}>GitHub Activity</div>
        <div style={{ fontSize:10, color:C.muted, fontFamily:"'DM Mono',monospace" }}>3 repos · Live sync · Last updated 40s ago</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        {/* Recent PR events */}
        <Card delay={0.05} glow>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.rim}` }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700 }}>Recent PR Events</div>
            <div style={{ fontSize:9, color:C.muted, marginTop:2, fontFamily:"'DM Mono',monospace" }}>live · auto-scored on open</div>
          </div>
          {GITHUB_EVENTS.map((e,i) => {
            const b = BAND[e.band];
            return (
              <div key={i} style={{ display:"flex", gap:12, padding:"13px 18px", borderBottom: i<GITHUB_EVENTS.length-1 ? `1px solid ${C.rim}`:undefined, cursor:"pointer" }}>
                <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:`${b.bg}`, border:`1px solid ${b.br}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:8, fontWeight:700, color:b.c, fontFamily:"'DM Mono',monospace" }}>{e.type}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, color:C.txt, fontWeight:500, marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.label}</div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:9, color:C.muted, fontFamily:"'DM Mono',monospace" }}>→ {e.branch}</span>
                    <span style={{ fontSize:8, color:C.muted }}>{e.time}</span>
                  </div>
                </div>
                <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:b.c, fontFamily:"'DM Mono',monospace" }}>{e.score}</span>
                  <Chip band={e.band}/>
                </div>
              </div>
            );
          })}
        </Card>
        {/* Repo health */}
        <Card delay={0.1} glow>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.rim}` }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700 }}>Repo Health</div>
            <div style={{ fontSize:9, color:C.muted, marginTop:2, fontFamily:"'DM Mono',monospace" }}>SFRI per repository</div>
          </div>
          <div style={{ padding:"6px 0" }}>
            {repoStats.map((r,i) => (
              <div key={i} style={{ padding:"12px 18px", borderBottom: i<repoStats.length-1?`1px solid ${C.rim}`:undefined }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:C.txt, fontFamily:"'DM Mono',monospace" }}>{r.name}</div>
                    <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>{r.commits} commits · {r.openPRs} open PRs · {r.failRate}% CI fail</div>
                  </div>
                  <Chip band={bandOf(r.sfri)}/>
                </div>
                <ScoreBar score={r.sfri}/>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── JIRA TAB ───────────────────────────────────────────────────── */
function JiraTab() {
  const statusColor = { "In Progress":C.sky, "Review":C.mod, "In Review":C.mod, "Done":C.low, "Open":C.muted };
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.txt, marginBottom:4 }}>Jira Tickets</div>
        <div style={{ fontSize:10, color:C.muted, fontFamily:"'DM Mono',monospace" }}>Sprint 12 · 5 active · Auto-linked to PRs</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:14 }}>
        <Card delay={0.05} glow>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.rim}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700 }}>Ticket Risk Correlation</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:2, fontFamily:"'DM Mono',monospace" }}>churn · link status · SFRI impact</div>
            </div>
          </div>
          {JIRA_TICKETS.map((t,i) => {
            const b = BAND[t.band];
            return (
              <div key={i} style={{ padding:"13px 18px", borderBottom:i<JIRA_TICKETS.length-1?`1px solid ${C.rim}`:undefined, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }}>
                <div style={{ width:4, alignSelf:"stretch", borderRadius:2, background:b.c, flexShrink:0, opacity:0.8 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:9, color:b.c, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{t.id}</span>
                    <span style={{ fontSize:9, padding:"1px 6px", borderRadius:3, background:`${statusColor[t.status]}18`, color:statusColor[t.status], fontFamily:"'DM Mono',monospace", fontSize:8 }}>{t.status}</span>
                    {!t.linked && <span style={{ fontSize:8, padding:"1px 6px", borderRadius:3, background:"rgba(232,41,58,.1)", color:C.crit, border:`1px solid rgba(232,41,58,.2)`, fontFamily:"'DM Mono',monospace" }}>⚠ unlinked</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.txt, marginBottom:3 }}>{t.title}</div>
                  <div style={{ fontSize:9, color:C.muted }}>
                    {t.pr ? <span>Linked PR: <span style={{ color:C.sky }}>{t.pr}</span></span> : <span style={{ color:C.crit }}>No PR linked</span>}
                    <span style={{ marginLeft:10 }}>Reopen churn: <span style={{ color: t.churn>2?C.crit:t.churn>0?C.mod:C.low }}>{t.churn}×</span></span>
                  </div>
                </div>
                <Chip band={t.band}/>
              </div>
            );
          })}
        </Card>
        <Card delay={0.1} style={{ padding:"18px" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, marginBottom:14 }}>Sprint Snapshot</div>
          {[["Total Tickets","5"],["Unlinked PRs","1"],["Reopen Events","10"],["Done ≠ Shipped","1"]].map(([lbl,val],i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${C.rim}` }}>
              <span style={{ fontSize:10, color:C.muted, fontFamily:"'DM Mono',monospace" }}>{lbl}</span>
              <span style={{ fontSize:14, fontWeight:700, color:i===1||i===3?C.crit:C.txt, fontFamily:"'Syne',sans-serif" }}>{val}</span>
            </div>
          ))}
          <div style={{ marginTop:16, padding:"12px", borderRadius:8, background:"rgba(35,86,246,0.07)", border:`1px solid rgba(35,86,246,0.14)` }}>
            <div style={{ fontSize:9, color:C.sky, fontWeight:700, marginBottom:6, fontFamily:"'DM Mono',monospace" }}>AGENT ACTION</div>
            <div style={{ fontSize:10, color:C.muted, lineHeight:1.7 }}>Auto-linked PAY-891 → PR #4471 via branch + commit match. Confidence 96%.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── SLACK TAB ──────────────────────────────────────────────────── */
function SlackTab() {
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.txt, marginBottom:4 }}>Slack Signals</div>
        <div style={{ fontSize:10, color:C.muted, fontFamily:"'DM Mono',monospace" }}>Keyword-matched · metadata only · 4 channels monitored</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:14 }}>
        <Card delay={0.05} glow>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.rim}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700 }}>Matched Signals</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:2, fontFamily:"'DM Mono',monospace" }}>surfaced against open PRs</div>
            </div>
            <span style={{ fontSize:9, padding:"3px 8px", borderRadius:3, background:"rgba(232,41,58,0.09)", color:C.crit, border:`1px solid rgba(232,41,58,0.2)`, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>2 flagged</span>
          </div>
          {SLACK_SIGNALS.map((s,i) => (
            <div key={i} style={{ padding:"14px 18px", borderBottom:i<SLACK_SIGNALS.length-1?`1px solid ${C.rim}`:undefined, cursor:"pointer" }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", marginTop:4, flexShrink:0, background:s.flagged?C.crit:C.muted, boxShadow:s.flagged?`0 0 8px ${C.crit}`:undefined, animation:s.flagged?"pulse 2s infinite":undefined }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:C.sky, fontFamily:"'DM Mono',monospace" }}>{s.ch}</span>
                    <span style={{ fontSize:8, color:C.muted }}>{s.time}</span>
                    {s.match && <span style={{ fontSize:8, padding:"1px 5px", borderRadius:3, background:"rgba(79,142,255,0.1)", color:C.sky, border:"1px solid rgba(79,142,255,0.2)", fontFamily:"'DM Mono',monospace" }}>→ {s.match}</span>}
                  </div>
                  <div style={{ fontSize:10, color:s.flagged?C.txt:C.muted, lineHeight:1.6, fontStyle:s.flagged?"normal":"normal" }}>"{s.msg}"</div>
                  <div style={{ fontSize:9, color:C.muted, marginTop:4 }}>— {s.author}</div>
                </div>
                {s.flagged && <Chip band="critical"/>}
              </div>
            </div>
          ))}
        </Card>
        <Card delay={0.1} style={{ padding:"18px" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, marginBottom:14 }}>Channel Coverage</div>
          {[
            { ch:"#payments",  msgs:14, flagged:1, col:C.crit },
            { ch:"#auth-team", msgs:28, flagged:1, col:C.crit },
            { ch:"#deploys",   msgs:8,  flagged:0, col:C.low  },
            { ch:"#incidents", msgs:3,  flagged:0, col:C.low  },
          ].map((ch,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${C.rim}` }}>
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:C.txt, fontFamily:"'DM Mono',monospace" }}>{ch.ch}</div>
                <div style={{ fontSize:8, color:C.muted, marginTop:2 }}>{ch.msgs} relevant msgs</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:ch.col, fontFamily:"'DM Mono',monospace" }}>
                {ch.flagged > 0 ? `${ch.flagged} flagged` : "clear"}
              </span>
            </div>
          ))}
          <div style={{ marginTop:16, padding:"12px", borderRadius:8, background:"rgba(232,41,58,0.06)", border:`1px solid rgba(232,41,58,0.14)` }}>
            <div style={{ fontSize:9, color:C.crit, fontWeight:700, marginBottom:6, fontFamily:"'DM Mono',monospace" }}>UNACKNOWLEDGED HOLD</div>
            <div style={{ fontSize:10, color:C.muted, lineHeight:1.7 }}>2-day-old hold in #payments not seen by PR author. Agent sent confirmation request.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── DASHBOARD TAB ───────────────────────────────────────────────── */
function DashboardTab({ teamScore, ciRate, hiPRs, nightC }) {
  const KPI = [
    { label:"Team SFRI",       val:`${teamScore}`, band:"moderate", trend:"+12", sub:"vs yesterday",  ac:C.cobalt },
    { label:"High-Risk PRs",   val:`${hiPRs}`,     band:"high",     trend:"+2",  sub:"open right now", ac:C.high  },
    { label:"Night Commits",   val:`${nightC}`,    band:"moderate", trend:"+3",  sub:"last 24 hrs",    ac:C.mod   },
    { label:"CI Pass Rate",    val:`${ciRate}%`,   band:"low",      trend:"+4%", sub:"7-day rolling",  ac:C.low   },
  ];
  return (
    <div style={{ paddingInline:24, paddingBottom:48 }}>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
        {KPI.map((k,i) => {
          const b = BAND[k.band];
          return (
            <Card key={i} delay={0.04+i*0.06} style={{ padding:"18px 20px" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,${k.ac}cc,transparent)` }}/>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:44, background:`linear-gradient(180deg,${k.ac}09,transparent)`, pointerEvents:"none" }}/>
              <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:10, fontFamily:"'DM Mono',monospace" }}>{k.label}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:38, fontWeight:900, color:b.c, lineHeight:1, marginBottom:10, textShadow:`0 0 22px ${b.c}44` }}>{k.val}</div>
              <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:9, color:C.muted, fontFamily:"'DM Mono',monospace" }}>
                <span style={{ fontSize:8, padding:"1px 5px", borderRadius:3, fontWeight:700, background:k.band==="low"?"rgba(0,229,176,0.1)":"rgba(232,41,58,0.1)", color:k.band==="low"?C.low:C.crit }}>{k.trend}</span>
                {k.sub}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1.05fr 1fr 0.95fr", gap:12, marginBottom:12 }}>

        {/* Gauge + factors */}
        <Card delay={0.28} glow>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"16px 20px 10px" }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700 }}>Team SFRI</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:2, fontFamily:"'DM Mono',monospace" }}>Silent Failure Risk Index</div>
            </div>
            <Chip band="moderate"/>
          </div>
          <Gauge score={48}/>
          <div style={{ padding:"14px 20px 18px" }}>
            <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:10, fontFamily:"'DM Mono',monospace" }}>Top Risk Signals</div>
            {FACTORS.map(f => (
              <div key={f.n} style={{ marginBottom:9 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, marginBottom:4, fontFamily:"'DM Mono',monospace" }}>
                  <span style={{ color:C.muted }}>{f.n}</span>
                  <span style={{ color:C.txt, fontWeight:600 }}>{f.v}</span>
                </div>
                <div style={{ height:2.5, background:"rgba(255,255,255,0.04)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${f.p}%`, background:f.c, borderRadius:2, transition:"width 1.1s cubic-bezier(.4,0,.2,1) .6s" }}/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts */}
        <Card delay={0.34} glow>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:`1px solid ${C.rim}` }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700 }}>Live Alerts</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:2, fontFamily:"'DM Mono',monospace" }}>SFRI ≥ 75 · Slack-wired</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:C.low, padding:"3px 9px", borderRadius:20, background:"rgba(0,229,176,0.07)", border:"1px solid rgba(0,229,176,0.16)", fontFamily:"'DM Mono',monospace" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:C.low, animation:"pulse 1.5s infinite" }}/>
              3 active
            </div>
          </div>
          {ALERTS.map((a,i) => {
            const b = BAND[a.band];
            return (
              <div key={a.id} style={{ display:"flex", gap:10, padding:"13px 18px", borderBottom:i<ALERTS.length-1?`1px solid ${C.rim}`:undefined, cursor:"pointer" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:b.c, boxShadow:`0 0 8px ${b.glow}`, flexShrink:0, marginTop:4, animation:a.band==="critical"?"pulse 2s infinite":undefined }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:700, marginBottom:3 }}>
                    <span style={{ color:b.c, fontFamily:"'DM Mono',monospace" }}>{b.l.toUpperCase()} </span>
                    <span style={{ color:C.txt }}>— {a.repo}</span>
                  </div>
                  <div style={{ fontSize:9, color:C.muted, lineHeight:1.6, marginBottom:5 }}>{a.desc}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {a.tags.map(t => (
                      <span key={t} style={{ fontSize:8, padding:"1px 6px", borderRadius:3, background:"rgba(79,142,255,0.09)", color:C.sky, fontFamily:"'DM Mono',monospace" }}>{t}</span>
                    ))}
                    <span style={{ fontSize:8, color:C.muted, marginLeft:"auto", fontFamily:"'DM Mono',monospace" }}>{a.age}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Recommendation */}
          <div style={{ margin:"12px", padding:"12px", borderRadius:9, background:"rgba(35,86,246,0.07)", border:`1px solid rgba(35,86,246,0.14)` }}>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{ fontSize:13, flexShrink:0 }}>💡</span>
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:C.sky, marginBottom:4, fontFamily:"'DM Mono',monospace" }}>RECOMMENDED ACTION</div>
                <div style={{ fontSize:9, color:C.muted, lineHeight:1.7 }}>Require 2+ reviewers on open PRs. Delay payments-api deploy 4+ hrs. Flag auth-service hotfix for senior review.</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Right col: 7-day + integrations preview */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card delay={0.4} style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700 }}>7-Day Trend</div>
              <span style={{ fontSize:8, padding:"2px 7px", borderRadius:3, background:"rgba(255,170,43,0.08)", color:C.mod, border:"1px solid rgba(255,170,43,0.18)", fontWeight:700, letterSpacing:"0.1em", fontFamily:"'DM Mono',monospace" }}>↑ RISING</span>
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:60 }}>
              {HIST.map((d,i) => {
                const b = BAND[bandOf(d.s)];
                const maxS = Math.max(...HIST.map(x=>x.s));
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%", justifyContent:"flex-end" }}>
                    <div style={{ width:"100%", borderRadius:"2px 2px 0 0", height:`${(d.s/maxS)*100}%`, minHeight:3, background:d.d==="Now"?b.c:`${b.c}60`, boxShadow:d.d==="Now"?`0 0 12px ${b.glow}`:undefined, transition:`height .85s cubic-bezier(.4,0,.2,1) ${i*.07}s` }}/>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:5, marginTop:6 }}>
              {HIST.map(d => <div key={d.d} style={{ flex:1, textAlign:"center", fontSize:7, color:d.d==="Now"?C.muted:C.ghost, fontFamily:"'DM Mono',monospace" }}>{d.d}</div>)}
            </div>
          </Card>

          <Card delay={0.46} style={{ padding:"16px 18px", flex:1 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, marginBottom:12 }}>Integrations</div>
            {[
              { name:"GitHub",   s:"3 repos",     ab:"GH", c:"#E6EDF3", bg:"#161B22" },
              { name:"Jira",     s:"Sprint 12",   ab:"JR", c:"#4C9AFF", bg:"#0052CC" },
              { name:"Actions",  s:"81% pass",    ab:"GA", c:C.low,     bg:"#0D1117" },
              { name:"Slack",    s:"#dev-alerts", ab:"SL", c:"#ECB22E", bg:"#4A154B" },
            ].map(int => (
              <div key={int.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.rim}` }}>
                <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:int.bg, border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:int.c, fontFamily:"'DM Mono',monospace" }}>{int.ab}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:C.txt }}>{int.name}</div>
                  <div style={{ fontSize:8, color:C.low, marginTop:1 }}>● {int.s}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── ROOT ─────────────────────────────────────────────────────────── */
export default function RiskLens() {
  const [active, setActive] = useState("Dashboard");
  const [sec, setSec] = useState(0);
  const teamScore = useCount(48, 1300, 400);
  const ciRate    = useCount(81, 1100, 600);
  const hiPRs     = useCount(3,  600,  300);
  const nightC    = useCount(7,  700,  500);

  useEffect(() => { const id = setInterval(() => setSec(s => s+1), 1000); return () => clearInterval(id); }, []);

  return (
    <div style={{ minHeight:"100vh", background:C.void, color:C.txt, fontFamily:"'DM Mono',monospace", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(35,86,246,0.2);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        button:hover{opacity:0.85}
      `}</style>

      <GridBg/>

      {/* Ambient orbs */}
      <div style={{ position:"fixed", top:"10%", left:"5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(35,86,246,0.06) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
      <div style={{ position:"fixed", bottom:"15%", right:"8%", width:380, height:380, borderRadius:"50%", background:"radial-gradient(circle,rgba(91,46,232,0.05) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>

      <TopBar active={active} setActive={setActive} sec={sec}/>

      <main style={{ paddingTop:76, position:"relative", zIndex:1 }}>
        {active === "Dashboard"    && <DashboardTab teamScore={teamScore} ciRate={ciRate} hiPRs={hiPRs} nightC={nightC}/>}
        {active === "GitHub"       && <GithubTab/>}
        {active === "Jira"         && <JiraTab/>}
        {active === "Slack"        && <SlackTab/>}
        {active === "History"      && (
          <div style={{ paddingInline:24, paddingTop:40, textAlign:"center" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:C.muted, opacity:0.5 }}>History</div>
            <div style={{ fontSize:11, color:C.ghost, marginTop:8 }}>Time Travel Slider — coming next sprint</div>
          </div>
        )}
        {active === "Alerts"       && (
          <div style={{ paddingInline:24 }}>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.txt, marginBottom:4 }}>All Alerts</div>
              <div style={{ fontSize:10, color:C.muted, fontFamily:"'DM Mono',monospace" }}>SFRI ≥ 75 · Slack-wired · 3 active</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {ALERTS.map((a,i) => {
                const b = BAND[a.band];
                return (
                  <Card key={i} delay={i*0.06} accent style={{ padding:"16px 20px" }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:b.c, boxShadow:`0 0 10px ${b.glow}`, flexShrink:0, marginTop:4, animation:a.band==="critical"?"pulse 2s infinite":undefined }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:5 }}>
                          <Chip band={a.band}/>
                          <span style={{ fontSize:12, fontWeight:600, color:C.txt }}>{a.repo}</span>
                          <span style={{ fontSize:9, color:C.muted, marginLeft:"auto", fontFamily:"'DM Mono',monospace" }}>{a.age}</span>
                        </div>
                        <div style={{ fontSize:10, color:C.muted, lineHeight:1.7 }}>{a.desc}</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        {active === "Integrations" && (
          <div style={{ paddingInline:24 }}>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.txt, marginBottom:4 }}>Connected Integrations</div>
              <div style={{ fontSize:10, color:C.muted, fontFamily:"'DM Mono',monospace" }}>4 of 4 sources active · auto-sync 60s</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {[
                { name:"GitHub",  s:"3 repos · live",    ab:"GH", c:"#E6EDF3", bg:"#161B22", detail:"81% CI pass rate" },
                { name:"Jira",    s:"Sprint 12 · live",  ab:"JR", c:"#4C9AFF", bg:"#0052CC", detail:"5 tickets tracked" },
                { name:"Actions", s:"Webhooks · live",   ab:"GA", c:C.low,     bg:"#0D1117", detail:"last run 2m ago" },
                { name:"Slack",   s:"4 channels · live", ab:"SL", c:"#ECB22E", bg:"#4A154B", detail:"2 active signals" },
              ].map((int,i) => (
                <Card key={i} delay={i*0.07} style={{ padding:"20px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{ width:42, height:42, borderRadius:11, flexShrink:0, background:int.bg, border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:int.c, fontFamily:"'DM Mono',monospace" }}>{int.ab}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:C.txt }}>{int.name}</div>
                      <div style={{ fontSize:9, color:C.low, marginTop:2 }}>● {int.s}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:9, color:C.muted, fontFamily:"'DM Mono',monospace" }}>{int.detail}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}