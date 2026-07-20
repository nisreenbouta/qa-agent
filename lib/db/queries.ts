import { supabase } from "@/lib/supabase";

export async function createTestRun(data: {
  id?: string;
  user_id: string;
  url: string;
  brief: string;
  plan_json?: unknown;
}) {
  const { data: run, error } = await supabase
    .from("test_runs")
    .insert({ ...data, status: "running" })
    .select()
    .single();
  if (error) throw error;
  return run;
}

export async function finishTestRun(
  runId: string,
  summary: unknown
) {
  const { error } = await supabase
    .from("test_runs")
    .update({ status: "done", finished_at: new Date().toISOString(), summary })
    .eq("id", runId);
  if (error) throw error;
}

export async function failTestRun(runId: string, errorMsg: string) {
  const { error } = await supabase
    .from("test_runs")
    .update({ status: "failed", finished_at: new Date().toISOString(), summary: { error: errorMsg } })
    .eq("id", runId);
  if (error) throw error;
}

export async function insertAgentStep(data: {
  run_id: string;
  step_index: number;
  tool_name?: string;
  tool_input?: unknown;
  tool_output?: unknown;
  thought?: string;
}) {
  const { error } = await supabase
    .from("agent_steps")
    .insert(data);
  if (error) throw error;
}

export async function insertFinding(data: {
  run_id: string;
  severity: string;
  title: string;
  description?: string;
  repro_steps?: string[];
  screenshot_url?: string;
  source: string;
}) {
  const { data: finding, error } = await supabase
    .from("findings")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return finding;
}

export async function uploadScreenshot(
  runId: string,
  stepIndex: number,
  buffer: Buffer
): Promise<string> {
  const filename = `${runId}/${stepIndex}.png`;
  const { error } = await supabase.storage
    .from("screenshots")
    .upload(filename, buffer, { contentType: "image/png", upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from("screenshots")
    .getPublicUrl(filename);
  return urlData.publicUrl;
}

export async function getRunWithFindings(runId: string) {
  const { data: run, error: runError } = await supabase
    .from("test_runs")
    .select("*")
    .eq("id", runId)
    .single();
  if (runError) throw runError;

  const { data: findings, error: findingsError } = await supabase
    .from("findings")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (findingsError) throw findingsError;

  return { run, findings };
}

export async function getUserRuns(userId: string) {
  const { data, error } = await supabase
    .from("test_runs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}
