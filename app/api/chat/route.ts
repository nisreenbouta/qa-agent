import { streamText, generateObject, convertToModelMessages, stepCountIs, embed, UIMessage } from 'ai';
import { google } from '@ai-sdk/google';

import { createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
import { z } from 'zod';
import { TestPlanSchema, AnalysisSchema, BugReportSchema, type Analysis, type BugReport } from '@/lib/types';
import { createTestRun, finishTestRun, failTestRun, insertFinding, insertAgentStep } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';

let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

async function getMcpTools() {
  if (!mcpClient) {
    mcpClient = await createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: process.platform === 'win32' ? 'cmd.exe' : 'npx',
        args: process.platform === 'win32'
          ? ['/c', 'npx.cmd @playwright/mcp@latest --headless --isolated']
          : ['@playwright/mcp@latest', '--headless', '--isolated'],
      }),
    });
  }
  return mcpClient.tools();
}

const embeddingModel = google.embedding('gemini-embedding-001');

const model = google('gemini-2.5-flash');

async function summarizeFindings(executionOutput: string, brief: string, url: string): Promise<Analysis> {
  const { object } = await generateObject({
    model,
    system: `You are a QA test report summarizer. Given a test execution transcript, produce a structured analysis.

Rate each finding by severity:
- critical: Blocks core functionality, data loss, security issue
- high: Major feature broken, no workaround
- medium: Partial feature broken, workaround exists
- low: Cosmetic or minor issue
- info: Suggestion or observation

Output a complete Analysis object with all findings from the transcript.`,
    prompt: `## Test Brief\n${brief}\n\n## Target URL\n${url}\n\n## Execution Transcript\n${executionOutput}`,
    schema: AnalysisSchema,
  });
  return object;
}

const CriticReviewSchema = z.object({
  approved: z.array(BugReportSchema),
  rejected: z.array(z.object({
    title: z.string(),
    reason: z.string().describe("Why this finding was rejected (false positive, duplicate, not reproducible)"),
  })),
});

async function reviewFindings(analysis: Analysis): Promise<Analysis> {
  const { object } = await generateObject({
    model,
    system: `You are a QA critic. Review the findings from a test run and filter out false positives and duplicates.

For each bug report, decide whether it is:
- A legitimate issue (approve)
- A false positive (reject — the behavior is expected or the test was wrong)
- A duplicate of another finding (reject and note the duplicate)

Only keep findings that are real, actionable bugs. Be conservative — it's better to reject a borderline finding than to clutter the report.`,
    prompt: `Review these findings for false positives and duplicates:

Summary: ${analysis.summary}
Passed: ${analysis.passed}, Failed: ${analysis.failed}, Warnings: ${analysis.warnings}

Findings:
${analysis.bugs.map((b, i) => `
[${i + 1}] ${b.severity.toUpperCase()}: ${b.title}
  Description: ${b.description}
  Actual: ${b.actualBehavior}
  Expected: ${b.expectedBehavior}
  Console Errors: ${b.consoleErrors.join(", ")}
  Steps: ${b.stepsToReproduce.join(" → ")}`).join("\n")}`,
    schema: CriticReviewSchema,
  });

  return {
    ...analysis,
    bugs: object.approved,
    failed: object.approved.filter(b => b.severity === "critical" || b.severity === "high").length,
    warnings: object.approved.filter(b => b.severity === "medium" || b.severity === "low").length,
  };
}

async function retrieveQaKnowledge({ query }: { query: string }): Promise<string> {
  try {
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    const { data, error } = await supabase.rpc('match_qa_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5,
    });

    if (error) {
      const { data: fallback } = await supabase
        .from('qa_knowledge')
        .select('chunk, title, source')
        .limit(5);

      if (fallback && fallback.length > 0) {
        return fallback.map(r => `[${r.source}] ${r.title}\n${r.chunk}`).join('\n\n---\n\n');
      }
      return 'No relevant knowledge found.';
    }

    if (!data || data.length === 0) {
      return 'No relevant knowledge found.';
    }

    return data.map((r: any) => `[${r.source}] ${r.title}\n${r.chunk}`).join('\n\n---\n\n');
  } catch {
    return 'Knowledge base unavailable. Proceed without guidance.';
  }
}

const ragTool = {
  retrieve_qa_knowledge: {
    description: `Search the QA knowledge base for relevant testing guidance, accessibility standards (WCAG), security best practices (OWASP), common bug patterns, and console error references. Use this when planning tests or investigating issues.`,
    parameters: z.object({
      query: z.string().describe('The specific question or topic to search for (e.g., "color contrast requirements", "SQL injection testing", "form validation bugs", "console error TypeError")'),
    }),
    execute: async ({ query }: { query: string }) => {
      return await retrieveQaKnowledge({ query });
    },
  },
};

const customTools = {
  check_url_health: {
    description: `Check if a URL is accessible and return HTTP status, response time, and security headers. Use this to verify pages load correctly.`,
    parameters: z.object({
      url: z.string().describe('The full URL to check (e.g. https://example.com/page)'),
    }),
    execute: async ({ url }: { url: string }) => {
      const start = Date.now();
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        const duration = Date.now() - start;
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
        const securityHeaders = {
          'content-security-policy': headers['content-security-policy'] || 'missing',
          'strict-transport-security': headers['strict-transport-security'] || 'missing',
          'x-content-type-options': headers['x-content-type-options'] || 'missing',
          'x-frame-options': headers['x-frame-options'] || 'missing',
        };
        const missing = Object.entries(securityHeaders).filter(([, v]) => v === 'missing').map(([k]) => k);
        return JSON.stringify({ url, status: response.status, responseTimeMs: duration, contentType: headers['content-type'] || 'unknown', securityHeaders, missingSecurityHeaders: missing }, null, 2);
      } catch (err) {
        return JSON.stringify({ url, error: err instanceof Error ? err.message : String(err) });
      }
    },
  },
  check_ssl_cert: {
    description: `Check SSL certificate validity for a domain. Use this to verify HTTPS is properly configured.`,
    parameters: z.object({
      domain: z.string().describe('Domain to check (e.g. example.com)'),
    }),
    execute: async ({ domain }: { domain: string }) => {
      try {
        const response = await fetch(`https://${domain}`, { method: 'HEAD' });
        return JSON.stringify({ domain, accessible: true, status: response.status });
      } catch (err) {
        return JSON.stringify({ domain, accessible: false, error: err instanceof Error ? err.message : String(err) });
      }
    },
  },
};

const allExtraTools = { ...ragTool, ...customTools };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, runId, userId }: { messages: UIMessage[]; runId?: string; userId?: string } = body;

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const userInstruction = lastUserMsg
      ? lastUserMsg.parts.map(p => (p as any).text || '').join('')
      : '';

    const tools = await getMcpTools() as any;

    if (!runId || !userId) {
      const modelMessages = await convertToModelMessages(messages);
      const result = streamText({
        model,
        messages: modelMessages,
        tools: { ...tools, ...allExtraTools },
        stopWhen: stepCountIs(5),
      });
      return result.toUIMessageStreamResponse({ originalMessages: messages });
    }

    if (userInstruction) {
      const { object: plan } = await generateObject({
        model,
        system: `You are a QA test planner. Given a user's testing instruction, produce a structured test plan.
Output ONLY the plan as a JSON object matching the schema.`,
        prompt: userInstruction,
        schema: TestPlanSchema,
      });

      await createTestRun({
        id: runId,
        user_id: userId,
        url: plan.url,
        brief: userInstruction,
        plan_json: plan,
      });

      const planSteps = plan.steps.map((s, i) =>
        `${i + 1}. ${s.action}${s.selector ? ` (selector: "${s.selector}")` : ""} — expected: ${s.expected}`
      ).join("\n");

      const checksList = plan.checks.map(c => `- ${c}`).join("\n");

      const executionPrompt = `You are a QA automation engineer executing a pre-defined test plan. Execute each step using browser tools.

## Test Plan
**Objective:** ${plan.objective}
**Target URL:** ${plan.url}

**Steps to Execute:**
${planSteps}

**Post-Execution Checks:**
${checksList}

## Instructions
- Navigate to ${plan.url} first
- Execute each step in order using the available browser tools
- Take a screenshot after every action using browser_take_screenshot
- After completing all steps, analyze for issues
- If you find bugs, report them with severity, reproduction steps, and recommendations
- If everything passes, state that clearly

Begin executing the plan now.`;

      const modelMessages = await convertToModelMessages(messages);

      let stepIndex = 0;

      const result = streamText({
        model,
        system: executionPrompt,
        messages: modelMessages,
        tools: { ...tools, ...allExtraTools },
        stopWhen: stepCountIs(15),
        onChunk: async ({ chunk }: any) => {
          if (chunk.type === 'tool-call') {
            stepIndex++;
            insertAgentStep({
              run_id: runId,
              step_index: stepIndex,
              tool_name: chunk.toolName,
              tool_input: chunk.args,
              thought: `Calling ${chunk.toolName}`,
            }).catch(() => {});
          } else if (chunk.type === 'tool-result') {
            insertAgentStep({
              run_id: runId,
              step_index: stepIndex,
              tool_name: chunk.toolName,
              tool_output: chunk.result,
            }).catch(() => {});
          }
        },
        onFinish: async ({ text }) => {
          try {
            let analysis = await summarizeFindings(text, userInstruction, plan.url);
            analysis = await reviewFindings(analysis);

            for (const bug of analysis.bugs) {
              await insertFinding({
                run_id: runId,
                severity: bug.severity,
                title: bug.title,
                description: bug.description,
                repro_steps: bug.stepsToReproduce,
                source: 'flow',
              });
            }
            await finishTestRun(runId, {
              summary: analysis.summary,
              passed: analysis.passed,
              failed: analysis.failed,
              warnings: analysis.warnings,
              consoleErrors: analysis.consoleErrors,
              accessibilityWarnings: analysis.accessibilityWarnings,
              bugCount: analysis.bugs.length,
            });
          } catch (err) {
            console.error("Error persisting results:", err);
            await failTestRun(runId, String(err));
          }
        },
      });

      return result.toUIMessageStreamResponse({
        originalMessages: messages,
      });
    }

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model,
      messages: modelMessages,
      tools: { ...tools, ...allExtraTools },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
