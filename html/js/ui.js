/**
 * qb-ui NUI (new) — renders interaction pill from existing qb-ui events.
 * Keeps compatibility with:
 * - NUI message actions: DRAW_TEXT / CHANGE_TEXT / HIDE_TEXT / KEY_PRESSED
 * - NUI callback: getDrawTextConfig
 *
 * Credits: nerd developer
 * websiet: nertd-developer.com
 */

const fetchNui = async (evName, data) => {
    const resourceName =
        typeof GetParentResourceName === "function" ? GetParentResourceName() : "qb-ui";
    const rawResp = await fetch(`https://${resourceName}/${evName}`, {
        body: JSON.stringify(data || {}),
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        method: "POST",
    });
    return await rawResp.json();
};

const VALID_PLACEMENTS = new Set([
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "center",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
]);

const DEFAULT_CFG = {
    placement: "bottom-center",
    useExportPosition: false,
    offsetX: 0,
    offsetY: 0,
    background: "rgba(14, 16, 24, 0.92)",
    backgroundActive: "rgba(212, 5, 74, 0.94)",
    textColor: "#f0f2f8",
    borderColor: "rgba(255, 255, 255, 0.14)",
    accentColor: "#d4054a",
    fontSize: "16px",
    borderRadius: "22px",
    maxWidth: "min(520px, 92vw)",
    shadow: "0 18px 60px rgba(0, 0, 0, 0.62)",
    animationMs: 320,
    insetVh: 3.0,
    insetVw: 2.5,
    bottomVh: 8.0,
};

let drawTextCfg = { ...DEFAULT_CFG };

function normalizePlacement(raw) {
    const p = String(raw || "").toLowerCase().trim();
    if (VALID_PLACEMENTS.has(p)) return p;
    if (p === "left") return "middle-left";
    if (p === "right") return "middle-right";
    if (p === "top") return "top-center";
    if (p === "bottom") return "bottom-center";
    return drawTextCfg.placement || DEFAULT_CFG.placement;
}

function applyDrawTextConfig(cfg) {
    drawTextCfg = { ...DEFAULT_CFG, ...(cfg || {}) };
    const c = drawTextCfg;
    const root = document.documentElement;
    const n = (v, fallback) => (typeof v === "number" && !Number.isNaN(v) ? v : fallback);

    root.style.setProperty("--dt-bg", String(c.background ?? DEFAULT_CFG.background));
    root.style.setProperty("--dt-bg-active", String(c.backgroundActive ?? DEFAULT_CFG.backgroundActive));
    root.style.setProperty("--dt-text", String(c.textColor ?? DEFAULT_CFG.textColor));
    root.style.setProperty("--dt-border", String(c.borderColor ?? DEFAULT_CFG.borderColor));
    root.style.setProperty("--dt-accent", String(c.accentColor ?? DEFAULT_CFG.accentColor));
    root.style.setProperty("--dt-font-size", String(c.fontSize ?? DEFAULT_CFG.fontSize));
    root.style.setProperty("--dt-radius", String(c.borderRadius ?? DEFAULT_CFG.borderRadius));
    root.style.setProperty("--dt-max-w", String(c.maxWidth ?? DEFAULT_CFG.maxWidth));
    root.style.setProperty("--dt-shadow", String(c.shadow ?? DEFAULT_CFG.shadow));

    const anim = n(c.animationMs, DEFAULT_CFG.animationMs);
    root.style.setProperty("--dt-anim", `${anim}ms`);
    root.style.setProperty("--dt-inset-vh", `${n(c.insetVh, DEFAULT_CFG.insetVh)}vh`);
    root.style.setProperty("--dt-inset-vw", `${n(c.insetVw, DEFAULT_CFG.insetVw)}vw`);
    root.style.setProperty("--dt-bottom-vh", `${n(c.bottomVh, DEFAULT_CFG.bottomVh)}vh`);
    root.style.setProperty("--dt-off-x", `${n(c.offsetX, 0)}vw`);
    root.style.setProperty("--dt-off-y", `${n(c.offsetY, 0)}vh`);
}

function stripTagsKeepBreaks(s) {
    const raw = String(s ?? "");
    const withBreaks = raw
        .replace(/<\s*br\s*\/?\s*>/gi, "\n")
        .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n");
    return withBreaks.replace(/<[^>]*>/g, "");
}

function normalizeWhitespace(s) {
    return String(s ?? "")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractKeyPrompt(plain) {
    // Supports common qb-style strings:
    // "[E] Garage", "E - Garage", "Press E - Garage"
    // Also supports other keys like [G], [H], [F1], 1 - ..., etc.
    const p = normalizeWhitespace(plain);
    if (!p) return null;

    // Bracket style anywhere (common): "[E]" / "[F1]" / "[1]"
    const bracket = p.match(/\[\s*([A-Za-z0-9]{1,3})\s*\]/);
    if (bracket?.[1]) return bracket[1].toUpperCase();

    // "Press X" (X can be E, G, F1, 1...)
    const press = p.match(/^Press\s+([A-Za-z0-9]{1,3})\b/i);
    if (press?.[1]) return press[1].toUpperCase();

    // Leading "X - ..." / "X: ..." / "F1 - ..."
    const leading = p.match(/^([A-Za-z0-9]{1,3})\s*[-–—:]\s*\S/i);
    if (leading?.[1]) return leading[1].toUpperCase();

    return null;
}

function stripKeyPrefixPlain(plain, key) {
    let s = String(plain ?? "");
    const k = String(key ?? "").trim();
    if (k) {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // remove first bracketed instance of the key
        s = s.replace(new RegExp(`\\[\\s*${escaped}\\s*\\]\\s*`, "i"), "");
        // remove leading "KEY - " / "KEY: "
        s = s.replace(new RegExp(`^(\\s*)${escaped}\\s*[-–—:]\\s*`, "im"), "$1");
        // remove leading "Press KEY" (optionally followed by -/:)
        s = s.replace(new RegExp(`^(\\s*)Press\\s+${escaped}\\b\\s*([-–—:]\\s*)?`, "im"), "$1");
    }
    s = s.replace(/^[\s\-–—:]+/, "").trim();
    return s;
}

function splitTitleSubtitle(plainText) {
    const raw = String(plainText ?? "");
    const lines = raw
        .split(/\r?\n/)
        .map((l) => normalizeWhitespace(l))
        .filter(Boolean);
    if (lines.length >= 2) return { title: lines[0], subtitle: lines.slice(1).join(" ") };

    const p = normalizeWhitespace(raw);
    if (!p) return { title: "", subtitle: "" };
    const m = p.match(/^(.{2,48}?)\s*[-–—:]\s*(.{2,80})$/);
    if (m) return { title: m[1].trim(), subtitle: m[2].trim() };
    return { title: p, subtitle: "" };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setCardContent(rawHtml) {
    const plain = stripTagsKeepBreaks(rawHtml);
    const key = extractKeyPrompt(plain);
    const hasKey = Boolean(key);

    const keyEl = document.getElementById("qb-key");
    const iconEl = document.getElementById("qb-icon");
    const titleEl = document.getElementById("qb-title");
    const subtitleEl = document.getElementById("qb-subtitle");

    if (!keyEl || !titleEl || !subtitleEl || !iconEl) return;

    const cleaned = stripKeyPrefixPlain(plain, key);
    const { title, subtitle } = splitTitleSubtitle(cleaned);

    keyEl.textContent = hasKey ? key : "i";
    iconEl.classList.toggle("is-info", !hasKey);

    titleEl.textContent = title || "";
    subtitleEl.textContent = subtitle || "";
    subtitleEl.style.display = subtitle ? "block" : "none";
}

async function showCard(textData) {
    const container = document.getElementById("drawtext-container");
    const card = document.getElementById("card");
    if (!container || !card) return;

    card.classList.remove("is-visible", "is-hiding", "is-pressed");

    const pos = normalizePlacement(textData?.position);
    container.dataset.placement = pos;
    setCardContent(textData?.text);

    container.classList.add("is-visible");
    await sleep(16);
    card.classList.add("is-visible");
}

async function changeCard(textData) {
    const container = document.getElementById("drawtext-container");
    const card = document.getElementById("card");
    if (!container || !card) return;

    card.classList.remove("is-visible");
    card.classList.add("is-pressed", "is-hiding");

    await sleep(Math.min(drawTextCfg.animationMs ?? 320, 400));

    card.classList.remove("is-pressed", "is-hiding");

    const pos = normalizePlacement(textData?.position);
    container.dataset.placement = pos;
    setCardContent(textData?.text);

    await sleep(16);
    card.classList.add("is-visible");
}

function hideCard() {
    const container = document.getElementById("drawtext-container");
    const card = document.getElementById("card");
    if (!container || !card) return;

    card.classList.remove("is-visible");
    card.classList.add("is-hiding");

    const ms = Math.min(drawTextCfg.animationMs ?? 320, 500);
    setTimeout(() => {
        card.classList.remove("is-hiding", "is-pressed");
        container.classList.remove("is-visible");
        delete container.dataset.placement;
    }, ms + 40);
}

function keyPressed() {
    const card = document.getElementById("card");
    if (card) card.classList.add("is-pressed");
}

window.addEventListener("message", (event) => {
    const data = event.data;
    const action = data.action;
    const textData = data.data;
    switch (action) {
        case "DRAW_TEXT":
            return showCard(textData);
        case "CHANGE_TEXT":
            return changeCard(textData);
        case "HIDE_TEXT":
            return hideCard();
        case "KEY_PRESSED":
            return keyPressed();
        default:
            return;
    }
});

window.addEventListener("load", async () => {
    try {
        const cfg = await fetchNui("getDrawTextConfig", {});
        applyDrawTextConfig(cfg);
    } catch (_) {
        applyDrawTextConfig({});
    }
});

