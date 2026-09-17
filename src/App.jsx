import { useState } from "react";

export default function App() {
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);

  function addEntry(event) {
    event.preventDefault();
    const value = entry.trim();
    if (!value) return;
    setEntries((current) => [
      { id: crypto.randomUUID(), text: value, createdAt: new Date().toLocaleString("pt-BR") },
      ...current,
    ]);
    setEntry("");
  }

  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">Diário de Embarque</p>
        <h1>Registre sua jornada</h1>
        <p className="muted">Frontend React/Vite pronto para publicação no Cloudflare Pages.</p>
        <form onSubmit={addEntry} className="entry-form">
          <label htmlFor="entry">Novo registro</label>
          <textarea id="entry" value={entry} onChange={(event) => setEntry(event.target.value)} placeholder="Escreva uma anotação..." rows={4} />
          <button type="submit">Adicionar registro</button>
        </form>
        <div className="entries" aria-live="polite">
          {entries.length === 0 ? <p className="muted">Nenhum registro ainda.</p> : entries.map((item) => (
            <article className="entry" key={item.id}>
              <time>{item.createdAt}</time>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
