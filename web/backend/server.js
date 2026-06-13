require("dotenv").config();

const path = require("path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT || 8080);

const CLUBS = {
  default: {
    mapUrl: "https://strongastana.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://strongastana.app.enes.tech/api/v2/user/idm_admin_auth/",
    userInfoUrl: "https://strongastana.app.enes.tech/api/v2/map/",
    username: () => process.env.STRONG_USERNAME || process.env.ADMIN_USERNAME || process.env.LOG || "",
    password: () => process.env.STRONG_PASSWORD || process.env.ADMIN_PASSWORD || process.env.PAS || "",
  },
  satpayeva: {
    mapUrl: "https://satpayeva.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://satpayeva.app.enes.tech/api/v2/user/idm_admin_auth/",
    userInfoUrl: "https://satpayeva.app.enes.tech/api/v2/map/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  baitursynova: {
    mapUrl: "https://baitursynova.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://baitursynova.app.enes.tech/api/v2/user/idm_admin_auth/",
    userInfoUrl: "https://baitursynova.app.enes.tech/api/v2/map/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  primegamehub: {
    mapUrl: "https://primegamehub.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://primegamehub.app.enes.tech/api/v2/user/idm_admin_auth/",
    userInfoUrl: "https://primegamehub.app.enes.tech/api/v2/map/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  koshkarbayeva: {
    mapUrl: "https://koshkarbayeva.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://koshkarbayeva.app.enes.tech/api/v2/user/idm_admin_auth/",
    userInfoUrl: "https://koshkarbayeva.app.enes.tech/api/v2/map/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  kumysbekova: {
    mapUrl: "https://kumysbekova.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://kumysbekova.app.enes.tech/api/v2/user/idm_admin_auth/",
    userInfoUrl: "https://kumysbekova.app.enes.tech/api/v2/map/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
};

const tokenCaches = {};
for (const key of Object.keys(CLUBS)) {
  tokenCaches[key] = { token: "", createdAt: 0 };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

function resolveClub(req) {
  if (req.query._satpayeva === "1") return "satpayeva";
  if (req.query._baitursynova === "1") return "baitursynova";
  if (req.query._primegamehub === "1") return "primegamehub";
  if (req.query._koshkarbayeva === "1") return "koshkarbayeva";
  if (req.query._kumysbekova === "1") return "kumysbekova";
  return "default";
}

async function requestToken(forceRefresh = false, clubId = "default") {
  const tenDays = 10 * 24 * 60 * 60 * 1000;
  const club = CLUBS[clubId];
  if (!club) throw new Error(`Unknown club: ${clubId}`);

  const cache = tokenCaches[clubId];
  const username = club.username();
  const password = club.password();

  if (!forceRefresh && cache.token && Date.now() - cache.createdAt < tenDays) {
    return cache.token;
  }

  if (!username || !password) {
    throw new Error("Set credentials in .env");
  }

  const response = await fetch(club.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  const token = extractAuthToken(data);

  if (!response.ok || !token) {
    throw new Error(data?.message?.[0] || data?.detail || "Auth API did not return token");
  }

  tokenCaches[clubId] = { token, createdAt: Date.now() };
  return token;
}

function extractAuthToken(data) {
  if (!data || typeof data !== "object") return "";
  for (const key of ["token", "access", "access_token", "auth_token", "key"]) {
    if (typeof data[key] === "string" && data[key]) return data[key];
  }
  for (const key of ["data", "user", "result"]) {
    const t = extractAuthToken(data[key]);
    if (t) return t;
  }
  return "";
}

async function fetchMap(query, forceRefresh = false, clubId = "default") {
  const club = CLUBS[clubId];
  const token = await requestToken(forceRefresh, clubId);
  const response = await fetch(`${club.mapUrl}?${query || "office_id=1114&limit=9999"}`, {
    headers: { "Authorization": `Token ${token}` },
  });
  const data = await response.json();

  if (response.status === 401 && !forceRefresh) {
    return fetchMap(query, true, clubId);
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `Map API error ${response.status}`);
  }

  return data;
}

async function fetchUserInfoById(pcId, clubId = "default") {
  const club = CLUBS[clubId];
  const token = await requestToken(false, clubId);
  const url = `${club.userInfoUrl}${pcId}/user_info/`;

  const response = await fetch(url, {
    headers: { "Authorization": `Token ${token}` },
  });

  if (response.status === 401) {
    const token2 = await requestToken(true, clubId);
    const retry = await fetch(url, { headers: { "Authorization": `Token ${token2}` } });
    if (!retry.ok) return null;
    return retry.json();
  }

  if (!response.ok) return null;
  return response.json();
}

// --- Endpoints ---

app.get("/api/token", async (req, res) => {
  try {
    const clubId = resolveClub(req);
    res.json({ token: await requestToken(false, clubId) });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("/api/map", async (req, res) => {
  try {
    const clubId = resolveClub(req);
    const cleanQuery = { ...req.query };
    delete cleanQuery._satpayeva;
    delete cleanQuery._baitursynova;
    delete cleanQuery._primegamehub;
    delete cleanQuery._koshkarbayeva;
    delete cleanQuery._kumysbekova;
    res.json(await fetchMap(new URLSearchParams(cleanQuery).toString(), false, clubId));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("/api/user-info", async (req, res) => {
  try {
    const pcId = req.query.pc_id;
    if (!pcId) return res.status(400).json({ error: "pc_id required" });
    const clubId = resolveClub(req);
    const data = await fetchUserInfoById(pcId, clubId);
    res.json(data || {});
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/bookings", async (req, res) => {
  try {
    const response = await fetch("http://127.0.0.1:8085/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`WEB STARTED http://0.0.0.0:${PORT}`);
});
server.on("error", (err) => {
  console.error("WEB SERVER ERROR", err);
  process.exit(1);
});

setInterval(() => {}, 1 << 30);
