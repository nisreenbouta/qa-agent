import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages }: { messages: UIMessage[] } = body;

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google('gemini-2.5-flash'),
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
}
}