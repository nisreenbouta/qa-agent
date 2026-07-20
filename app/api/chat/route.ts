import { streamText, generateObject, convertToModelMessages, stepCountIs, embed, UIMessage } from 'ai';
import { google } from '@ai-sdk/google';

import { createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
import { z } from 'zod';
import { TestPlanSchema, AnalysisSchema, type Analysis } from '@/lib/types';
import { createTestRun, finishTestRun, failTestRun, insertFinding } from '@/lib/db/queries';
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
        tools: { ...tools, ...ragTool },
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

      const result = streamText({
        model,
        system: executionPrompt,
        messages: modelMessages,
        tools: { ...tools, ...ragTool },
        stopWhen: stepCountIs(15),
        onFinish: async ({ text }) => {
          try {
            const analysis = await summarizeFindings(text, userInstruction, plan.url);

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
      tools: { ...tools, ...ragTool },
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
