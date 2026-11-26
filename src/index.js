import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { evaluateIssueRisk, buildMitigationPlan } from "./risk-engine.js";

const resolver = new Resolver();

async function fetchJiraIssueNormalized(issueKey) {
  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    throw new Error(`Jira API returned HTTP ${res.status} for ${issueKey}`);
  }
  const data = await res.json();
  const fields = data.fields || {};
  const updatedMs = fields.updated ? Date.parse(fields.updated) : Date.now();
  const daysInStatus = Math.max(0, Math.floor((Date.now() - updatedMs) / 86400000));
  const blockers = (fields.issuelinks || [])
    .filter((l) => /block/i.test(l.type?.inward || l.type?.name || "") && l.inwardIssue?.key)
    .map((l) => l.inwardIssue.key);

  return {
    key: data.key || issueKey,
    summary: fields.summary || "Untitled Issue",
    priority: fields.priority?.name || "Medium",
    status: fields.status?.name || "To Do",
    assignee: fields.assignee?.displayName || "",
    storyPoints: Number(fields.customfield_10016 || 0),
    daysInStatus,
    blockers,
    dueDate: fields.duedate || null,
    description: typeof fields.description === "string"
      ? fields.description
      : JSON.stringify(fields.description || "")
  };
}

resolver.define("getIssueRiskReport", async (req) => {
  const issueKey = req.context?.extension?.issue?.key || req.payload?.issueKey;
  const issue = await fetchJiraIssueNormalized(issueKey);
  const report = evaluateIssueRisk(issue);
  const plan = buildMitigationPlan(report);
  return { issue, report, plan };
});

export const handler = resolver.getDefinitions();

export async function rovoAnalyzeRisk(payload) {
  const issue = await fetchJiraIssueNormalized(payload.issueKey);
  return evaluateIssueRisk(issue);
}

export async function rovoDraftMitigation(payload) {
  const issue = await fetchJiraIssueNormalized(payload.issueKey);
  const report = evaluateIssueRisk(issue);
  return buildMitigationPlan(report);
}
