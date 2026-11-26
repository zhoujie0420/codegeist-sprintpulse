import test from "node:test";
import assert from "node:assert/strict";
import { evaluateIssueRisk, buildMitigationPlan } from "../src/risk-engine.js";

test("evaluateIssueRisk flags critical multi-factor sprint risk accurately", () => {
  const report = evaluateIssueRisk({
    key: "ENG-404",
    summary: "Migrate auth tokens to zero-downtime key rotation",
    priority: "Highest",
    status: "In Progress",
    assignee: "",
    storyPoints: 13,
    daysInStatus: 6,
    blockers: ["INFRA-91", "SEC-12"],
    dueDate: "2026-11-20",
    now: "2026-11-26",
    description: "Need to rotate keys soon."
  });

  assert.equal(report.tier, "CRITICAL");
  assert.ok(report.score >= 85);
  const codes = report.factors.map((f) => f.code);
  assert.ok(codes.includes("UNASSIGNED"));
  assert.ok(codes.includes("ACTIVE_BLOCKERS"));
  assert.ok(codes.includes("STALLED_IN_STATUS"));
  assert.ok(codes.includes("OVERSIZED_STORY"));
  assert.ok(codes.includes("MISSING_ACCEPTANCE_CRITERIA"));
  assert.ok(codes.includes("PAST_DUE"));

  const plan = buildMitigationPlan(report);
  assert.ok(plan.actions.some((a) => a.id === "ESCALATE_BLOCKER"));
  assert.ok(plan.actions.some((a) => a.id === "SPLIT_STORY"));
});

test("evaluateIssueRisk scores a well-scoped healthy ticket as HEALTHY", () => {
  const report = evaluateIssueRisk({
    key: "ENG-410",
    summary: "Add unit tests for pagination cursor",
    priority: "Medium",
    status: "In Progress",
    assignee: "Alex Chen",
    storyPoints: 2,
    daysInStatus: 1,
    blockers: [],
    dueDate: "2026-12-10",
    now: "2026-11-26",
    description: "Acceptance Criteria: Given a cursor token, when requesting page 2, then return deterministic rows with zero duplicates."
  });

  assert.equal(report.tier, "HEALTHY");
  assert.ok(report.score <= 25);
  const plan = buildMitigationPlan(report);
  assert.equal(plan.actions[0].id, "MAINTAIN_CADENCE");
});
