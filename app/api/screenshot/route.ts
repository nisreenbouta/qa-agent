import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "Missing 'file' param" }, { status: 400 });
  }

  const safeName = path.basename(file);
  const filePath = path.join(process.cwd(), safeName);

  try {
    const data = await fs.readFile(filePath);
    const base64 = data.toString("base64");
    return NextResponse.json({ base64, mime: "image/png" });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
