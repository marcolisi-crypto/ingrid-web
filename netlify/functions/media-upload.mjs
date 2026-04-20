import { getMediaStore } from "./lib/store.mjs";

function sanitizeFileName(name = "") {
  return String(name || "media").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
}

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const contentType = file.type || "application/octet-stream";
    const safeName = sanitizeFileName(file.name || "media-upload");
    const key = `uploads/${Date.now()}-${safeName}`;
    const store = getMediaStore();

    await store.set(key, arrayBuffer, {
      metadata: {
        contentType,
        fileName: file.name || safeName,
        uploadedAt: new Date().toISOString()
      }
    });

    const serveUrl = `/.netlify/functions/media-file?key=${encodeURIComponent(key)}`;
    return Response.json({
      success: true,
      key,
      fileName: file.name || safeName,
      contentType,
      storageUrl: serveUrl,
      thumbnailUrl: serveUrl
    });
  } catch (err) {
    console.error("media-upload error:", err);
    return Response.json({ error: err.message || "Failed to upload media." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/media-upload",
};
