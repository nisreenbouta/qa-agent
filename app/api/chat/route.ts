import { streamText, generateObject, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
import { TestPlanSchema } from '@/lib/types';

let mcpClientPromise: Promise<Awaited<ReturnType<typeof createMCPClient>>> | null = null;

async function getMcpTools() {
  if (!mcpClientPromise) {
    mcpClientPromise = (async () => {
      const client = await createMCPClient({
        transport: new Experimental_StdioMCPTransport({
          command: process.platform === 'win32' ? 'cmd.exe' : 'npx',
          args: process.platform === 'win32'
            ? ['/c', 'npx.cmd @playwright/mcp@latest --headless']
            : ['@playwright/mcp@latest', '--headless'],
        }),
      });
      return client;
    })();
  }
  const client = await mcpClientPromise;
  return client.tools();
}

const model = google('gemini-2.5-flash');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages }: { messages: UIMessage[] } = body;

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const userInstruction = lastUserMsg
      ? lastUserMsg.parts.map(p => (p as any).text || '').join('')
      : '';

    const tools = await getMcpTools() as any;

    if (userInstruction) {
      const { object: plan } = await generateObject({
        model,
        system: `You are a QA test planner. Given a user's testing instruction, produce a structured test plan.
Output ONLY the plan as a JSON object matching the schema.`,
        prompt: userInstruction,
        schema: TestPlanSchema,
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
        tools,
        stopWhen: stepCountIs(15),
      });

      return result.toUIMessageStreamResponse({
        originalMessages: messages,
      });
    }

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model,
      messages: modelMessages,
      tools,
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
