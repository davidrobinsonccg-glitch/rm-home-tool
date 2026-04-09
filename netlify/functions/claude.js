// ─────────────────────────────────────────────────────────────────────────────
// R-M Home Tool — Netlify Function: Claude API proxy
// Keeps the Anthropic API key server-side. Never exposed to the browser.
//
// Environment variable required (set in Netlify dashboard):
//   ANTHROPIC_API_KEY=sk-ant-...
//
// All API calls from the React app hit /.netlify/functions/claude
// and this function forwards them to Anthropic with the key attached.
// ─────────────────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured on server." }),
    };
  }

  try {
    const body = JSON.parse(event.body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
