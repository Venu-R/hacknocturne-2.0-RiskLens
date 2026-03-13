export const DEMO_SCENARIOS = {
  low: {
    name: "Low Risk Team",
    integrationStatus: { github: true, jira: true, slack: true, slack_channel: "#new-channel" },
    riskResult: {
      score: 22,
      level: "LOW",
      top_factors: ["ci_pass_rate_7d", "review_depth_score", "test_file_updated"],
      recommendation: "Conditions normal. Proceed with standard review process.",
    },
    developers: [
      { id: 1, name: "ananya", h: "@ananya · contributor", i: "AN", s: 18, p: 4, g: ["#0FD4A0", "#14C8C8"] },
      { id: 2, name: "rohit", h: "@rohit · contributor", i: "RO", s: 24, p: 5, g: ["#0FD4A0", "#3B6BF5"] },
      { id: 3, name: "meera", h: "@meera · contributor", i: "ME", s: 20, p: 3, g: ["#0FD4A0", "#14C8C8"] },
    ],
    repoStats: [
      { name: "risklens-api", commits: 31, openPRs: 1, failRate: 6, sfri: 19 },
      { name: "risklens-ui", commits: 24, openPRs: 1, failRate: 4, sfri: 16 },
      { name: "risklens-ml", commits: 17, openPRs: 0, failRate: 8, sfri: 15 },
    ],
    githubEvents: [
      { type: "PR", label: "#210 docs: improve setup guide", branch: "ananya", score: 19, time: "12m ago", band: "low" },
      { type: "PUSH", label: "refactor: cleanup api handlers", branch: "rohit", score: 24, time: "22m ago", band: "low" },
      { type: "PR", label: "#209 tests: add auth context tests", branch: "meera", score: 26, time: "49m ago", band: "low" },
    ],
    commitTrend: [
      { d: "M", s: 24, count: 5, iso: "2026-03-08T00:00:00.000Z" },
      { d: "T", s: 27, count: 6, iso: "2026-03-09T00:00:00.000Z" },
      { d: "W", s: 30, count: 7, iso: "2026-03-10T00:00:00.000Z" },
      { d: "T", s: 26, count: 6, iso: "2026-03-11T00:00:00.000Z" },
      { d: "F", s: 29, count: 7, iso: "2026-03-12T00:00:00.000Z" },
      { d: "S", s: 24, count: 5, iso: "2026-03-13T00:00:00.000Z" },
      { d: "S", s: 21, count: 4, iso: "2026-03-14T00:00:00.000Z" },
    ],
    jiraIssues: [
      { id: "RL-101", title: "Improve onboarding copy", status: "In Progress", linked: false, pr: null, priority: "Low", band: "low" },
      { id: "RL-102", title: "Add unit tests for auth", status: "Open", linked: false, pr: null, priority: "Medium", band: "moderate" },
    ],
    jiraSummary: { total: 2, due24h: 0, due48h: 1, done: 0 },
    slackEvents: [
      { ch: "#new-channel", msg: "RiskLens daily summary: all systems healthy", author: "risklens-bot", time: "5m ago", flagged: false, match: "SUMMARY" },
    ],
  },

  high: {
    name: "High Risk Team",
    integrationStatus: { github: true, jira: true, slack: true, slack_channel: "#new-channel" },
    riskResult: {
      score: 71,
      level: "HIGH",
      top_factors: ["pr_lines_changed", "deadline_24h_count", "consecutive_ci_failures"],
      recommendation: "Require 2+ reviewer approvals. Consider delaying deployment by 4+ hours.",
    },
    developers: [
      { id: 1, name: "ananya", h: "@ananya · contributor", i: "AN", s: 66, p: 3, g: ["#F97316", "#F5A623"] },
      { id: 2, name: "rohit", h: "@rohit · contributor", i: "RO", s: 74, p: 6, g: ["#F97316", "#F5A623"] },
      { id: 3, name: "meera", h: "@meera · contributor", i: "ME", s: 68, p: 4, g: ["#F97316", "#F5A623"] },
    ],
    repoStats: [
      { name: "risklens-api", commits: 44, openPRs: 5, failRate: 32, sfri: 73 },
      { name: "risklens-ui", commits: 36, openPRs: 3, failRate: 27, sfri: 65 },
      { name: "risklens-ml", commits: 21, openPRs: 2, failRate: 19, sfri: 52 },
    ],
    githubEvents: [
      { type: "PR", label: "#231 feat: payment retries + schema changes", branch: "rohit", score: 76, time: "4m ago", band: "high" },
      { type: "PR", label: "#230 refactor auth guards across modules", branch: "ananya", score: 69, time: "17m ago", band: "high" },
      { type: "PUSH", label: "fix: flaky CI and env matrix", branch: "meera", score: 62, time: "33m ago", band: "high" },
    ],
    commitTrend: [
      { d: "M", s: 42, count: 9, iso: "2026-03-08T00:00:00.000Z" },
      { d: "T", s: 48, count: 11, iso: "2026-03-09T00:00:00.000Z" },
      { d: "W", s: 55, count: 13, iso: "2026-03-10T00:00:00.000Z" },
      { d: "T", s: 60, count: 15, iso: "2026-03-11T00:00:00.000Z" },
      { d: "F", s: 58, count: 14, iso: "2026-03-12T00:00:00.000Z" },
      { d: "S", s: 52, count: 12, iso: "2026-03-13T00:00:00.000Z" },
      { d: "S", s: 50, count: 11, iso: "2026-03-14T00:00:00.000Z" },
    ],
    jiraIssues: [
      { id: "RL-210", title: "Finalize release checklist", status: "In Progress", linked: false, pr: null, priority: "High", band: "high" },
      { id: "RL-212", title: "Hotfix regression in auth callback", status: "Open", linked: false, pr: null, priority: "High", band: "high" },
      { id: "RL-214", title: "Update API docs for deploy flow", status: "Open", linked: false, pr: null, priority: "Medium", band: "moderate" },
    ],
    jiraSummary: { total: 3, due24h: 1, due48h: 1, done: 0 },
    slackEvents: [
      { ch: "#new-channel", msg: "High risk PR #231 detected. Add senior reviewer.", author: "risklens-bot", time: "3m ago", flagged: true, match: "PR" },
      { ch: "#new-channel", msg: "CI failure streak increased on risklens-api.", author: "risklens-bot", time: "8m ago", flagged: true, match: "CI" },
    ],
  },

  critical: {
    name: "Critical Risk Team",
    integrationStatus: { github: true, jira: true, slack: true, slack_channel: "#new-channel" },
    riskResult: {
      score: 92,
      level: "CRITICAL",
      top_factors: ["consecutive_ci_failures", "night_commit_ratio", "hotfix_label_present"],
      recommendation: "Pause deployment. Escalate to engineering manager immediately.",
    },
    developers: [
      { id: 1, name: "ananya", h: "@ananya · contributor", i: "AN", s: 88, p: 7, g: ["#F04545", "#7B5CF0"] },
      { id: 2, name: "rohit", h: "@rohit · contributor", i: "RO", s: 94, p: 9, g: ["#F04545", "#7B5CF0"] },
      { id: 3, name: "meera", h: "@meera · contributor", i: "ME", s: 90, p: 6, g: ["#F04545", "#7B5CF0"] },
    ],
    repoStats: [
      { name: "risklens-api", commits: 61, openPRs: 8, failRate: 54, sfri: 91 },
      { name: "risklens-ui", commits: 49, openPRs: 6, failRate: 47, sfri: 86 },
      { name: "risklens-ml", commits: 27, openPRs: 4, failRate: 41, sfri: 79 },
    ],
    githubEvents: [
      { type: "PR", label: "#245 hotfix: rollback payment authorization", branch: "rohit", score: 95, time: "1m ago", band: "critical" },
      { type: "PR", label: "#244 urgent: auth token bypass patch", branch: "ananya", score: 91, time: "6m ago", band: "critical" },
      { type: "PUSH", label: "incident fix wave: retry + circuit breaker", branch: "meera", score: 84, time: "12m ago", band: "critical" },
    ],
    commitTrend: [
      { d: "M", s: 63, count: 16, iso: "2026-03-08T00:00:00.000Z" },
      { d: "T", s: 70, count: 19, iso: "2026-03-09T00:00:00.000Z" },
      { d: "W", s: 78, count: 22, iso: "2026-03-10T00:00:00.000Z" },
      { d: "T", s: 86, count: 25, iso: "2026-03-11T00:00:00.000Z" },
      { d: "F", s: 92, count: 28, iso: "2026-03-12T00:00:00.000Z" },
      { d: "S", s: 95, count: 30, iso: "2026-03-13T00:00:00.000Z" },
      { d: "S", s: 89, count: 26, iso: "2026-03-14T00:00:00.000Z" },
    ],
    jiraIssues: [
      { id: "RL-301", title: "SEV-1 payment outage mitigation", status: "In Progress", linked: false, pr: null, priority: "Highest", band: "critical" },
      { id: "RL-302", title: "Emergency auth hardening", status: "Open", linked: false, pr: null, priority: "Highest", band: "critical" },
      { id: "RL-304", title: "Customer escalation patch", status: "Open", linked: false, pr: null, priority: "High", band: "high" },
      { id: "RL-305", title: "Deploy rollback checklist", status: "Open", linked: false, pr: null, priority: "High", band: "high" },
    ],
    jiraSummary: { total: 4, due24h: 3, due48h: 1, done: 0 },
    slackEvents: [
      { ch: "#new-channel", msg: "CRITICAL risk detected on PR #245. Deployment pause recommended.", author: "risklens-bot", time: "just now", flagged: true, match: "PR" },
      { ch: "#new-channel", msg: "CI failure streak exceeded threshold on risklens-api.", author: "risklens-bot", time: "2m ago", flagged: true, match: "CI" },
      { ch: "#new-channel", msg: "Jira due<24h spike detected for release board.", author: "risklens-bot", time: "5m ago", flagged: true, match: "JIRA" },
    ],
  },
};

export const DEMO_TEAM_OPTIONS = [
  { value: "low", label: "Low Team" },
  { value: "high", label: "High Team" },
  { value: "critical", label: "Critical Team" },
];
