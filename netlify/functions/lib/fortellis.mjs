function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getFortellisToken() {
  const clientId = requireEnv("FORTELLIS_CLIENT_ID");
  const clientSecret = requireEnv("FORTELLIS_CLIENT_SECRET");
  const baseUrl = requireEnv("FORTELLIS_BASE_URL");
  const scopes = process.env.FORTELLIS_SCOPES || "";

  const tokenUrl = `${baseUrl.replace(/\/$/, "")}/oauth2/token`;

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  if (scopes.trim()) {
    body.set("scope", scopes);
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: body.toString()
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
      data.error ||
      `Fortellis token request failed (${res.status})`
    );
  }

  return data.access_token;
}

export async function fortellisFetch(path, options = {}) {
  const token = await getFortellisToken();
  const baseUrl = requireEnv("FORTELLIS_BASE_URL");
  const subscriptionId = requireEnv("FORTELLIS_SUBSCRIPTION_ID");

  const {
    method = "GET",
    body,
    headers = {}
  } = options;

  const url = `${baseUrl.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Subscription-Id": subscriptionId,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.message ||
      data.error ||
      `Fortellis request failed (${res.status})`
    );
  }

  return data;
}

export function normalizePhone(phone = "") {
  const digits = String(phone).replace(/[^\d]/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return phone;
}