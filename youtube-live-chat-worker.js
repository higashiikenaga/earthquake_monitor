const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return corsResponse(null, 204);
    if (request.method !== "POST") return corsResponse({ error: "Method not allowed" }, 405);

    try {
      const body = await request.json();
      const message = String(body.message || "").trim();
      const videoId = String(body.videoId || extractYoutubeVideoId(body.videoUrl) || "").trim();
      if (!message) return corsResponse({ error: "message is required" }, 400);
      if (!videoId) return corsResponse({ error: "videoId is required" }, 400);

      const accessToken = await refreshAccessToken(env);
      const liveChatId = await getLiveChatId(videoId, accessToken);
      if (!liveChatId) return corsResponse({ error: "liveChatId not found" }, 404);

      const result = await insertLiveChatMessage(liveChatId, message, accessToken);
      return corsResponse({ ok: true, id: result.id || null });
    } catch (error) {
      return corsResponse({ error: String(error.message || error) }, 500);
    }
  }
};

async function refreshAccessToken(env) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token"
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  if (!res.ok) throw new Error(`OAuth refresh failed: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.access_token) throw new Error("OAuth refresh did not return access_token");
  return json.access_token;
}

async function getLiveChatId(videoId, accessToken) {
  const url = new URL(`${YOUTUBE_API}/videos`);
  url.searchParams.set("part", "liveStreamingDetails");
  url.searchParams.set("id", videoId);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`videos.list failed: HTTP ${res.status}`);
  const json = await res.json();
  return json.items?.[0]?.liveStreamingDetails?.activeLiveChatId || "";
}

async function insertLiveChatMessage(liveChatId, message, accessToken) {
  const url = new URL(`${YOUTUBE_API}/liveChat/messages`);
  url.searchParams.set("part", "snippet");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      snippet: {
        liveChatId,
        type: "textMessageEvent",
        textMessageDetails: { messageText: message.slice(0, 200) }
      }
    })
  });
  if (!res.ok) throw new Error(`liveChat.messages.insert failed: HTTP ${res.status}`);
  return res.json();
}

function extractYoutubeVideoId(url) {
  const text = String(url || "").trim();
  if (!text) return "";
  try {
    const parsed = new URL(text);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (parsed.pathname.startsWith("/live/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
    return parsed.searchParams.get("v") || "";
  } catch {
    return text;
  }
}

function corsResponse(body, status = 200) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
