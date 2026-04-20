export function getBackendUrl() {
  const backendUrl = process.env.CSHARP_BACKEND_URL;
  if (!backendUrl) {
    throw new Error("Missing CSHARP_BACKEND_URL environment variable");
  }

  return backendUrl.replace(/\/+$/, "");
}

export async function parseBackendJson(apiRes) {
  const rawText = await apiRes.text();
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error("Invalid JSON returned by backend");
  }
}

export async function proxyJsonRequest(req, { method = "GET", backendPath, body } = {}) {
  const backendUrl = getBackendUrl();
  const apiRes = await fetch(`${backendUrl}${backendPath}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const data = await parseBackendJson(apiRes);
  return { apiRes, data };
}
