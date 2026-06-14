"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  high: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  low: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  info: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
};

const toolLabels: Record<string, string> = {
  browser_navigate: "Navigating to",
  browser_click: "Clicking",
  browser_type: "Typing",
  browser_select: "Selecting",
  browser_hover: "Hovering",
  browser_press_key: "Pressing key",
  browser_take_screenshot: "Taking screenshot",
  browser_reload: "Reloading page",
  browser_close: "Closing page",
  browser_set_viewport_size: "Resizing viewport",
};

function parseBugReport(text: string): { before: string; reports: Array<ReturnType<typeof parseReportBlock>>; after: string } {
  const reports: Array<ReturnType<typeof parseReportBlock>> = [];
  const regex = /## Bug Report\s*\n([\s\S]*?)(?=\n##\s|$)/g;
  const sections: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      sections.push(text.slice(lastIndex, match.index));
    }
    reports.push(parseReportBlock(match[1]));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    sections.push(text.slice(lastIndex));
  }

  return { before: sections[0] || "", reports, after: sections.slice(1).join("\n") || "" };
}

function parseReportBlock(block: string) {
  const get = (label: string): string => {
    const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, "i");
    const m = block.match(re);
    return m ? m[1].trim() : "";
  };
  const getList = (label: string): string[] => {
    const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, "i");
    const m = block.match(re);
    if (!m) return [];
    return m[1].split("\n").map(l => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
  };
  const getSteps = (): string[] => {
    const m = block.match(/\*\*Steps to Reproduce:\*\*\s*([\s\S]*?)(?=\n\*\*Actual|\n\*\*Expected|\n\*\*Console|\n\*\*Accessibility|\n\*\*Visual|\n\*\*Recommendations|$)/i);
    if (!m) return [];
    return m[1].split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
  };

  return {
    title: get("Title"),
    severity: get("Severity").toLowerCase(),
    description: get("Description"),
    steps: getSteps(),
    actual: get("Actual Behavior"),
    expected: get("Expected Behavior"),
    consoleErrors: getList("Console Errors"),
    a11yIssues: getList("Accessibility Issues"),
    visualIssues: getList("Visual Issues"),
    recommendations: getList("Recommendations"),
  };
}

function BugReportCard({ report }: { report: ReturnType<typeof parseReportBlock> }) {
  const colorClass = severityColors[report.severity] || severityColors.info;
  return (
    <div className="my-3 border rounded-lg overflow-hidden">
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${colorClass}`}>
        <span className="text-xs font-bold uppercase tracking-wide">{report.severity || "info"}</span>
        <span className="text-sm font-semibold">{report.title || "Bug Report"}</span>
      </div>
      <div className="p-3 text-sm space-y-2">
        {report.description && <p>{report.description}</p>}
        {report.steps.length > 0 && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">Steps to Reproduce</p>
            <ol className="list-decimal list-inside space-y-0.5">
              {report.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {report.actual && (
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-destructive">Actual</p>
              <p className="text-sm">{report.actual}</p>
            </div>
          )}
          {report.expected && (
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-green-600 dark:text-green-400">Expected</p>
              <p className="text-sm">{report.expected}</p>
            </div>
          )}
        </div>
        {report.consoleErrors.length > 0 && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-destructive">Console Errors</p>
            {report.consoleErrors.map((e, i) => <p key={i} className="font-mono text-xs bg-muted px-1 py-0.5 rounded mt-0.5">{e}</p>)}
          </div>
        )}
        {report.a11yIssues.length > 0 && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-destructive">Accessibility Issues</p>
            {report.a11yIssues.map((e, i) => <p key={i} className="text-sm">• {e}</p>)}
          </div>
        )}
        {report.visualIssues.length > 0 && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-destructive">Visual Issues</p>
            {report.visualIssues.map((e, i) => <p key={i} className="text-sm">• {e}</p>)}
          </div>
        )}
        {report.recommendations.length > 0 && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Recommendations</p>
            {report.recommendations.map((e, i) => <p key={i} className="text-sm">• {e}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallStatus({ toolName, args }: { toolName: string; args: any }) {
  const label = toolLabels[toolName] || `Running ${toolName}`;
  const target = args?.url || args?.selector || args?.filename || "";
  return (
    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
      <span className="font-medium">{label}</span>
      {target && <span className="truncate max-w-[200px] opacity-70">{target}</span>}
    </div>
  );
}

function ScreenshotImage({ filename }: { filename: string }) {
  const [base64, setBase64] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/screenshot?file=${encodeURIComponent(filename)}`)
      .then(r => r.json())
      .then(d => { if (d.base64) setBase64(d.base64); else setError(true); })
      .catch(() => setError(true));
  }, [filename]);

  if (error) return <p className="text-xs text-destructive">Screenshot unavailable</p>;
  if (!base64) return <div className="w-full h-20 bg-muted animate-pulse rounded" />;
  return <img src={`data:image/png;base64,${base64}`} alt="Screenshot" className="rounded border max-w-full my-2" />;
}

function ToolCallPart({ part }: { part: any }) {
  if (part.state === "call" || part.state === "partial-call") {
    const args = part.args || part.input || {};
    return <ToolCallStatus toolName={part.toolName} args={args} />;
  }

  if (part.state === "output-available") {
    let data = part.output;
    if (data?.content?.[0]?.text) {
      try { data = JSON.parse(data.content[0].text); } catch { data = data; }
    }
    if (part.toolName === "browser_take_screenshot") {
      const filename = part.args?.filename || part.input?.filename;
      if (filename) return <ScreenshotImage filename={filename} />;
    }
  }

  return null;
}

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
        <h1 className="text-xl font-semibold">QA Agent</h1>
        <p className="text-sm text-muted-foreground">Describe what to test in plain English</p>
      </header>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground text-center">
              <p className="text-lg font-medium">What should I test?</p>
              <p className="text-sm mt-1">Try: &quot;Go to example.com and check the signup form works&quot;</p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <Avatar>
                <AvatarFallback>{m.role === "user" ? "U" : "AI"}</AvatarFallback>
              </Avatar>
              <Card
                className={`max-w-[80%] py-2 px-4 ${m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
                }`}
              >
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    const text = (part as any).text;
                    const parsed = parseBugReport(text);
                    return (
                      <div key={i}>
                        {parsed.before && <p className="text-sm whitespace-pre-wrap">{parsed.before}</p>}
                        {parsed.reports.map((report, ri) => (
                          <BugReportCard key={ri} report={report} />
                        ))}
                        {parsed.after && <p className="text-sm whitespace-pre-wrap mt-2">{parsed.after}</p>}
                      </div>
                    );
                  }
                  if (typeof part.type === "string" && (part.type.startsWith("tool-") || part.type === "dynamic-tool")) {
                    return <ToolCallPart key={i} part={part} />;
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
              <Card className="bg-muted py-2 px-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-foreground/40 animate-pulse" />
                <p className="text-sm text-muted-foreground">Planning &amp; testing...</p>
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
            placeholder='e.g. "Go to example.com and test the form"'
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
