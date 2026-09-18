const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "content-type, authorization");
  return new Response(response.body, { status: response.status, headers });
}

function id() {
  return crypto.randomUUID();
}

async function api(request, env, ctx) {
  if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

  if (!env.DB) {
    return cors(json({ error: "D1 não configurado. Crie o banco e configure o binding DB no wrangler.jsonc." }, 503));
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");

  if (path === "/api/entries" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, text, created_at AS createdAt FROM entries ORDER BY created_at DESC LIMIT 200"
    ).all();
    return cors(json(results));
  }

  if (path === "/api/entries" && request.method === "POST") {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 10000) return cors(json({ error: "O texto deve ter entre 1 e 10.000 caracteres." }, 400));

    const createdAt = new Date().toISOString();
    const entry = { id: id(), text, createdAt };
    await env.DB.prepare("INSERT INTO entries (id, text, created_at) VALUES (?, ?, ?)")
      .bind(entry.id, entry.text, entry.createdAt)
      .run();
    return cors(json(entry, 201));
  }

  const match = path.match(/^\/api\/entries\/([^/]+)$/);
  if (match && request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM entries WHERE id = ?").bind(match[1]).run();
    return cors(new Response(null, { status: 204 }));
  }

  if (path === "/api/upload" && request.method === "POST") {
    if (!env.UPLOADS) return cors(json({ error: "R2 não configurado. Configure o binding UPLOADS no wrangler.jsonc." }, 503));
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return cors(json({ error: "Envie um arquivo no campo file." }, 400));
    if (file.size > 10 * 1024 * 1024) return cors(json({ error: "O arquivo excede o limite de 10 MB." }, 413));
    const key = `${new Date().toISOString().slice(0, 10)}/${id()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    return cors(json({ key }, 201));
  }

  return cors(json({ error: "Rota não encontrada" }, 404));
}

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      try {
        return await api(request, env, ctx);
      } catch (error) {
        console.error(error);
        return cors(json({ error: "Erro interno do servidor" }, 500));
      }
    }
    return env.ASSETS.fetch(request);
  },
};
