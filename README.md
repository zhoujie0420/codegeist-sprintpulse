# SprintPulse Rovo

> **Codegeist 2026 — Apps for Software Teams + Best Agents (Rovo)**
> An **Atlassian Forge** Jira Issue Panel & **Rovo Agent** (`SprintPulse Delivery Co-Pilot`) that scores real-time sprint delivery risk (0–100), surfaces stalled handoffs and unresolved blocker chains, and drafts concrete mitigation playbooks.

- **Interactive Browser Preview (GitHub Pages)**: `https://zhoujie0420.github.io/codegeist-sprintpulse/`
- **GitHub Repository**: `https://github.com/zhoujie0420/codegeist-sprintpulse`

---

## Architecture (Atlassian Forge + Rovo)
- **`manifest.yml`**: Declares `jira:issuePanel` (`sprintpulse-issue-panel`), `rovo:agent` (`sprintpulse-rovo-agent`), two typed Rovo `action` modules (`analyze-issue-risk`, `draft-mitigation-plan`), and Node.js 22 Forge functions (`src/index.js`).
- **`src/risk-engine.js`**: Pure deterministic delivery risk engine shared across Forge resolvers, Rovo actions, browser preview, and unit tests. Evaluates 7 signals: priority SLA impact, missing owner, linked blockers, days stalled in status, oversized story points (`>= 8`), missing acceptance criteria, and past-due deadlines.
- **`src/index.js`**: Forge backend resolver fetching live Jira issue fields via `@forge/api` (`api.asApp().requestJira(...)`) and exposing `rovoAnalyzeRisk` + `rovoDraftMitigation`.
- **`src/frontend/index.jsx`**: Native Forge UI Kit 2 (`@forge/react`) Jira Issue Panel rendering live risk badges, detected factors, and prioritized owner actions.

## Testing & Deployment

```bash
# Run automated unit tests (Node 22+, zero dependencies)
node --test tests/risk-engine.test.mjs

# Deploy to your Atlassian Cloud Developer Site with Forge CLI
npm install
npx forge register
npx forge deploy
npx forge install
```

## License
MIT License © 2026 Jie Zhou
