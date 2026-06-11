require("dotenv").config();

const path = require("path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT || 6767);
const MAP_URL = "https://strongastana.app.enes.tech/api/v2/map_v2/get_map/";
const TOKEN_URL = "https://strongastana.app.enes.tech/api/v2/user/admin_auth/";

let tokenCache = {
    token: "",
    createdAt: 0
};

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

async function requestToken(forceRefresh = false) {
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    const username = process.env.STRONG_USERNAME || process.env.ADMIN_USERNAME;
    const password = process.env.STRONG_PASSWORD || process.env.ADMIN_PASSWORD;

    if (!forceRefresh && tokenCache.token && Date.now() - tokenCache.createdAt < tenDays) {
        return tokenCache.token;
    }

    if (!username || !password) {
        throw new Error("Set STRONG_USERNAME and STRONG_PASSWORD in .env");
    }

    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    });
    const data = await response.json();
    const token = extractAuthToken(data);

    if (!response.ok || !token) {
        throw new Error(data?.message?.[0] || data?.detail || "Auth API did not return token");
    }

    tokenCache = {
        token,
        createdAt: Date.now()
    };

    return tokenCache.token;
}

function extractAuthToken(data) {
    if (!data || typeof data !== "object") {
        return "";
    }

    for (const key of ["token", "access", "access_token", "auth_token", "key"]) {
        if (typeof data[key] === "string" && data[key]) {
            return data[key];
        }
    }

    for (const key of ["data", "user", "result"]) {
        const token = extractAuthToken(data[key]);

        if (token) {
            return token;
        }
    }

    return "";
}

async function fetchMap(query, forceRefresh = false) {
    const token = await requestToken(forceRefresh);
    const response = await fetch(`${MAP_URL}?${query || "office_id=1114&limit=9999"}`, {
        headers: {
            "Authorization": `Token ${token}`
        }
    });
    const data = await response.json();

    if (response.status === 401 && !forceRefresh) {
        return fetchMap(query, true);
    }

    if (!response.ok) {
        throw new Error(data?.detail || data?.message || `Map API error ${response.status}`);
    }

    return data;
}

app.get("/api/token", async (req, res) => {
    try {
        res.json({ token: await requestToken() });
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

app.get("/api/map", async (req, res) => {
    try {
        res.json(await fetchMap(new URLSearchParams(req.query).toString()));
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

// Serve index.html for root path
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`WEB STARTED http://0.0.0.0:${PORT}`);
});
server.on("error", err => {
    console.error("WEB SERVER ERROR", err);
    process.exit(1);
});

setInterval(() => {}, 1 << 30);
