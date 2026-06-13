const tg = window.Telegram?.WebApp;

tg?.expand();

// Configuration for local backend
const BACKEND_URL = "https://primeapp-2.onrender.com";

const API_URL =
    `/api/map?office_id=1&limit=9999&_primegamehub=1`;

const USER_INFO_URL_PREFIX =
    "https://primegamehub.app.enes.tech/api/v2/map/";

const SEED_CAP_TOKEN =
    "";

const TOKEN_STORAGE_KEY = "primegamehub.map.capToken.v2";
const LEGACY_TOKEN_STORAGE_KEYS = [
    "primegamehub.map.token"
];
const TOKEN_REFRESH_INTERVAL_MS = 10 * 24 * 60 * 60 * 1000;

let currentPCs = [];
let memoryTokenCache = null;

const VIEWBOX_WIDTH = 1440;
const VIEWBOX_HEIGHT = 725;
const GRID_UNIT = 70;

const WALL_X = 50;
const WALL_Y = 50;
const WALL_WIDTH = 1390;
const WALL_HEIGHT = 625;

// Static PC positions loaded from positions.json (viewBox 1440x725)
// Edit positions in: /web/frontend/NAVBAR/TRIUMPH/positions.json
const PC_POSITIONS = new Map();
// Add version parameter to force reload and bypass any caching issues
const POSITIONS_URL = new URL('positions.json?v=' + Date.now(), document.currentScript ? document.currentScript.src : location.href).toString();
let PC_POSITIONS_LOADED = false;

async function loadPositions() {
    try {
        const res = await fetch(POSITIONS_URL, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error('positions.json HTTP ' + res.status);
        }
        const data = await res.json();
        PC_POSITIONS.clear();
        let outerOrigin = [0, 0];
        let blocksData = data;
        const topKeys = Object.keys(data);
        if (topKeys.length === 1) {
            const top = data[topKeys[0]];
            if (top && typeof top === 'object' && !Array.isArray(top) && top.blocks && typeof top.blocks === 'object' && Array.isArray(top.origin)) {
                outerOrigin = [Number(top.origin[0]) || 0, Number(top.origin[1]) || 0];
                blocksData = top.blocks;
                console.log('Layout origin applied:', outerOrigin, 'from layout:', top.origin);
            }
        }
        for (const blockName of Object.keys(blocksData)) {
            const block = blocksData[blockName] || {};
            if (Array.isArray(block.origin) && block.pcs && typeof block.pcs === 'object') {
                const ox = Number(block.origin[0]) + outerOrigin[0];
                const oy = Number(block.origin[1]) + outerOrigin[1];
                const step = Number(block.step);
                const stepYRaw = block.stepY;
                const stepY = (stepYRaw != null && Number.isFinite(Number(stepYRaw)) && Number(stepYRaw) > 0) ? Number(stepYRaw) : step;
                if (!Number.isFinite(ox) || !Number.isFinite(oy) || !Number.isFinite(step) || step <= 0) continue;
                for (const key of Object.keys(block.pcs)) {
                    const num = Number(key);
                    if (!Number.isFinite(num)) continue;
                    const cell = block.pcs[key];
                    if (cell && typeof cell === 'object' && !Array.isArray(cell) && Array.isArray(cell.override) && cell.override.length >= 2) {
                        const ox2 = Number(cell.override[0]) + outerOrigin[0];
                        const oy2 = Number(cell.override[1]) + outerOrigin[1];
                        if (Number.isFinite(ox2) && Number.isFinite(oy2)) {
                            PC_POSITIONS.set(num, [ox2, oy2]);
                        }
                        continue;
                    }
                    if (!Array.isArray(cell) || cell.length < 2) continue;
                    const col = Number(cell[0]);
                    const row = Number(cell[1]);
                    if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
                    PC_POSITIONS.set(num, [ox + col * step, oy + row * stepY]);
                }
                continue;
            }
            for (const key of Object.keys(block)) {
                const num = Number(key);
                const pair = block[key];
                if (!Number.isFinite(num) || !Array.isArray(pair) || pair.length < 2) continue;
                const x = Number(pair[0]);
                const y = Number(pair[1]);
                if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                PC_POSITIONS.set(num, [x, y]);
            }
        }
        PC_POSITIONS_LOADED = true;
        if (Array.isArray(currentPCs) && currentPCs.length) {
            renderPCs(currentPCs);
        }
        return true;
    } catch (err) {
        console.warn('loadPositions failed:', err);
        PC_POSITIONS_LOADED = false;
        return false;
    }
}

const STATUS_BY_ID = {
    "-5": {
        name: "System update",
        color: "#FF9800",
        kind: "service"
    },
    "-3": {
        name: "Выключен",
        color: "#A9A9AA",
        kind: "offline"
    },
    "-2": {
        name: "Включен",
        color: "#4CAF50",
        kind: "free"
    },
    "-1": {
        name: "Администратор",
        color: "#F20D0D",
        kind: "service"
    },
    "0": {
        name: "Check",
        color: "#F20D0D",
        kind: "service"
    },
    "1": {
        name: "General",
        color: "#FF9800",
        kind: "busy"
    },
    "2": {
        name: "School",
        color: "#FF9800",
        kind: "busy"
    },
    "3": {
        name: "Staff",
        color: "#FF9800",
        kind: "busy"
    },
    "4": {
        name: "Postpaid",
        color: "#FF9800",
        kind: "busy"
    },
    "5": {
        name: "Забронирован",
        color: "#9C27B0",
        kind: "reserved"
    },
    "6": {
        name: "Тех. обслуживание",
        color: "#2196F3",
        kind: "maintenance"
    }
};

function getComputerState(pc) {
    if (!pc || typeof pc !== 'object') {
        return null;
    }

    const rawState = String(pc.status || pc.state || pc.machine_status || pc.map_status || '').toLowerCase();

    if (Number(pc.work_mode) === 1) {
        return 'reserved';
    }

    if ([pc.is_in_maintenance, pc.in_maintenance, pc.maintenance, pc.tech_service, pc.is_maintenance].some(Boolean) || rawState.includes('maintenance') || rawState.includes('tech')) {
        return 'maintenance';
    }

    if ([pc.is_booked, pc.booked, pc.reserved, pc.is_reserved, pc.isBooked].some(Boolean) || rawState.includes('book') || rawState.includes('reserved')) {
        return 'reserved';
    }

    if (String(pc.map_status) === '5') {
        return 'reserved';
    }

    if (String(pc.map_status) === '6') {
        return 'maintenance';
    }

    return null;
}

function debounce(fn, wait = 100) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

async function loadPCs() {

    try {

        showMapMessage("Загрузка компьютеров...");

        const json = await fetchMapData();

        const pcs = normalizePCs(json).filter(isComputer);

        // cache for resize re-render
        currentPCs = pcs;

        renderPCs(pcs);
        bindZonesAndPCs();

        await renderSoonList(pcs);

        if (pcs.length === 0) {
            showMapMessage("Компьютеры не найдены. Проверьте ответ API или координаты рабочих мест.");
        } else {
            hideMapMessage();
        }

    } catch (err) {

        console.error(
            "Ошибка загрузки карты:",
            err
        );

        currentPCs = [];
        renderPCs([]);
        renderSoonList([]);
        showMapMessage(getLoadErrorMessage(err));
    }
}

function clearLegacyTokenCaches() {
    for (const key of LEGACY_TOKEN_STORAGE_KEYS) {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.warn("Не удалось очистить старый токен", err);
        }
    }
}

function isTokenError(err) {
    const status = err?.status;
    const message = String(err?.message || "").toLowerCase();

    return (
        status === 401 ||
        status === 403 ||
        message.includes("token") ||
        message.includes("authorization") ||
        message.includes("user session not found")
    );
}

async function fetchMapData() {
    const token = await getAuthToken();

    try {
        return await fetchMapDataWithToken(token);
    } catch (err) {
        if (!isTokenError(err)) {
            throw err;
        }

        clearTokenCache();
        const freshToken = await getAuthToken({ forceRefresh: true });

        return fetchMapDataWithToken(freshToken);
    }
}

function fetchMapDataWithToken(token) {
    return fetchJson(API_URL, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${token}`
        }
    });
}

async function getAuthToken({ forceRefresh = false } = {}) {
    const cachedToken = readTokenCache();

    if (!forceRefresh && isTokenFresh(cachedToken)) {
        return cachedToken.token;
    }

    showMapMessage("Обновление токена...");

    try {
        const json = await fetchJson("/api/token?_primegamehub=1");

        const token = json?.token;

        if (!token) {
            throw new Error("API токена не вернул token");
        }

        writeTokenCache(token);

        return token;
    } catch (err) {
        if (!forceRefresh && cachedToken?.token && !isTokenError(err)) {
            console.warn("Не удалось обновить токен, используем сохраненный", err);

            return cachedToken.token;
        }

        if (!forceRefresh && SEED_CAP_TOKEN) {
            console.warn("Не удалось получить новый токен, используем последний рабочий cap_token", err);
            writeTokenCache(SEED_CAP_TOKEN);

            return SEED_CAP_TOKEN;
        }

        throw err;
    }
}

function isTokenFresh(cache) {
    if (!cache?.token || !cache?.createdAt) {
        return false;
    }

    return Date.now() - cache.createdAt < TOKEN_REFRESH_INTERVAL_MS;
}

function readTokenCache() {
    try {
        const rawCache = localStorage.getItem(TOKEN_STORAGE_KEY);

        if (!rawCache) {
            return memoryTokenCache;
        }

        return JSON.parse(rawCache);
    } catch (err) {
        return memoryTokenCache;
    }
}

function writeTokenCache(token) {
    const cache = {
        token,
        createdAt: Date.now()
    };

    memoryTokenCache = cache;

    try {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(cache));
    } catch (err) {
        console.warn("Не удалось сохранить токен в localStorage", err);
    }
}

function clearTokenCache() {
    memoryTokenCache = null;

    try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (err) {
        console.warn("Не удалось очистить токен в localStorage", err);
    }
}

async function fetchJson(url, options = {}) {
    const fullUrl = (BACKEND_URL && url.startsWith("/")) ? BACKEND_URL + url : url;
    const response = await fetch(fullUrl, options);
    const text = await response.text();
    let body = null;

    if (text.trim() !== "") {
        try {
            body = JSON.parse(text);
        } catch (err) {
            throw new Error("API вернул не JSON");
        }
    }

    if (!response.ok) {
        const detail = body?.detail || body?.message || response.statusText;
        const error = new Error(`API error ${response.status}: ${detail}`);

        error.status = response.status;
        error.body = body;

        throw error;
    }

    return body;
}

function normalizePCs(json) {
    if (Array.isArray(json)) {
        return json;
    }

    const listKeys = ["results", "data", "items", "pcs", "computers", "workstations"];

    for (const key of listKeys) {
        if (Array.isArray(json?.[key])) {
            return json[key];
        }
    }

    if (json && typeof json === "object") {
        const nestedList = Object.values(json).find(Array.isArray);

        if (nestedList) {
            return nestedList;
        }
    }

    return [];
}

function isComputer(item) {
    return Number(item?.object_type_id) === 0;
}

function getStatusSummary(pcs) {
    return pcs.reduce((summary, pc) => {
        const status = getStatusInfo(pc).name;

        summary[status] = (summary[status] || 0) + 1;

        return summary;
    }, {});
}

function getLoadErrorMessage(err) {
    const message = err?.message || "";

    if (message.includes("401") || message.includes("403") || message.includes("wrong token") || message.includes("invalid token") || message.includes("user session not found")) {
        return "API карты не принял токен. Проверьте key/domain для получения cap_token.";
    }

    if (message.includes("Token not found")) {
        return "API не выдал новый токен: key для cap_token не найден или уже использован.";
    }

    return `Не удалось загрузить компьютеры. ${message}`;
}

function getStatusInfo(pc) {
    const specialState = getComputerState(pc);

    if (specialState === 'maintenance') {
        return {
            id: 'maintenance',
            name: 'Тех. обслуживание',
            color: '#2196F3',
            kind: 'maintenance'
        };
    }

    if (specialState === 'reserved') {
        return {
            id: 'reserved',
            name: 'Забронирован',
            color: '#d2c91c',
            kind: 'reserved'
        };
    }

    const mapStatus = Number(pc.map_status);
    const status = STATUS_BY_ID[mapStatus];

    if (status) {
        return {
            id: mapStatus,
            ...status
        };
    }

    return {
        id: pc.map_status,
        name: "Неизвестно",
        color: "#2A2A2A",
        kind: "offline"
    };
}

function getStatus(pc) {
    return getStatusInfo(pc).kind;
}

function isVipComputer(pc) {
    const number = Number(pc.num);

    return Number.isFinite(number) && number >= 8 && number <= 107;
}

function renderPCs(pcs) {

    const container =
        document.getElementById("pcs");

    container.innerHTML = "";

    alignPcsToSvgViewBox('.zone-overlay');

    // Re-align PCs when the iframe gets layout dimensions (e.g. hidden panel becomes visible)
    if (!container._alignObs) {
        container._alignObs = true;
        const ro = new ResizeObserver(() => {
            const svg = document.querySelector('.zone-overlay');
            if (svg && svg.getBoundingClientRect().width > 0) {
                alignPcsToSvgViewBox('.zone-overlay');
            }
        });
        ro.observe(document.body);
    }

    const coordinateMode = detectCoordinateMode(pcs);

    pcs.forEach(pc => {
        const point = getMapPoint(pc, coordinateMode);

        if (!point) {
            console.warn('Skipping PC without coordinates', pc);
            return;
        }

        const el = document.createElement("div");
        el.classList.add("pc");

        const statusInfo = getStatusInfo(pc);
        const status = statusInfo.kind;

        el.classList.add(status);
        el.style.backgroundColor = statusInfo.color;
        el.style.color = getReadableTextColor(statusInfo.color);

        if (isVipComputer(pc)) {
            el.classList.add("vip");
        }

        const leftPercent = ((point.x - 30) / VIEWBOX_WIDTH) * 100;
        const topPercent = ((point.y - 108) / VIEWBOX_HEIGHT) * 100;

        el.style.left = leftPercent + "%";
        el.style.top = topPercent + "%";

        const label = (pc.num != null && pc.num !== '') ? pc.num : (pc.device_name || pc.id || '');
        el.innerText = label;
        el.title = `${pc.device_name || label} - ${statusInfo.name}`;
        if (pc.num != null && pc.num !== '') {
            el.dataset.num = String(pc.num);
        }
        const zone = getZoneForPC(pc.num);
        if (zone) el.dataset.zone = zone;
        el.onclick = () => openPC(pc);

        container.appendChild(el);
    });

    updateCounters(pcs);

    // Fixed positions — no post-processing to prevent shifting on resize
}

function alignPcsToSvgViewBox(svgSelector) {
    const svg = document.querySelector(svgSelector);
    const pcs = document.getElementById('pcs');
    const parent = pcs?.parentElement;
    if (!svg || !pcs || !parent) return;

    const svgRect = svg.getBoundingClientRect();

    // If the SVG has no layout dimensions (e.g. iframe in a hidden panel),
    // keep CSS defaults (inset:0;width:100%;height:100%) until a resize occurs.
    if (svgRect.width === 0 || svgRect.height === 0) {
        pcs.style.left = '';
        pcs.style.top = '';
        pcs.style.width = '';
        pcs.style.height = '';
        return;
    }

    const parentRect = parent.getBoundingClientRect();
    const svgAspect = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;
    const elAspect = svgRect.width / svgRect.height;

    let contentW, contentH, offsetX, offsetY;
    if (elAspect > svgAspect) {
        contentH = svgRect.height;
        contentW = contentH * svgAspect;
        offsetX = (svgRect.width - contentW) / 2;
        offsetY = 0;
    } else {
        contentW = svgRect.width;
        contentH = contentW / svgAspect;
        offsetX = 0;
        offsetY = (svgRect.height - contentH) / 2;
    }

    const pct = (v, total) => total > 0 ? (v / total) * 100 : 0;

    pcs.style.left = pct(svgRect.left + offsetX - parentRect.left, parentRect.width) + '%';
    pcs.style.top = pct(svgRect.top + offsetY - parentRect.top, parentRect.height) + '%';
    pcs.style.width = pct(contentW, parentRect.width) + '%';
    pcs.style.height = pct(contentH, parentRect.height) + '%';
}

function getReadableTextColor(hexColor) {
    const rgb = hexToRgb(hexColor);

    if (!rgb) {
        return "#ffffff";
    }

    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

    return brightness > 150 ? "#05060c" : "#ffffff";
}

function hexToRgb(hexColor) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);

    if (!match) {
        return null;
    }

    return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16)
    };
}

function detectCoordinateMode(pcs) {
    const coords = pcs
        .map(getRawCoordinates)
        .filter(Boolean);

    if (coords.length === 0) {
        return "viewBox";
    }

    const maxX = Math.max(...coords.map(coord => coord.x));
    const maxY = Math.max(...coords.map(coord => coord.y));

    if (maxX <= 50 && maxY <= 30) {
        return "grid";
    }

    return "viewBox";
}

function getMapPoint(pc, coordinateMode) {
    const coords = getRawCoordinates(pc);

    if (!coords) {
        return null;
    }

    if (coordinateMode === "grid") {
        return {
            x: coords.x * GRID_UNIT,
            y: coords.y * GRID_UNIT
        };
    }

    return coords;
}

function getRawCoordinates(pc) {
    const num = Number(pc.num);
    if (Number.isFinite(num) && PC_POSITIONS.has(num)) {
        const pair = PC_POSITIONS.get(num);
        return { x: pair[0], y: pair[1] };
    }

    const x = getNumberField(pc, [
        "map_x",
        "x",
        "pos_x",
        "position_x",
        "map_position_x"
    ]);

    const y = getNumberField(pc, [
        "map_y",
        "y",
        "pos_y",
        "position_y",
        "map_position_y"
    ]);

    if (x == null || y == null) {
        return null;
    }

    return { x, y };
}

function getNumberField(source, keys) {
    for (const key of keys) {
        const value = getNestedField(source, key);

        if (value == null || value === "") {
            continue;
        }

        const number = Number(value);

        if (Number.isFinite(number)) {
            return number;
        }
    }

    return null;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function updateCounters(pcs) {
    const freeEl = document.getElementById('free-count');
    const busyEl = document.getElementById('busy-count');
    if (!freeEl || !busyEl) return;

    let free = 0;
    let busy = 0;

    pcs.forEach(pc => {
        const status = getStatus(pc);
        if (status === 'free' || status === 'offline') {
            free++;
        } else if (status === 'busy' || status === 'reserved' || status === 'maintenance' || status === 'service') {
            busy++;
        }
    });

    freeEl.textContent = free;
    busyEl.textContent = busy;
}

function getZoneForPC(num) {
    if (num == null) return null;
    const n = Number(num);
    if (!Number.isFinite(n)) return null;
    if (n >= 1 && n <= 52) return '1-52';
    if (n >= 53 && n <= 84) return '53-84';
    if (n >= 85 && n <= 91) return 'vip-3';
    if (n >= 92 && n <= 98) return 'vip-1';
    if (n >= 99 && n <= 106) return 'vip-2';
    if (n >= 107 && n <= 116) return 'private';
    if (n >= 117 && n <= 136) return 'vip-3';
    if (n === 157) return 'solo';
    return null;
}

function bindZonesAndPCs() {
    const zones = document.querySelectorAll('.zone-overlay .zone[data-zone]');
    const pcs = document.querySelectorAll('#pcs .pc[data-zone]');

    zones.forEach(zoneEl => {
        zoneEl.addEventListener('mouseenter', () => {
            const zone = zoneEl.dataset.zone;
            pcs.forEach(pc => {
                if (pc.dataset.zone === zone) {
                    pc.classList.add('highlighted');
                } else {
                    pc.classList.add('dimmed');
                }
            });
        });
        zoneEl.addEventListener('mouseleave', () => {
            pcs.forEach(pc => {
                pc.classList.remove('highlighted', 'dimmed');
            });
        });
    });
}

// Compress PC positions along an axis ('x' or 'y').
// factor: 0..1 (0 collapses to center, 1 leaves unchanged).
window.compressPCsAxis = window.compressPCsAxis || function(axis = 'y', factor = 0.8) {
    if (!(axis === 'x' || axis === 'y')) axis = 'y';

    const container = document.getElementById('pcs');
    if (!container) return;

    const items = Array.from(container.querySelectorAll('.pc'))
        .map(el => ({ el,
            left: parseFloat(String(el.style.left).replace('%','')) || 0,
            top: parseFloat(String(el.style.top).replace('%','')) || 0
        }));

    if (items.length === 0) return;

    const values = items.map(i => axis === 'x' ? i.left : i.top);
    const center = values.reduce((s, v) => s + v, 0) / values.length;

    items.forEach(i => {
        if (axis === 'x') {
            const newVal = center + (i.left - center) * factor;
            i.el.style.left = clamp(newVal, 0, 100) + "%";
        } else {
            const newVal = center + (i.top - center) * factor;
            i.el.style.top = clamp(newVal, 0, 100) + "%";
        }
    });
};

function showMapMessage(text) {
    const message = document.getElementById("map-message");

    if (!message) {
        return;
    }

    message.textContent = text;
    message.hidden = false;
}

function hideMapMessage() {
    const message = document.getElementById("map-message");

    if (!message) {
        return;
    }

    message.hidden = true;
}

function closePopup() {
    const old = document.querySelector(".popup");

    if (old) {
        old.remove();
    }

    document.body.onclick = null;
}

function isBookableComputer(pc) {
    const status = getStatus(pc);

    return status !== "offline";
}

function openPC(pc) {

    closePopup();

    const popup =
        document.createElement("div");

    popup.className = "popup";

    const statusInfo = getStatusInfo(pc);
    const label = getPcLabel(pc);
    const button = isBookableComputer(pc)
        ? `<button type="button" class="booking-button">Забронировать</button>`
        : "";

    popup.innerHTML = `
        <h2>${escapeHtml(pc.device_name || label)}</h2>

        <p>
            Статус:
            ${escapeHtml(statusInfo.name)}
        </p>

        <p>
            IP:
            ${escapeHtml(pc.ip || "-")}
        </p>

        <p>
            MAC:
            ${escapeHtml(pc.mac || "-")}
        </p>

        ${button}
    `;

    popup.onclick = (e) => {
        e.stopPropagation();
    };

    document.body.appendChild(popup);

    const bookingButton = popup.querySelector(".booking-button");

    if (bookingButton) {
        bookingButton.onclick = (event) => {
            event.stopPropagation();
            openBookingForm(pc);
        };
    }

    document.body.onclick = () => {
        popup.remove();
    };
}

function openBookingForm(pc) {
    closePopup();

    const popup = document.createElement("div");
    const telegramUser = getTelegramUser();
    const defaultName = getTelegramDisplayName(telegramUser);
    const label = getPcLabel(pc);
    const title = isVipComputer(pc)
        ? `Бронь VIP ${escapeHtml(label)}`
        : `Бронь ${escapeHtml(label)}`;

    popup.className = "popup booking-popup";
    popup.innerHTML = `
        <h2>${title}</h2>

        <form id="booking-form" class="booking-form">
            <label>
                Имя
                <input
                    name="name"
                    type="text"
                    value="${escapeHtml(defaultName)}"
                    required
                >
            </label>

            <label>
                Время
                <input
                    name="time"
                    type="datetime-local"
                    value="${getDefaultBookingTime()}"
                    required
                >
            </label>

            <div class="popup-actions">
                <button type="submit">Отправить</button>
                <button type="button" class="secondary-button">Отмена</button>
            </div>

            <div class="form-message" aria-live="polite"></div>
        </form>
    `;

    popup.onclick = (event) => {
        event.stopPropagation();
    };

    document.body.appendChild(popup);

    const form = popup.querySelector("#booking-form");
    const cancelButton = popup.querySelector(".secondary-button");
    const formMessage = popup.querySelector(".form-message");

    cancelButton.onclick = closePopup;

    form.onsubmit = async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector("button[type='submit']");
        const formData = new FormData(form);

        submitButton.disabled = true;
        formMessage.textContent = "Отправляем заявку на кассу...";

        try {
            await createBooking(pc, {
                name: formData.get("name"),
                time: formData.get("time")
            });

            formMessage.textContent = "Заявка отправлена. Ответ придет в Telegram.";
            tg?.HapticFeedback?.notificationOccurred?.("success");

            setTimeout(closePopup, 1800);
        } catch (err) {
            submitButton.disabled = false;
            formMessage.textContent = err.message || "Не удалось отправить бронь.";
            tg?.HapticFeedback?.notificationOccurred?.("error");
        }
    };

    document.body.onclick = closePopup;
}

async function createBooking(pc, booking) {
    const telegramUser = getTelegramUser();
    const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            workstation_id: pc.id,
            computer_id: pc.id,
            computer_num: pc.num,
            device_name: pc.device_name,
            name: booking.name,
            time: booking.time,
            telegram_user_id: telegramUser?.id,
            telegram_username: telegramUser?.username,
            telegram_name: getTelegramDisplayName(telegramUser)
        })
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(json.error || `Ошибка ${response.status}`);
    }

    return json;
}

function getTelegramUser() {
    return tg?.initDataUnsafe?.user || null;
}

function getTelegramDisplayName(user) {
    if (!user) {
        return "";
    }

    return [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
}

function getPcLabel(pc) {
    return (pc.num != null && pc.num !== "")
        ? String(pc.num)
        : (pc.device_name || pc.id || "");
}

function getDefaultBookingTime() {
    const date = new Date(Date.now() + 15 * 60 * 1000);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return localDate.toISOString().slice(0, 16);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getReleaseDate(pc) {
    const dateKeys = [
        "end_time",
        "ends_at",
        "finish_time",
        "finished_at",
        "expires_at",
        "expired_at",
        "paid_to",
        "time_end",
        "session_end_time",
        "session_ends_at",
        "session_finish_time",
        "current_session.end_time",
        "current_session.ends_at",
        "current_session.expires_at"
    ];

    for (const key of dateKeys) {
        const date = parseApiDate(getNestedField(pc, key));

        if (date) {
            return date;
        }
    }

    const secondsLeft = getNumberField(pc, [
        "seconds_left",
        "remaining_seconds",
        "session_seconds_left",
        "current_session.seconds_left",
        "current_session.remaining_seconds"
    ]);

    if (secondsLeft != null && secondsLeft > 0) {
        return new Date(Date.now() + secondsLeft * 1000);
    }

    const minutesLeft = getNumberField(pc, [
        "minutes_left",
        "remaining_minutes",
        "time_left",
        "session_minutes_left",
        "current_session.minutes_left",
        "current_session.remaining_minutes"
    ]);

    if (minutesLeft != null && minutesLeft > 0) {
        return new Date(Date.now() + minutesLeft * 60 * 1000);
    }

    const spentMinutes = getNumberField(pc, ["spent_minutes"]);
    const totalMinutes = getNumberField(pc, ["total_minutes"]);

    if (spentMinutes != null && totalMinutes != null && totalMinutes > spentMinutes) {
        return new Date(Date.now() + (totalMinutes - spentMinutes) * 60 * 1000);
    }

    return null;
}

function getNestedField(source, path) {
    return path
        .split(".")
        .reduce((value, key) => value?.[key], source);
}

function parseApiDate(value) {
    if (value == null || value === "") {
        return null;
    }

    if (typeof value === "number" || /^\d+$/.test(String(value))) {
        const timestamp = Number(value);
        const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const normalizedValue = String(value).includes("T")
        ? String(value)
        : String(value).replace(" ", "T");
    const date = new Date(normalizedValue);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatReleaseTime(date) {
    if (!date) {
        return "Время не указано";
    }

    return `Освободится в ${date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
    })}`;
}

function formatSessionProgress(userInfo) {
    const spentMinutes = getNumberField(userInfo, ["spent_minutes"]);
    const totalMinutes = getNumberField(userInfo, ["total_minutes"]);

    if (spentMinutes != null && totalMinutes != null) {
        return `${spentMinutes} из ${totalMinutes} мин`;
    }

    if (spentMinutes != null) {
        return `Играет ${spentMinutes} мин`;
    }

    return "";
}

async function fetchPCUserInfo(pc, _token) {
    if (!pc?.id) {
        return null;
    }

    try {
        return await fetchJson(`${BACKEND_URL}/api/user-info?pc_id=${pc.id}&_primegamehub=1`);
    } catch (err) {
        console.warn(`Не удалось получить user_info для ПК ${getPcLabel(pc)}`, err);
        return null;
    }
}

async function getSoonPCs(pcs) {
    const busyPCs = pcs.filter(pc =>
        getStatus(pc) === "busy"
    );

    if (busyPCs.length === 0) {
        return [];
    }

    const token = await getAuthToken();
    const pcsWithInfo = await Promise.all(
        busyPCs.map(async pc => {
            const userInfo = await fetchPCUserInfo(pc, token);
            const releaseDate = getReleaseDate({
                ...pc,
                ...userInfo,
                current_session: userInfo
            });

            return {
                pc,
                userInfo,
                releaseDate
            };
        })
    );

    return pcsWithInfo
        .filter(item => item.releaseDate)
        .sort((a, b) => a.releaseDate - b.releaseDate)
        .slice(0, 10);
}

async function renderSoonList(pcs) {

    const container =
        document.getElementById(
            "soon-list"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    container.innerHTML = `
        <div class="soon-item">
            Проверяем время освобождения...
        </div>
    `;

    const busyPCs = await getSoonPCs(pcs);

    if (busyPCs.length === 0) {
        container.innerHTML = `
            <div class="soon-item">
                Нет компьютеров, которые освободятся скоро.
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    busyPCs.forEach(({ pc, userInfo, releaseDate }) => {

        const el =
            document.createElement("div");

        el.className = "soon-item";
        const progress = formatSessionProgress(userInfo);

        el.innerHTML = `
            <div>
                ${escapeHtml(pc.device_name || getPcLabel(pc))}
            </div>

            <div class="soon-time">
                ${escapeHtml(formatReleaseTime(releaseDate))}
            </div>

            ${progress
                ? `<div class="soon-progress">${escapeHtml(progress)}</div>`
                : ""}
        `;

        container.appendChild(el);
    });
}

function initSoonPanel() {
    const toggle = document.getElementById("soon-toggle");
    const panel = document.getElementById("soon-panel");
    const closeBtn = document.getElementById("soon-close");

    if (!toggle || !panel || !closeBtn) {
        return;
    }

    toggle.onclick = () => {
        panel.classList.toggle("open");
    };

    closeBtn.onclick = () => {
        panel.classList.remove("open");
    };

    panel.onclick = (event) => {
        if (event.target === panel) {
            panel.classList.remove("open");
        }
    };
}

initSoonPanel();
clearLegacyTokenCaches();

window.addEventListener('resize', debounce(() => {
    renderPCs(currentPCs);
}, 100));

(async () => {
    await loadPositions();
    loadPCs();
    setInterval(loadPCs, 60000);
})();