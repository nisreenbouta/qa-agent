import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  high: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  low: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  info: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
};

async function getRun(id: string) {
  const { data: run, error } = await supabase
    .from("test_runs")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !run) return null;

  const { data: findings } = await supabase
    .from("findings")
    .select("*")
    .eq("run_id", id)
    .order("created_at", { ascending: true });

  return { run, findings: findings || [] };
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRun(id);
  if (!data) notFound();

  const { run, findings } = data;

  return (
    <div className="max-w-3xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/chat" className="text-sm text-muted-foreground hover:underline">
            &larr; Back to chat
          </Link>
          <h1 className="text-2xl font-bold mt-1">Test Report</h1>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded ${
          run.status === "done" ? "bg-green-100 text-green-800" :
          run.status === "failed" ? "bg-red-100 text-red-800" :
          "bg-blue-100 text-blue-800"
        }`}>
          {run.status}
        </span>
      </div>

      <CardSection title="Run Details">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">URL:</span> {run.url}</div>
          <div><span className="text-muted-foreground">Started:</span> {new Date(run.started_at).toLocaleString()}</div>
          {run.finished_at && (
            <div><span className="text-muted-foreground">Finished:</span> {new Date(run.finished_at).toLocaleString()}</div>
          )}
          <div><span className="text-muted-foreground">Bugs found:</span> {findings.length}</div>
        </div>
      </CardSection>

      {run.brief && (
        <CardSection title="Test Brief">
          <p className="text-sm whitespace-pre-wrap">{run.brief}</p>
        </CardSection>
      )}

      {findings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Findings ({findings.length})</h2>
          {findings.map((f: any) => (
            <div key={f.id} className="border rounded-lg overflow-hidden">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${severityStyles[f.severity] || severityStyles.info}`}>
                <span className="text-xs font-bold uppercase tracking-wide">{f.severity}</span>
                <span className="text-sm font-semibold">{f.title}</span>
              </div>
              <div className="p-3 text-sm space-y-2">
                {f.description && <p>{f.description}</p>}
                {f.repro_steps && Array.isArray(f.repro_steps) && f.repro_steps.length > 0 && (
                  <div>
                    <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">Steps to Reproduce</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      {f.repro_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}
                {f.screenshot_url && (
                  <img src={f.screenshot_url} alt="Screenshot" className="rounded border max-w-full my-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {findings.length === 0 && run.status === "done" && (
        <CardSection title="No Issues Found">
          <p className="text-sm text-muted-foreground">All checks passed. No bugs or issues detected.</p>
        </CardSection>
      )}
    </div>
  );
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}
