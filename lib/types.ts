import { z } from "zod";

export const TestStepSchema = z.object({
  action: z.string().describe("What to do (navigate, click, type, screenshot, wait)"),
  selector: z.string().optional().describe("CSS selector if applicable"),
  expected: z.string().describe("Expected outcome of this step"),
});

export const TestPlanSchema = z.object({
  objective: z.string().describe("What this test run verifies"),
  url: z.string().describe("Starting URL to navigate to"),
  steps: z.array(TestStepSchema).min(1).describe("Ordered test steps"),
  checks: z.array(z.string()).describe("Things to check after execution (console errors, a11y, visual)"),
});
export type TestPlan = z.infer<typeof TestPlanSchema>;

export const BugReportSchema = z.object({
  title: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  description: z.string(),
  stepsToReproduce: z.array(z.string()),
  actualBehavior: z.string(),
  expectedBehavior: z.string(),
  consoleErrors: z.array(z.string()),
  accessibilityIssues: z.array(z.string()),
  visualIssues: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type BugReport = z.infer<typeof BugReportSchema>;

export const AnalysisSchema = z.object({
  summary: z.string(),
  passed: z.number(),
  failed: z.number(),
  warnings: z.number(),
  bugs: z.array(BugReportSchema),
  consoleErrors: z.array(z.string()),
  accessibilityWarnings: z.array(z.string()),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export interface AgentState {
  instruction: string;
  plan: TestPlan | null;
  executionSummary: string;
  analysis: Analysis | null;
  reports: BugReport[];
}

export type AgentPhase = "plan" | "execute" | "analyze" | "report" | "complete" | "error";
