const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};
const SESSION_COOKIE = "diario_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100000;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...headers } });
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("Origin");
  const allowedOrigin = env.ALLOWED_ORIGIN || new URL(request.url).origin;
  if (origin === allowedOrigin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.append("vary", "Origin");
  }
  headers.set("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  return new Response(response.body, { status: response.status, headers });
}

function id() { return crypto.randomUUID(); }
function bytesToBase64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
function base64ToBytes(value) { return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)); }

async function digest(value) {
  return bytesToBase64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256);
  return { hash: bytesToBase64(bits), salt: bytesToBase64(salt) };
}

function cookie(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function getSessionToken(request) {
  const cookies = request.headers.get("Cookie") || "";
  return cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) || null;
}

async function currentUser(request, env) {
  const token = getSessionToken(request);
  if (!token || !env.DB) return null;
  const sessionId = await digest(token);
  return env.DB.prepare(
    "SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.expires_at > ?"
  ).bind(sessionId, new Date().toISOString()).first();
}

async function createSession(userId, env) {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await digest(token), userId, expiresAt, new Date().toISOString()).run();
  return { token, expiresAt };
}

async function api(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!env.DB) return json({ error: "D1 não configurado. Configure o binding DB no wrangler.jsonc." }, 503);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  const contentType = request.headers.get("content-type") || "";
  const body = request.method === "POST" && contentType.includes("application/json")
    ? await request.json().catch(() => null)
    : null;

  if (path === "/api/auth/register" && request.method === "POST") {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) return json({ error: "Informe um e-mail válido e uma senha entre 8 e 128 caracteres." }, 400);
    if (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()) return json({ error: "Este e-mail já está cadastrado." }, 409);
    const passwordData = await hashPassword(password);
    const userId = id();
    await env.DB.prepare("INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)").bind(userId, email, passwordData.hash, passwordData.salt, new Date().toISOString()).run();
    const session = await createSession(userId, env);
    return json({ user: { id: userId, email }, expiresAt: session.expiresAt }, 201, { "set-cookie": cookie(session.token, SESSION_DAYS * 86400) });
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const user = await env.DB.prepare("SELECT id, email, password_hash, password_salt FROM users WHERE email = ?").bind(email).first();
    if (!user || (await hashPassword(password, base64ToBytes(user.password_salt))).hash !== user.password_hash) return json({ error: "E-mail ou senha inválidos." }, 401);
    const session = await createSession(user.id, env);
    return json({ user: { id: user.id, email: user.email }, expiresAt: session.expiresAt }, 200, { "set-cookie": cookie(session.token, SESSION_DAYS * 86400) });
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    const user = await currentUser(request, env);
    return user ? json({ user }) : json({ user: null }, 401);
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    const token = getSessionToken(request);
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await digest(token)).run();
    return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
  }

  const user = await currentUser(request, env);
  if (!user) return json({ error: "Faça login para continuar." }, 401);

  if (path === "/api/entries" && request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT id, text, created_at AS createdAt FROM entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 200").bind(user.id).all();
    return json(results);
  }

  if (path === "/api/entries" && request.method === "POST") {
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 10000) return json({ error: "O texto deve ter entre 1 e 10.000 caracteres." }, 400);
    const createdAt = new Date().toISOString();
    const entry = { id: id(), text, createdAt };
    await env.DB.prepare("INSERT INTO entries (id, user_id, text, created_at) VALUES (?, ?, ?, ?)").bind(entry.id, user.id, text, createdAt).run();
    return json(entry, 201);
  }

  const match = path.match(/^\/api\/entries\/([^/]+)$/);
  if (match && request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM entries WHERE id = ? AND user_id = ?").bind(match[1], user.id).run();
    return new Response(null, { status: 204 });
  }

  if (path === "/api/upload" && request.method === "POST") {
    if (!env.UPLOADS) return json({ error: "R2 não configurado." }, 503);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Envie um arquivo no campo file." }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ error: "O arquivo excede o limite de 10 MB." }, 413);
    const key = `${user.id}/${new Date().toISOString().slice(0, 10)}/${id()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    return json({ key }, 201);
  }

  return json({ error: "Rota não encontrada" }, 404);
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      try { return withCors(await api(request, env), request, env); }
      catch (error) { console.error(error); return withCors(json({ error: "Erro interno do servidor" }, 500), request, env); }
    }
    return env.ASSETS.fetch(request);
  },
};
