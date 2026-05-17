import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { weatherTool } from './tools/example';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages }: { messages: UIMessage[] } = body;

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google('gemini-2.5-flash'),
      messages: modelMessages,
      stopWhen: stepCountIs(5),
      tools: { weather: weatherTool },
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