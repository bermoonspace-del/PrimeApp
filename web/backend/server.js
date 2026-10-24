const path = require("path");
const fs = require("fs");
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
  primeaqtau: {
    mapUrl: "https://primeaqtau.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://primeaqtau.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://primeaqtau.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  karagandy: {
    mapUrl: "https://karagandy.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://karagandy.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://karagandy.app.enes.tech/api/v2/map/table/",
    username: () => process.env.LOG || "",
    password: () => process.env.PAS || "",
  },
  kokshetau: {
    mapUrl: "https://mm1.app.enes.tech/api/v2/map_v2/get_map/",
    tokenUrl: "https://mm1.app.enes.tech/api/v2/user/idm_admin_auth/",
    tableUrl: "https://mm1.app.enes.tech/api/v2/map/table/",
    username: () => process.env.KOKSHETAU_USERNAME || process.env.LOG || "",
    password: () => process.env.KOKSHETAU_PASSWORD || process.env.PAS || "",
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
  if (req.query._primeaqtau === "1") return "primeaqtau";
  if (req.query._karagandy === "1") return "karagandy"
  if (req.query._kokshetau === "1") return "kokshetau"
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
    const msg = `Set credentials in .env for ${clubId}: username=${username?'set':'empty'} password=${password?'set':'empty'} (LOG=${process.env.LOG?'set':'empty'} PAS=${process.env.PAS?'set':'empty'})`;
    console.error(msg);
    throw new Error(msg);
  }

  let response;
  let text="";
  try{
    response = await fetch(club.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    text = await response.text();
  }catch(e){
    console.error(`Token fetch network error ${clubId} ${club.tokenUrl}:`, e.message);
    throw new Error(`Network error ${club.tokenUrl}: ${e.message}`);
  }
  let data;
  try{ data = text?JSON.parse(text):{}; }catch{ data={raw:text.slice(0,500)}; }
  const token = extractAuthToken(data);

  if (!response.ok || !token) {
    console.error(`Auth failed ${clubId} ${response.status} ${club.tokenUrl} user=${username} resp:`, text.slice(0,500));
    throw new Error(data?.message?.[0] || data?.detail || data?.raw || `Auth API ${response.status} ${club.tokenUrl} did not return token`);
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
  const url = `${club.mapUrl}?${query || "office_id=1114&limit=9999"}`;
  let response, text;
  try{
    response = await fetch(url, { headers: { "Authorization": `Token ${token}` } });
    text = await response.text();
  }catch(e){
    console.error(`Map fetch network error ${clubId} ${url}:`, e.message);
    throw new Error(`Network error map ${clubId}: ${e.message}`);
  }
  let data; try{ data = text?JSON.parse(text):{}; }catch{ data={raw:text.slice(0,500)}; }
  if (response.status === 401 && !forceRefresh) {
    return fetchMap(query, true, clubId);
  }
  if (!response.ok) {
    console.error(`Map failed ${clubId} ${response.status} ${url} resp:`, text.slice(0,500));
    throw new Error(data?.detail || data?.message || data?.raw || `Map API error ${response.status} ${url}`);
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
    let response, text;
    try{
      response = await fetch(url, { headers: { "Authorization": `Token ${token}` } });
      text = await response.text();
    }catch(e){
      console.error(`Table fetch network error ${clubId} ${url}:`, e.message);
      throw new Error(`Network error table ${clubId}: ${e.message}`);
    }
    let data; try{ data = text?JSON.parse(text):{}; }catch{ data={raw:text.slice(0,500)}; }
    if (response.status === 401 && !forceRefresh) {
      const token2 = await requestToken(true, clubId);
      try{
        response = await fetch(url, { headers: { "Authorization": `Token ${token2}` } });
        text = await response.text();
        try{ data = text?JSON.parse(text):{}; }catch{ data={raw:text.slice(0,500)}; }
      }catch(e){
        throw new Error(`Network error table retry ${clubId}: ${e.message}`);
      }
    }
    if (!response.ok) {
      console.error(`Table failed ${clubId} ${response.status} ${url} resp:`, text.slice(0,500));
      throw new Error(data?.detail || data?.message || data?.raw || `Table API error ${response.status} ${url}`);
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
    delete cleanQuery._primeaqtau;
    delete cleanQuery._karagandy;
    delete cleanQuery._kokshetau;
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

// --- Constructor API (восстановлено из bak) ---
const FRONTEND_ROOT = path.join(__dirname, "../frontend");
const NAVBAR_ROOT = path.join(FRONTEND_ROOT, "NAVBAR");
function isValidClubName(name){ return /^[a-zA-Z0-9_\-]{1,64}$/.test(name); }
// Prefer the html file whose name matches the club dir (some dirs contain stray copies).
async function findClubHtml(dir, club){
  const files=await fs.promises.readdir(dir).catch(()=>[]);
  const htmls=files.filter(f=>f.toLowerCase().endsWith(".html"));
  if(htmls.length===0) return null;
  const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const nc=norm(club);
  const hit=htmls.find(f=>{ const nb=norm(f.replace(/\.html$/i,"")); return nb&&nc&&(nb.includes(nc)||nc.includes(nb)); });
  return hit||htmls[0];
}
app.get("/api/constructor/list", async (req,res)=>{
  try{
    const entries=await fs.promises.readdir(NAVBAR_ROOT,{withFileTypes:true});
    const clubs=[]; for(const e of entries){ if(!e.isDirectory()) continue; const p=path.join(NAVBAR_ROOT,e.name,"positions.json"); try{await fs.promises.access(p); clubs.push(e.name);}catch{} }
    res.json({clubs});
  }catch(err){ res.status(500).json({error:err.message}); }
});
app.get("/api/constructor/load", async (req,res)=>{
  try{
    const club=String(req.query.club||"").trim(); if(!isValidClubName(club)) return res.status(400).json({error:"invalid club name"});
    const filePath=path.join(NAVBAR_ROOT,club,"positions.json"); const data=await fs.promises.readFile(filePath,"utf8"); res.type("application/json").send(data);
  }catch(err){ if(err.code==="ENOENT") return res.status(404).json({error:"not found"}); res.status(500).json({error:err.message}); }
});
app.post("/api/constructor/save", async (req,res)=>{
  try{
    const club=String(req.body.club||"").trim(); const data=req.body.data; if(!isValidClubName(club)) return res.status(400).json({error:"invalid club name"});
    if(!data||typeof data!=="object") return res.status(400).json({error:"data required"});
    const dir=path.join(NAVBAR_ROOT,club); await fs.promises.mkdir(dir,{recursive:true});
    const filePath=path.join(dir,"positions.json"); await fs.promises.writeFile(filePath, JSON.stringify(data,null,2),"utf8");
    res.json({ok:true, path:`NAVBAR/${club}/positions.json`});
  }catch(err){ res.status(500).json({error:err.message}); }
});
app.get("/api/constructor/zones", async (req,res)=>{
  try{
    const club=String(req.query.club||"").trim(); if(!isValidClubName(club)) return res.status(400).json({error:"invalid club name"});
    const dir=path.join(NAVBAR_ROOT,club); const htmlFile=await findClubHtml(dir,club);
    if(!htmlFile) return res.json({zones:[], htmlFile:null});
    const html=await fs.promises.readFile(path.join(dir,htmlFile),"utf8");
    const zoneRegex=/<rect[^>]*class="zone"[^>]*>/gi; const zones=[]; let m;
    while((m=zoneRegex.exec(html))!==null){ const tag=m[0]; const get=(attr)=>{ const r=new RegExp(attr+'\\s*=\\s*"([^"]+)"','i'); const mm=r.exec(tag); return mm?mm[1]:null; }; zones.push({zone:get("data-zone"), x:Number(get("x")), y:Number(get("y")), width:Number(get("width")), height:Number(get("height")), rx:Number(get("rx")||12)}); }
    const labelRegex=/<text[^>]*class="zone-label"[^>]*>([^<]+)<\/text>/gi; const labels=[]; while((m=labelRegex.exec(html))!==null){ labels.push(m[1].trim()); }
    res.json({zones, labels, htmlFile});
  }catch(err){ res.status(500).json({error:err.message}); }
});
// Save zones back into the club HTML file (rect.zone attrs + paired zone-label text).
// Pairing: each <text class="zone-label"> belongs to the closest preceding <rect class="zone">.
app.post("/api/constructor/zones", async (req,res)=>{
  try{
    const club=String(req.body.club||"").trim();
    const zones=req.body.zones;
    if(!isValidClubName(club)) return res.status(400).json({error:"invalid club name"});
    if(!Array.isArray(zones)) return res.status(400).json({error:"zones array required"});
    const dir=path.join(NAVBAR_ROOT,club);
    const htmlFile=await findClubHtml(dir,club);
    if(!htmlFile) return res.status(404).json({error:"html not found"});
    const fp=path.join(dir,htmlFile);
    let html=await fs.promises.readFile(fp,"utf8");
    const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const num=v=>{ const n=Number(v); return Number.isFinite(n)?Math.round(n):null; };
    // collect rect.zone tokens
    const rectRe=/<rect\b[^>]*class="zone"[^>]*>/gi;
    const textRe=/<text\b[^>]*class="zone-label"[^>]*>([\s\S]*?)<\/text>/gi;
    const rects=[]; let m;
    while((m=rectRe.exec(html))!==null){
      const tag=m[0];
      const dzm=/data-zone\s*=\s*"([^"]*)"/i.exec(tag);
      rects.push({index:m.index, tag, zone:dzm?dzm[1]:null});
    }
    if(rects.length===0) return res.status(400).json({error:"no editable zones in html (zones are JS-generated?)"});
    const texts=[]; 
    while((m=textRe.exec(html))!==null){ texts.push({index:m.index, len:m[0].length, inner:m[1]}); }
    // pair each rect with first text after it but before next rect
    const paired=rects.map((r,i)=>{
      const nextIdx=(i+1<rects.length)?rects[i+1].index:Infinity;
      const t=texts.find(t=>t.index>r.index && t.index<nextIdx) || null;
      return {rect:r, text:t};
    });
    const byZone=new Map();
    for(const z of zones){
      const key=String(z.zone??"");
      if(key && !byZone.has(key)) byZone.set(key,z);
    }
    const edits=[]; // {index,len,replacement}
    const skipped=[];
    const setAttr=(tag,attr,val)=>{
      if(val===null||val===undefined) return tag;
      const v=String(val);
      const re=new RegExp(attr+'\\s*=\\s*"[^"]*"','i');
      if(re.test(tag)) return tag.replace(re, `${attr}="${v}"`);
      return tag.replace(/<rect\b/i, `<rect ${attr}="${v}"`);
    };
    for(const p of paired){
      if(!p.rect.zone || !byZone.has(p.rect.zone)){ continue; }
      const z=byZone.get(p.rect.zone);
      let tag=p.rect.tag;
      const x=num(z.x), y=num(z.y), w=num(z.width), h=num(z.height), rx=(z.rx==null||z.rx==="")?null:num(z.rx);
      if(x===null||y===null||w===null||h===null){ skipped.push(p.rect.zone); continue; }
      tag=setAttr(tag,"x",x); tag=setAttr(tag,"y",y);
      tag=setAttr(tag,"width",Math.max(20,w)); tag=setAttr(tag,"height",Math.max(20,h));
      if(rx!==null) tag=setAttr(tag,"rx",rx);
      edits.push({index:p.rect.index, len:p.rect.tag.length, replacement:tag});
      if(p.text && z.label!=null){
        const openEnd=p.text.len; // full match length
        const full=html.substr(p.text.index, openEnd);
        const gt=full.indexOf(">");
        const newFull=full.slice(0,gt+1)+esc(z.label)+"</text>";
        edits.push({index:p.text.index, len:openEnd, replacement:newFull});
      }
    }
    for(const key of byZone.keys()){
      if(!paired.some(p=>p.rect.zone===key)) skipped.push(key);
    }
    edits.sort((a,b)=>b.index-a.index);
    for(const e of edits){ html=html.slice(0,e.index)+e.replacement+html.slice(e.index+e.len); }
    await fs.promises.writeFile(fp, html, "utf8");
    res.json({ok:true, htmlFile, updated:edits.length?paired.filter(p=>p.rect.zone&&byZone.has(p.rect.zone)).length:0, skipped});
  }catch(err){ res.status(500).json({error:err.message}); }
});
// Debug — проверить env и токены без раскрытия пароля
app.get("/api/debug/env", (req,res)=>{
  const clubId=resolveClub(req);
  const envStatus={
    LOG: process.env.LOG ? `set len=${process.env.LOG.length}` : "empty",
    PAS: process.env.PAS ? `set len=${process.env.PAS.length}` : "empty",
    STRONG_USERNAME: process.env.STRONG_USERNAME ? "set" : "empty",
    STRONG_PASSWORD: process.env.STRONG_PASSWORD ? "set" : "empty",
    club: clubId,
    hasToken: !!tokenCaches[clubId]?.token,
  };
  res.json(envStatus);
});
// Deprecated stub — чтобы старые кэшированные HTML не спамили 404 (1000 запросов)
// Возвращает пусто, не бьет в enes.tech
app.get("/api/user-info", (req, res) => {
  res.set("X-Deprecated", "use /api/table");
  res.json({});
});
app.get("/api/user-info/*", (req, res) => {
  res.set("X-Deprecated", "use /api/table");
  res.json({});
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
