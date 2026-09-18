import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";
const request = (path, options) => fetch(`${API}${path}`, { credentials: "include", ...options });

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    request("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        setUser(data.user);
        return data.user;
      })
      .then((currentUser) => currentUser && loadEntries())
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadEntries() {
    const response = await request("/api/entries");
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Não foi possível carregar os registros.");
    setEntries(data);
  }

  async function authenticate(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await request(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Não foi possível autenticar.");
      setUser(data.user);
      setPassword("");
      await loadEntries();
    } catch (reason) {
      setError(reason.message);
    }
  }

  async function logout() {
    await request("/api/auth/logout", { method: "POST" });
    setUser(null);
    setEntries([]);
  }

  async function addEntry(event) {
    event.preventDefault();
    const text = entry.trim();
    if (!text || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await request("/api/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const created = await response.json().catch(() => null);
      if (!response.ok) throw new Error(created?.error || "Não foi possível salvar o registro.");
      setEntries((current) => [created, ...current]);
      setEntry("");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entryId) {
    setError("");
    try {
      const response = await request(`/api/entries/${entryId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível excluir o registro.");
      setEntries((current) => current.filter((item) => item.id !== entryId));
    } catch (reason) {
      setError(reason.message);
    }
  }

  if (loading) {
    return <main className="app-shell"><section className="card"><p className="muted">Carregando...</p></section></main>;
  }

  if (!user) {
    return (
      <main className="app-shell"><section className="card">
        <p className="eyebrow">Diário de Embarque</p>
        <h1>{authMode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h1>
        <p className="muted">Seus registros ficam privados e associados ao seu e-mail.</p>
        <form onSubmit={authenticate} className="entry-form">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete={authMode === "login" ? "current-password" : "new-password"} />
          <button type="submit">{authMode === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button className="link-button" type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setError(""); }}>
          {authMode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
        </button>
        {error && <p role="alert" className="error">{error}</p>}
      </section></main>
    );
  }

  return (
    <main className="app-shell"><section className="card">
      <div className="account-bar"><span>{user.email}</span><button className="link-button" type="button" onClick={logout}>Sair</button></div>
      <p className="eyebrow">Diário de Embarque</p>
      <h1>Registre sua jornada</h1>
      <p className="muted">Seus registros são privados e persistidos no Cloudflare D1.</p>
      <form onSubmit={addEntry} className="entry-form">
        <label htmlFor="entry">Novo registro</label>
        <textarea id="entry" value={entry} onChange={(event) => setEntry(event.target.value)} placeholder="Escreva uma anotação..." rows={4} maxLength={10000} />
        <button type="submit" disabled={saving}>{saving ? "Salvando..." : "Adicionar registro"}</button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="entries" aria-live="polite">
        {entries.length === 0 ? <p className="muted">Nenhum registro ainda.</p> : entries.map((item) => (
          <article className="entry" key={item.id}>
            <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("pt-BR")}</time>
            <p>{item.text}</p>
            <button className="delete-button" type="button" onClick={() => removeEntry(item.id)}>Excluir</button>
          </article>
        ))}
      </div>
    </section></main>
  );
}
