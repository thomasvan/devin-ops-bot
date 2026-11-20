// Build the morning Slack summary from dashboard numbers. Scaffold only.

export interface Metric {
  name: string;
  value: number;
  previous?: number;
}

export function formatSummary(date: string, metrics: Metric[]): string {
  const lines = metrics.map((m) => {
    if (m.previous === undefined) return `• ${m.name}: ${m.value}`;
    const diff = m.value - m.previous;
    const sign = diff >= 0 ? "+" : "";
    return `• ${m.name}: ${m.value} (${sign}${diff})`;
  });
  return [`*Morning report ${date}*`, ...lines].join("\n");
}
