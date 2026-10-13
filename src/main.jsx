import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { configurationError, demoMode, supabase } from './supabase';
import './styles.css';

const storageKey = 'mcac-prayer-wall-demo-v1';
function readDemo() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.every(item => item && typeof item.id === 'string' && typeof item.message === 'string' && typeof item.created_at === 'string')) return saved;
  } catch { /* Use examples when browser storage is unavailable. */ }
  return ['I want to grow closer to God and make more room for Him in my everyday life.', 'Please pray for peace and wisdom as I step into a new season.', 'For our community to keep showing up for one another with kindness and love.'].map((message, index) => ({ id: `example-${index}`, message, created_at: new Date().toISOString(), example: true }));
}

function App() {
  const [requests, setRequests] = useState(() => demoMode ? readDemo() : []);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!demoMode && !configurationError);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(configurationError);
  const [notice, setNotice] = useState('');
  const busy = useRef(false);

  async function refresh() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase.from('prayer_requests').select('id,message,created_at').order('created_at', { ascending: false }).limit(200);
      if (queryError) throw queryError;
      setRequests(data);
    } catch {
      setError('We couldn’t load the prayer wall. Try refreshing. For a new setup, check the Supabase table and policies.');
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function submit(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy.current || configurationError || loading) return;
    busy.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      let request;
      if (demoMode) {
        request = { id: crypto.randomUUID(), message: text, created_at: new Date().toISOString() };
        localStorage.setItem(storageKey, JSON.stringify([request, ...requests]));
      } else {
        const { data, error: insertError } = await supabase.from('prayer_requests').insert({ message: text }).select('id,message,created_at').single();
        if (insertError) throw insertError;
        request = data;
      }
      setRequests(current => [request, ...current.filter(item => item.id !== request.id)]);
      setMessage('');
      setNotice(demoMode ? 'Saved in this browser.' : 'Prayer added.');
    } catch {
      setError(demoMode ? 'Your browser couldn’t save this demo request. Please allow local storage and try again.' : 'We couldn’t save your request. Your text is still here; please try again.');
    } finally { busy.current = false; setSaving(false); }
  }

  return <>
    <header className="site-header"><a className="brand" href="#">Bethany Fellowship</a><a className="header-link" href="#prayer-form">Add a prayer</a></header>
    <main>
      {demoMode && <p className="demo-note">Demo — requests are saved only in this browser.</p>}
      <div className="wall-layout">
        <section className="wall" aria-labelledby="wall-title"><div className="wall-heading"><h1 id="wall-title">Prayer requests</h1>{!demoMode && <button className="refresh" onClick={refresh} disabled={loading || saving || !supabase}>{loading ? 'Loading…' : 'Refresh'}</button>}</div>
          {error && <div className="error" role="alert">{error}</div>}
          {loading && <p role="status">Loading requests…</p>}
          {!loading && !error && requests.length === 0 && <p className="empty">No prayer requests yet.</p>}
          <div className="cards">{requests.map((request, index) => <article className={`card tone-${index % 4}`} key={request.id}><p>{request.message}</p><footer><span>{request.example ? 'Example' : 'Anonymous'}</span><time dateTime={request.created_at}>{new Date(request.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></footer></article>)}</div>
        </section>
        <aside><form id="prayer-form" onSubmit={submit}><h2>Add a prayer</h2><label htmlFor="message">Your request</label><textarea id="message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Please pray for…" maxLength={1000} required rows={5} disabled={saving} /><div className="field-footer"><span>Anonymous</span><span>{message.length}/1000</span></div><p className="privacy-note">Publicly visible. Please leave out personal details.</p><button className="submit" disabled={saving || loading || !message.trim() || !!configurationError}>{saving ? 'Adding…' : 'Add prayer'}</button><p className="success" role="status">{notice}</p></form></aside>
      </div>
    </main>
  </>;
}
createRoot(document.getElementById('root')).render(<App />);
