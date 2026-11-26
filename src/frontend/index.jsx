import React, { useEffect, useState } from "react";
import ForgeReconciler, { Text, Strong, Badge, Stack, Box, Heading } from "@forge/react";
import { invoke } from "@forge/bridge";

const App = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    invoke("getIssueRiskReport")
      .then(setData)
      .catch((err) => setError(err?.message || "Unable to analyze issue risk"));
  }, []);

  if (error) return <Text>SprintPulse Error: {error}</Text>;
  if (!data) return <Text>Analyzing Jira issue delivery risk with SprintPulse Rovo…</Text>;

  const { report, plan } = data;
  const appearance = report.tier === "CRITICAL" ? "removed" : report.tier === "ELEVATED" ? "important" : "added";

  return (
    <Box padding="space.200">
      <Stack space="space.150">
        <Heading as="h3">SprintPulse Rovo · {report.issueKey}</Heading>
        <Text>
          Delivery Risk Score: <Strong>{report.score}/100</Strong>{" "}
          <Badge appearance={appearance}>{report.tier}</Badge>
        </Text>
        <Heading as="h4">Detected Risk Factors</Heading>
        {report.factors.map((f) => (
          <Text key={f.code}>• [{f.code} +{f.weight}] {f.detail}</Text>
        ))}
        <Heading as="h4">Recommended Mitigation Playbook</Heading>
        {plan.actions.map((a) => (
          <Text key={a.id}>✓ ({a.owner}) {a.step}</Text>
        ))}
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<App />);
