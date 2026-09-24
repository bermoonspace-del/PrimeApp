const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");

const app = express();
const PORT = Number(process.env.PORT || 8080);

const CLUBS = {
  default: {
    mapUrl: "https://strongastana.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://strongastana.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://strongastana.app.enes.tech/api/v2/map/table/",
    username: () => process.env.STRONG_USERNAME || process.env.ADMIN_USERNAME || process.env.LOG || "",
    password: () => process.env.STRONG_PASSWORD || process.env.ADMIN_PASSWORD || process.env.PAS || "",
  },
  satpayeva: {
    mapUrl: "https://satpayeva.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://satpayeva.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://satpayeva.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  baitursynova: {
    mapUrl: "https://baitursynova.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://baitursynova.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://baitursynova.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  primegamehub: {
    mapUrl: "https://primegamehub.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://primegamehub.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://primegamehub.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  koshkarbayeva: {
    mapUrl: "https://koshkarbayeva.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://koshkarbayeva.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://koshkarbayeva.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  kumysbekova: {
    mapUrl: "https://kumysbekova.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://kumysbekova.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://kumysbekova.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  moldagalieva: {
    mapUrl: "https://moldagalieva.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://moldagalieva.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://moldagalieva.app.enes.tech/api/v2/map/table/",
    username: () => process.env.MOLDAGALIEVA_USERNAME || process.env.LOG || "",
    password: () => process.env.MOLDAGALIEVA_PASSWORD || process.env.PAS || "",
  },
  primekenesary: {
    mapUrl: "https://primekenesary.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://primekenesary.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://primekenesary.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  muhamedkhanova: {
    mapUrl: "https://muhamedkhanova.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://muhamedkhanova.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://muhamedkhanova.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  bekturova: {
    mapUrl: "https://bekturova.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://bekturova.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://bekturova.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
};

const tokenCaches = {};
for (const key of Object.keys(CLUBS)) {
  tokenCaches[key] = { token: "", createdAt: 0 };
}

// Bulk table cache for ALL clubs: 1 upstream request instead of N
const TABLE_TTL_MS = 3 * 1000;
const tableCaches = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

function resolveClub(req) {
  if (req.query._satpayeva === "1") return "satpayeva";
  if (req.query._baitursynova === "1") return "baitursynova";
  if (req.query._primegamehub === "1") return "primegamehub";
  if (req.query._koshkarbayeva === "1") return "koshkarbayeva";
  if (req.query._kumysbekova === "1") return "kumysbekova";
  if (req.query._moldagalieva === "1") return "moldagalieva";
  if (req.query._primekenesary === "1") return "primekenesary";
  if (req.query._muhamedkhanova === "1") return "muhamedkhanova";
  if (req.query._bekturova === "1") return "bekturova";
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

// Bulk table for ALL clubs: https://<club>.app.enes.tech/api/v2/map/table/?office_id=1&limit=9999
// office_id различается: ARNAU (default) = 1114, остальные = 1
async function fetchTable(forceRefresh = false, clubId = "default", officeId = null) {
  const club = CLUBS[clubId];
  if (!club.tableUrl) throw new Error(`No tableUrl for ${clubId}`);
  const oid = String(officeId || "1");
  const cacheKey = `${clubId}:${oid}`;
  if (!tableCaches[cacheKey]) tableCaches[cacheKey] = { data: null, createdAt: 0, promise: null };
  const cache = tableCaches[cacheKey];
  const now = Date.now();
  // TTL=0 → кэш только для дедупликации паралл. запросов, без задержки
  const isCacheValid = TABLE_TTL_MS > 0 && cache.data && now - cache.createdAt < TABLE_TTL_MS;
  if (!forceRefresh && isCacheValid) {
    return cache.data;
  }
  // дедуп: если уже идет запрос — ждем его, не создаем новый (независимо от TTL)
  if (cache.promise && !forceRefresh) {
    return cache.promise;
  }

  const task = (async () => {
    const token = await requestToken(forceRefresh, clubId);
    const url = `${club.tableUrl}?office_id=${encodeURIComponent(oid)}&limit=9999`;
    let response = await fetch(url, { headers: { "Authorization": `Token ${token}` } });

    if (response.status === 401 && !forceRefresh) {
      const token2 = await requestToken(true, clubId);
      response = await fetch(url, { headers: { "Authorization": `Token ${token2}` } });
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || data?.message || `Table API error ${response.status}`);
    }
    cache.data = data;
    cache.createdAt = Date.now();
    return data;
  })();

  cache.promise = task;
  try {
    return await task;
  } finally {
    cache.promise = null;
  }
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
    delete cleanQuery._moldagalieva;
    delete cleanQuery._primekenesary;
    delete cleanQuery._muhamedkhanova;
    delete cleanQuery._bekturova;
    res.json(await fetchMap(new URLSearchParams(cleanQuery).toString(), false, clubId));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Bulk table endpoint for ALL clubs: frontend делает 1 запрос вместо 100
app.get("/api/table", async (req, res) => {
  try {
    const clubId = resolveClub(req);
    const officeId = req.query.office_id || null;
    const data = await fetchTable(false, clubId, officeId);
    res.json(data);
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
