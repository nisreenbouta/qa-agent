import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

import fs from "fs/promises";
import { embedMany } from "ai";
import { google } from "@ai-sdk/google";

const embeddingModel = google.embedding("gemini-embedding-001");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Chunk {
  source: string;
  title: string;
  text: string;
}

async function loadKnowledgeFiles(): Promise<Chunk[]> {
  const knowledgeDir = path.join(process.cwd(), "knowledge");
  const files = await fs.readdir(knowledgeDir);
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();

  const chunks: Chunk[] = [];

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(knowledgeDir, file), "utf-8");
    const source = file.replace(/^\d+-/, "").replace(/\.md$/, "");
    const titleLine = content.split("\n")[0].replace(/^#\s*/, "").trim();

    const sections = content.split(/\n(?=##\s)/);
    for (const section of sections) {
      const lines = section.trim().split("\n");
      const sectionTitle = (lines[0] || "").replace(/^##\s*/, "").trim();
      const body = lines.slice(1).join("\n").trim();
      if (!body) continue;

      const subChunks = splitIntoChunks(body, 512);
      for (const chunk of subChunks) {
        chunks.push({
          source,
          title: sectionTitle ? `${titleLine} - ${sectionTitle}` : titleLine,
          text: chunk,
        });
      }
    }
  }

  return chunks;
}

function splitIntoChunks(text: string, maxTokens: number): string[] {
  const avgCharsPerToken = 4;
  const maxChars = maxTokens * avgCharsPerToken;
  const chunks: string[] = [];

  const paragraphs = text.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current += (current ? "\n\n" : "") + trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.trim()].filter(Boolean);
}

async function supabaseFetch(path: string, options: any = {}) {
  const url = `${supabaseUrl}/rest/v1/${path}`;
  const headers = {
    "apikey": serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase API error (${res.status}): ${text}`);
  }
  return res;
}

async function ingest() {
  console.log("Loading knowledge files...");
  const chunks = await loadKnowledgeFiles();
  console.log(`Loaded ${chunks.length} chunks from knowledge corpus.`);

  const BATCH_SIZE = 20;
  let inserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    console.log(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${texts.length} chunks)...`);
    const { embeddings, usage } = await embedMany({
      model: embeddingModel,
      values: texts,
    });
    console.log(`  Tokens used: ${usage.tokens}`);

    const rows = batch.map((chunk, idx) => ({
      source: chunk.source,
      title: chunk.title,
      chunk: chunk.text,
      embedding: embeddings[idx],
    }));

    await supabaseFetch("qa_knowledge", {
      method: "POST",
      body: JSON.stringify(rows),
    });

    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${chunks.length}`);
  }

  console.log(`\nDone! ${inserted} chunks ingested into qa_knowledge.`);
}

ingest().catch((err) => {
  console.error("Ingest failed:", err);
  process.exit(1);
});
