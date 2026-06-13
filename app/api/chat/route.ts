import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';

let mcpClientPromise: Promise<Awaited<ReturnType<typeof createMCPClient>>> | null = null;

async function getMcpTools() {
  if (!mcpClientPromise) {
    mcpClientPromise = (async () => {
      const client = await createMCPClient({
        transport: new Experimental_StdioMCPTransport({
          command: 'npx',
          args: ['@playwright/mcp@latest', '--headless'],
        }),
      });
      return client;
    })();
  }
  const client = await mcpClientPromise;
  return client.tools();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages }: { messages: UIMessage[] } = body;

    const modelMessages = await convertToModelMessages(messages);
    const tools = await getMcpTools() as any;

    const result = streamText({
      model: google('gemini-2.5-flash'),
      messages: modelMessages,
      stopWhen: stepCountIs(5),
      tools,
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
