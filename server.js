const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");

const ROOT = path.resolve(__dirname);
const DATA = path.join(ROOT, "data");
const CONTENT = path.join(ROOT, "content", "site.json");
const ADMIN_FILE = path.join(DATA, "admin.json");
const PORT = Number(process.env.PORT) || 4321;
const MAX_JSON = 1_500_000;
const MAX_IMAGE = 8_000_000;

const sessions = new Map();
const attempts = new Map();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function ensureAdmin() {
  fs.mkdirSync(DATA, { recursive: true });
  if (fs.existsSync(ADMIN_FILE)) return null;
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
  const record = {
    username: "admin",
    hash: hashPassword(password)
  };
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(record, null, 2));
  return password;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function checkPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function readAdmin() {
  return JSON.parse(fs.readFileSync(ADMIN_FILE, "utf8"));
}

function cookieToken(req) {
  const raw = req.headers.cookie || "";
  const match = raw.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function isAuthed(req) {
  const token = cookieToken(req);
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function send(res, status, body, headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(status, { "content-length": payload.length, ...headers });
  res.end(payload);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), { "content-type": "application/json; charset=utf-8" });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("For stor forespørgsel"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function safeFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  if (rel.startsWith("data" + path.sep) || rel === "data" || rel.startsWith(".git")) return null;
  const full = path.resolve(ROOT, rel);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (full !== ROOT && !full.startsWith(rootWithSep)) return null;
  return full;
}

function imagePathOk(src) {
  return typeof src === "string" && /^images\/[a-zA-Z0-9._-]+$/.test(src);
}

function pair(value, fallback = "") {
  const da = String(value?.da ?? fallback).trim().slice(0, 2000);
  const en = String(value?.en ?? da).trim().slice(0, 2000);
  return { da, en };
}

function sanitizeContent(input) {
  if (!input || typeof input !== "object") throw Object.assign(new Error("Ugyldigt indhold"), { status: 400 });
  const email = String(input.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("E-mailadressen er ikke gyldig"), { status: 400 });
  }
  const pexels = String(input.pexels || "").trim();
  if (pexels && !/^https:\/\/[^\s]+$/.test(pexels)) {
    throw Object.assign(new Error("Pexels-linket skal starte med https://"), { status: 400 });
  }
  const slot = (value) => {
    if (!imagePathOk(value?.src)) throw Object.assign(new Error("Et billede mangler en gyldig fil"), { status: 400 });
    return {
      src: value.src,
      w: Number(value.w) || 0,
      h: Number(value.h) || 0,
      alt: pair(value.alt)
    };
  };
  const text = {};
  const source = input.text && typeof input.text === "object" ? input.text : {};
  for (const key of Object.keys(source).slice(0, 80)) {
    if (!/^[a-z0-9.]+$/i.test(key)) continue;
    text[key] = pair(source[key]);
  }
  if (!Array.isArray(input.photos) || input.photos.length < 1 || input.photos.length > 40) {
    throw Object.assign(new Error("Galleriet skal have mellem 1 og 40 billeder"), { status: 400 });
  }
  const cats = new Set(["portraet", "familie", "natur", "nuuk"]);
  const photos = input.photos.map((photo) => {
    if (!imagePathOk(photo?.src)) throw Object.assign(new Error("Et galleribillede har en ugyldig fil"), { status: 400 });
    return {
      src: photo.src,
      w: Number(photo.w) || 0,
      h: Number(photo.h) || 0,
      cat: cats.has(photo.cat) ? photo.cat : "portraet",
      place: String(photo.place || "Nuuk").trim().slice(0, 80),
      alt: pair(photo.alt),
      caption: pair(photo.caption)
    };
  });
  return {
    email,
    pexels,
    hero: slot(input.hero),
    aboutImage: slot(input.aboutImage),
    breakImage: slot(input.breakImage),
    text,
    photos
  };
}

function detectImage(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") return "png";
  if (buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "";
}

function clientIp(req) {
  return req.socket.remoteAddress || "local";
}

function tooManyAttempts(ip) {
  const entry = attempts.get(ip);
  return entry && entry.count >= 8 && entry.reset > Date.now();
}

function noteAttempt(ip, ok) {
  if (ok) {
    attempts.delete(ip);
    return;
  }
  const entry = attempts.get(ip) || { count: 0, reset: Date.now() + 15 * 60 * 1000 };
  entry.count += 1;
  if (entry.reset < Date.now()) {
    entry.count = 1;
    entry.reset = Date.now() + 15 * 60 * 1000;
  }
  attempts.set(ip, entry);
}

function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd: ROOT,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || "mathiassrensen66-code",
          GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || "245572310+mathiassrensen66-code@users.noreply.github.com",
          GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || process.env.GIT_AUTHOR_NAME || "mathiassrensen66-code",
          GIT_COMMITTER_EMAIL:
            process.env.GIT_COMMITTER_EMAIL ||
            process.env.GIT_AUTHOR_EMAIL ||
            "245572310+mathiassrensen66-code@users.noreply.github.com"
        }
      },
      (error, stdout, stderr) => {
        if (error) reject(new Error((stderr || stdout || error.message).trim()));
        else resolve((stdout || "").trim());
      }
    );
  });
}

async function publish() {
  await runGit(["add", "--", "content/site.json", "images"]);
  try {
    await runGit(["commit", "-m", "Opdater tekster og billeder fra admin"]);
  } catch (error) {
    if (!/nothing to commit|intet at committe/i.test(error.message)) throw error;
    return { published: false, message: "Der var ikke noget nyt at udgive." };
  }
  await runGit(["push", "pages", "HEAD:main"]);
  return { published: true, message: "Siden er udgivet. Den offentlige adresse kan bruge et minut om at vise ændringen." };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      if (req.method === "POST" && url.pathname === "/api/login") {
        const ip = clientIp(req);
        if (tooManyAttempts(ip)) return sendJson(res, 429, { error: "For mange forsøg. Vent et kvarter." });
        const body = JSON.parse((await readBody(req, 20_000)).toString("utf8") || "{}");
        const admin = readAdmin();
        const ok = String(body.username || "") === admin.username && checkPassword(String(body.password || ""), admin.hash);
        noteAttempt(ip, ok);
        if (!ok) return sendJson(res, 401, { error: "Forkert brugernavn eller adgangskode." });
        const token = crypto.randomBytes(32).toString("hex");
        sessions.set(token, { expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        return send(res, 200, JSON.stringify({ ok: true }), {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`
        });
      }

      if (req.method === "POST" && url.pathname === "/api/logout") {
        sessions.delete(cookieToken(req));
        return send(res, 200, JSON.stringify({ ok: true }), {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
        });
      }

      if (req.method === "GET" && url.pathname === "/api/session") {
        return sendJson(res, 200, { ok: isAuthed(req) });
      }

      if (!isAuthed(req)) return sendJson(res, 401, { error: "Log ind igen." });

      if (req.method === "GET" && url.pathname === "/api/content") {
        return send(res, 200, fs.readFileSync(CONTENT), { "content-type": "application/json; charset=utf-8" });
      }

      if (req.method === "PUT" && url.pathname === "/api/content") {
        const raw = await readBody(req, MAX_JSON);
        const clean = sanitizeContent(JSON.parse(raw.toString("utf8")));
        fs.writeFileSync(CONTENT, JSON.stringify(clean, null, 2) + "\n");
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "POST" && url.pathname === "/api/upload") {
        const body = JSON.parse((await readBody(req, MAX_IMAGE * 1.4)).toString("utf8"));
        const buffer = Buffer.from(String(body.data || ""), "base64");
        if (!buffer.length || buffer.length > MAX_IMAGE) {
          return sendJson(res, 400, { error: "Billedet er tomt eller større end 8 MB." });
        }
        const ext = detectImage(buffer);
        if (!ext) return sendJson(res, 400, { error: "Brug et JPG-, PNG- eller WebP-billede." });
        const name = `upload-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
        fs.writeFileSync(path.join(ROOT, "images", name), buffer);
        return sendJson(res, 200, { src: `images/${name}` });
      }

      if (req.method === "POST" && url.pathname === "/api/publish") {
        const result = await publish();
        return sendJson(res, 200, result);
      }

      if (req.method === "POST" && url.pathname === "/api/password") {
        const body = JSON.parse((await readBody(req, 20_000)).toString("utf8") || "{}");
        const admin = readAdmin();
        if (!checkPassword(String(body.current || ""), admin.hash)) {
          return sendJson(res, 401, { error: "Den nuværende adgangskode passer ikke." });
        }
        const next = String(body.next || "");
        if (next.length < 8) return sendJson(res, 400, { error: "Den nye adgangskode skal være mindst 8 tegn." });
        admin.hash = hashPassword(next);
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 404, { error: "Ukendt handling" });
    }

    let pathname = url.pathname;
    if (pathname === "/admin") {
      res.writeHead(302, { Location: "/admin/" });
      res.end();
      return;
    }
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = safeFile(pathname);
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return send(res, 404, "Siden blev ikke fundet");
    }
    send(res, 200, fs.readFileSync(file), { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
  } catch (error) {
    const status = error.status || 500;
    sendJson(res, status, { error: status === 500 ? "Noget gik galt på serveren." : error.message });
  }
});

const createdPassword = ensureAdmin();
server.listen(PORT, () => {
  console.log(`Siden kører på http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  if (createdPassword) {
    console.log("Admin-bruger oprettet. Brugernavn: admin");
    console.log(`Adgangskode: ${createdPassword}`);
  }
});
