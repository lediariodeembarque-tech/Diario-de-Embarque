import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/entries`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || "Não foi possível carregar os registros.");
        return response.json();
      })
      .then(setEntries)
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  async function addEntry(event) {
    event.preventDefault();
    const text = entry.trim();
    if (!text || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const created = await response.json();
      if (!response.ok) throw new Error(created.error || "Não foi possível salvar o registro.");
      setEntries((current) => [created, ...current]);
      setEntry("");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entryId) {
    const response = await fetch(`${API}/api/entries/${entryId}`, { method: "DELETE" });
    if (response.ok) setEntries((current) => current.filter((item) => item.id !== entryId));
  }

  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">Diário de Embarque</p>
        <h1>Registre sua jornada</h1>
        <p className="muted">Seus registros são persistidos no Cloudflare D1.</p>
        <form onSubmit={addEntry} className="entry-form">
          <label htmlFor="entry">Novo registro</label>
          <textarea id="entry" value={entry} onChange={(event) => setEntry(event.target.value)} placeholder="Escreva uma anotação..." rows={4} maxLength={10000} />
          <button type="submit" disabled={saving}>{saving ? "Salvando..." : "Adicionar registro"}</button>
        </form>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="entries" aria-live="polite">
          {loading ? <p className="muted">Carregando...</p> : entries.length === 0 ? <p className="muted">Nenhum registro ainda.</p> : entries.map((item) => (
            <article className="entry" key={item.id}>
              <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("pt-BR")}</time>
              <p>{item.text}</p>
              <button className="delete-button" type="button" onClick={() => removeEntry(item.id}>Excluir</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
