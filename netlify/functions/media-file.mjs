import { getMediaStore } from "./lib/store.mjs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key) {
      return Response.json({ error: "Missing media key" }, { status: 400 });
    }

    const store = getMediaStore();
    const data = await store.get(key, { type: "arrayBuffer" });
    const meta = await store.getMetadata(key);
    if (!data) {
      return Response.json({ error: "Media not found" }, { status: 404 });
    }

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": meta?.metadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (err) {
    console.error("media-file error:", err);
    return Response.json({ error: err.message || "Failed to read media file." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/media-file",
};
