import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: run, error } = await supabase
    .from("test_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !run) {
    return new Response("Not found", { status: 404 });
  }

  const { data: findings } = await supabase
    .from("findings")
    .select("*")
    .eq("run_id", id)
    .order("created_at", { ascending: true });

  const summary = (run.summary || {}) as Record<string, any>;

  let md = `# Test Report\n\n`;
  md += `**URL:** ${run.url}\n`;
  md += `**Status:** ${run.status}\n`;
  md += `**Started:** ${new Date(run.started_at).toLocaleString()}\n`;
  if (run.finished_at) md += `**Finished:** ${new Date(run.finished_at).toLocaleString()}\n`;
  md += `**Findings:** ${(findings || []).length}\n\n`;

  if (run.brief) md += `## Test Brief\n\n${run.brief}\n\n`;

  if (summary.summary) md += `## Summary\n\n${summary.summary}\n\n`;
  if (summary.passed !== undefined) {
    md += `- Passed: ${summary.passed}\n- Failed: ${summary.failed}\n- Warnings: ${summary.warnings}\n\n`;
  }

  if (summary.consoleErrors?.length > 0) {
    md += `## Console Errors\n\n`;
    for (const err of summary.consoleErrors) {
      md += `- \`${err}\`\n`;
    }
    md += `\n`;
  }

  if (findings && findings.length > 0) {
    md += `## Findings\n\n`;
    for (const f of findings) {
      md += `### [${f.severity.toUpperCase()}] ${f.title}\n\n`;
      if (f.description) md += `${f.description}\n\n`;
      if (f.repro_steps && f.repro_steps.length > 0) {
        md += `**Steps to Reproduce:**\n\n`;
        for (const step of f.repro_steps) {
          md += `1. ${step}\n`;
        }
        md += `\n`;
      }
      if (f.screenshot_url) md += `![Screenshot](${f.screenshot_url})\n\n`;
    }
  }

  if ((!findings || findings.length === 0) && run.status === "done") {
    md += `No issues found. All checks passed.\n`;
  }

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="test-report-${id.slice(0, 8)}.md"`,
    },
  });
}
