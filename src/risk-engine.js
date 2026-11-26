// SprintPulse Rovo — Pure Deterministic Delivery Risk & Triage Engine
// Shared across Atlassian Forge Resolver, Rovo Agent Actions, Browser Preview, and Node Tests.

export function evaluateIssueRisk(issue) {
  const factors = [];
  let score = 10; // Base complexity floor

  const priority = String(issue?.priority || "Medium").toLowerCase();
  const status = String(issue?.status || "To Do").toLowerCase();
  const daysInStatus = Number(issue?.daysInStatus || 0);
  const storyPoints = Number(issue?.storyPoints || 0);
  const blockers = Array.isArray(issue?.blockers) ? issue.blockers : [];
  const description = String(issue?.description || "");
  const hasAssignee = Boolean(issue?.assignee && String(issue.assignee).trim());
  const dueDate = issue?.dueDate ? new Date(issue.dueDate) : null;
  const now = issue?.now ? new Date(issue.now) : new Date();

  if (priority === "highest" || priority === "blocker" || priority === "critical") {
    score += 18;
    factors.push({ code: "HIGH_PRIORITY", weight: 18, detail: `Priority is ${issue.priority} — SLA impact if delayed.` });
  } else if (priority === "high") {
    score += 10;
    factors.push({ code: "ELEVATED_PRIORITY", weight: 10, detail: "High priority issue in active sprint." });
  }

  if (!hasAssignee) {
    score += 20;
    factors.push({ code: "UNASSIGNED", weight: 20, detail: "No engineer assigned; handoff ownership is missing." });
  }

  if (blockers.length > 0) {
    const w = Math.min(30, blockers.length * 15);
    score += w;
    factors.push({
      code: "ACTIVE_BLOCKERS",
      weight: w,
      detail: `${blockers.length} unresolved blocker link(s): ${blockers.join(", ")}.`
    });
  }

  if (status.includes("progress") || status.includes("review")) {
    if (daysInStatus >= 4) {
      const w = Math.min(24, daysInStatus * 4);
      score += w;
      factors.push({
        code: "STALLED_IN_STATUS",
        weight: w,
        detail: `Stalled in "${issue.status}" for ${daysInStatus} days (threshold: 4d).`
      });
    }
  }

  if (storyPoints >= 8) {
    score += 14;
    factors.push({
      code: "OVERSIZED_STORY",
      weight: 14,
      detail: `Story estimate is ${storyPoints} pts — high spillover risk; recommend splitting.`
    });
  }

  const hasAC = /acceptance criteria|given\s+.*\s+when\s+|-\s*\[\s*[x ]?\s*\]/i.test(description);
  if (!hasAC || description.trim().length < 40) {
    score += 12;
    factors.push({
      code: "MISSING_ACCEPTANCE_CRITERIA",
      weight: 12,
      detail: "Missing explicit Acceptance Criteria or verification checklist in description."
    });
  }

  if (dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < now.getTime() && !status.includes("done")) {
    score += 16;
    factors.push({
      code: "PAST_DUE",
      weight: 16,
      detail: `Past due date (${issue.dueDate}) while still in "${issue.status}".`
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = score >= 70 ? "CRITICAL" : score >= 45 ? "ELEVATED" : "HEALTHY";

  return {
    issueKey: issue?.key || "UNKNOWN",
    summary: issue?.summary || "Untitled Issue",
    score,
    tier,
    factors
  };
}

export function buildMitigationPlan(riskReport) {
  const actions = [];
  const codes = new Set((riskReport.factors || []).map((f) => f.code));

  if (codes.has("ACTIVE_BLOCKERS")) {
    actions.push({
      id: "ESCALATE_BLOCKER",
      owner: "Tech Lead",
      step: "Escalate unresolved linked blockers in standup and pair with blocking team to unblock within 24h."
    });
  }
  if (codes.has("UNASSIGNED")) {
    actions.push({
      id: "ASSIGN_OWNER",
      owner: "Engineering Manager",
      step: "Assign a primary DRI immediately before sprint midpoint."
    });
  }
  if (codes.has("OVERSIZED_STORY")) {
    actions.push({
      id: "SPLIT_STORY",
      owner: "Assignee",
      step: "Decompose into <= 3-point vertical slices with independent PRs to eliminate sprint spillover."
    });
  }
  if (codes.has("STALLED_IN_STATUS")) {
    actions.push({
      id: "UNSTALL_REVIEW",
      owner: "Reviewer / Author",
      step: "Trigger synchronous 15-minute review huddle to clear stale PR/status bottleneck."
    });
  }
  if (codes.has("MISSING_ACCEPTANCE_CRITERIA")) {
    actions.push({
      id: "ADD_ACCEPTANCE_CRITERIA",
      owner: "Product Manager",
      step: "Append explicit Given/When/Then acceptance criteria and automated test targets to the ticket."
    });
  }
  if (codes.has("PAST_DUE")) {
    actions.push({
      id: "REBASE_DEADLINE",
      owner: "Scrum Master",
      step: "Communicate revised ETA to stakeholders or descope non-blocking sub-tasks."
    });
  }
  if (!actions.length) {
    actions.push({
      id: "MAINTAIN_CADENCE",
      owner: "Assignee",
      step: "Ticket is healthy and well-scoped. Proceed with normal CI/CD verification."
    });
  }

  return {
    issueKey: riskReport.issueKey,
    tier: riskReport.tier,
    score: riskReport.score,
    actions
  };
}
