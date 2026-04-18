import { fortellisFetch, normalizePhone } from "./lib/fortellis.mjs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const phone = normalizePhone(url.searchParams.get("phone") || "");
    const path = process.env.FORTELLIS_CUSTOMER_BY_PHONE_PATH;

    if (!phone) {
      return Response.json({ error: "Missing phone" }, { status: 400 });
    }

    if (!path) {
      return Response.json(
        { error: "Missing FORTELLIS_CUSTOMER_BY_PHONE_PATH" },
        { status: 500 }
      );
    }

    // Generic query-string pattern so you can adapt to your enabled API path.
    const separator = path.includes("?") ? "&" : "?";
    const data = await fortellisFetch(`${path}${separator}phone=${encodeURIComponent(phone)}`);

    return Response.json({ success: true, phone, data });
  } catch (err) {
    return Response.json(
      { error: err.message || "Customer lookup failed." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/cdk-customer-by-phone",
};