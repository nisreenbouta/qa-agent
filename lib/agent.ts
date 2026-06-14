import { generateObject, streamText, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { TestPlanSchema, type TestPlan, type AgentPhase } from "./types";

const model = google("gemini-2.5-flash");

export interface PhaseEvent {
  phase: AgentPhase;
  type: "start" | "delta" | "complete" | "error";
  content?: string;
  data?: unknown;
}

function event(phase: AgentPhase, type: PhaseEvent["type"], content?: string, data?: unknown): string {
  return JSON.stringify({ phase, type, content, data }) + "\n";
}

export class AgentPipeline {
  private instruction: string;
  private plan: TestPlan | null = null;
  private browserTools: Record<string, unknown> = {};

  constructor(instruction: string, browserTools: Record<string, unknown>) {
    this.instruction = instruction;
    this.browserTools = browserTools;
  }

  async run(): Promise<ReadableStream> {
    return new ReadableStream({
      start: async (controller) => {
        try {
          await this.phasePlan(controller);
          await this.phaseExecuteAndReport(controller);
          controller.enqueue(event("complete", "complete"));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(event("error", "error", msg));
          controller.close();
        }
      },
    });
  }

  private async phasePlan(controller: ReadableStreamDefaultController) {
    controller.enqueue(event("plan", "start", "Generating test plan..."));

    const result = await generateObject({
      model,
      system: `You are a QA test planner. Given a user's testing instruction, produce a structured test plan.
Output ONLY the plan object with no additional text.`,
      prompt: this.instruction,
      schema: TestPlanSchema,
    });

    this.plan = result.object;
    controller.enqueue(
      event("plan", "complete", "Test plan ready", result.object)
    );
  }

  private async phaseExecuteAndReport(controller: ReadableStreamDefaultController) {
    if (!this.plan) throw new Error("No plan available");

    controller.enqueue(event("execute", "start", "Executing test steps..."));

    const executionPrompt = `You are a QA automation engineer executing a test plan.

Test Plan:
- Objective: ${this.plan.objective}
- Target URL: ${this.plan.url}

Steps:
${this.plan.steps.map((s, i) => `${i + 1}. ${s.action}${s.selector ? ` (${s.selector})` : ""} - ${s.expected}`).join("\n")}

Checks to perform after execution:
${this.plan.checks.map((c) => `- ${c}`).join("\n")}

Instructions:
1. Navigate to the target URL
2. Execute each step in order using browser tools
3. Take a screenshot after every meaningful action
4. After all steps, analyze for console errors, a11y issues, and visual bugs
5. Output a structured bug report in this format:

## Bug Report
**Title:** <title>
**Severity:** <critical | high | medium | low | info>
**Description:** <what is the issue>
**Steps to Reproduce:**
1. <step>
**Actual Behavior:** <what happened>
**Expected Behavior:** <what should happen>
**Console Errors:** <list>
**Accessibility Issues:** <list>
**Visual Issues:** <list>
**Recommendations:** <how to fix>

If no issues found, output: **No issues found. All checks passed.**`;

    const executeResult = streamText({
      model,
      system: executionPrompt,
      prompt: `Execute the test plan for: ${this.plan.url}`,
      tools: this.browserTools as any,
      stopWhen: stepCountIs(15),
    });

    const fullStream = executeResult.fullStream;
    const reader = fullStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const v = value as any;

      if (v.type === "text-delta") {
        controller.enqueue(
          event("execute", "delta", v.textDelta || v.text || v.delta)
        );
      } else if (v.type === "tool-call") {
        controller.enqueue(
          event("execute", "delta", undefined, {
            type: "tool-call",
            toolCallId: v.toolCallId,
            toolName: v.toolName,
            args: v.args || v.input,
          })
        );
      } else if (v.type === "tool-result") {
        controller.enqueue(
          event("execute", "delta", undefined, {
            type: "tool-result",
            toolCallId: v.toolCallId,
            toolName: v.toolName,
            result: v.result,
          })
        );
      }
    }

    controller.enqueue(event("execute", "complete", "Execution completed"));
  }
}

export function createAgentStream(
  instruction: string,
  browserTools: Record<string, unknown>
): Promise<ReadableStream> {
  const pipeline = new AgentPipeline(instruction, browserTools);
  return pipeline.run();
}
