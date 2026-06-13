"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatPage() {
  const { messages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Chat</h1>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <p>Start a conversation</p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar>
                <AvatarFallback>
                  {m.role === "user" ? "U" : "AI"}
                </AvatarFallback>
              </Avatar>
              <Card
                className={`max-w-[80%] py-2 px-4 ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <p key={i} className="text-sm whitespace-pre-wrap">
                        {(part as any).text}
                      </p>
                    );
                  }
                  if (typeof part.type === "string" && (part.type.startsWith("tool-") || part.type === "dynamic-tool")) {
                    const p = part as any;
                    if (p.state === "output-available") {
                      let data = p.output;
                      if (data?.content?.[0]?.text) {
                        try { data = JSON.parse(data.content[0].text); } catch {}
                      }
                      if (data?.screenshotBase64) {
                        return (
                          <div key={i} className="my-2">
                            <img
                              src={`data:image/png;base64,${data.screenshotBase64}`}
                              alt={`Screenshot`}
                              className="rounded border max-w-full"
                            />
                          </div>
                        );
                      }
                    }
                    return null;
                  }
                  return null;
                })}
              </Card>
            </div>
          ))}
          {error && (
            <div className="flex gap-3">
              <Avatar>
                <AvatarFallback>!</AvatarFallback>
              </Avatar>
              <Card className="bg-destructive/10 border-destructive/30 py-2 px-4">
                <p className="text-sm text-destructive font-medium">API Error</p>
                <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
              </Card>
            </div>
          )}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <Avatar>
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <Card className="bg-muted py-2 px-4">
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}