import { getCampaignStore } from "./lib/store.mjs";

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || "").trim();
    });
    return row;
  });
}

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const store = getCampaignStore();
  const form = await req.formData();
  const file = form.get("file");

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const csvText = await file.text();
  const rows = parseCsv(csvText);

  if (!rows.length) {
    return Response.json({ error: "No rows found in CSV." }, { status: 400 });
  }

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  if (!headers.includes("phone")) {
    return Response.json(
      { error: "Missing required column: phone" },
      { status: 400 }
    );
  }

  const validRows = rows.filter((row) => String(row.phone || "").trim());

  if (!validRows.length) {
    return Response.json(
      { error: "No valid rows found. At least one row must contain a phone value." },
      { status: 400 }
    );
  }

  await store.setJSON("latest-campaign", {
    uploadedAt: new Date().toISOString(),
    headers,
    rows: validRows,
  });

  return Response.json({
    success: true,
    rowsImported: validRows.length,
    headers,
  });
};

export const config = {
  path: "/.netlify/functions/upload-campaign",
};