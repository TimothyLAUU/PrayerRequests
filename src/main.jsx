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
      setNotice(demoMode ? 'Saved to this browser’s demo wall.' : 'Your prayer is on the wall. Thank you for sharing.');
    } catch {
      setError(demoMode ? 'Your browser couldn’t save this demo request. Please allow local storage and try again.' : 'We couldn’t save your request. Your text is still here; please try again.');
    } finally { busy.current = false; setSaving(false); }
  }

  return <>
    <header className="site-header"><a className="brand" href="#"><span className="brand-icon" aria-hidden="true">✦</span> MCAC <span className="brand-divider">/</span><span className="brand-label">Prayer wall</span></a><a className="header-link" href="#prayer-form">Share a prayer ↗</a></header>
    <main>
      <section className="intro"><div className="eyebrow">A LITTLE SPACE FOR FAITH & COMMUNITY</div><h1>Carried in prayer.<br /><em>Together.</em></h1><p>Some things are too heavy to carry alone.<br />Share what’s on your heart, and pray for someone else.</p><div className="verse">“Pray for one another.” <span>James 5:16</span></div></section>
      {demoMode && <div className="demo-note"><span aria-hidden="true">✧</span><p><strong>You’re viewing the demo.</strong> Requests stay in this browser. Connect Supabase to share one wall with everyone.</p></div>}
      <div className="wall-layout">
        <aside><form id="prayer-form" onSubmit={submit}><span className="form-icon" aria-hidden="true">♡</span><h2>What’s on your heart?</h2><p>Big or small, your prayer matters.</p><label htmlFor="message">Your prayer request</label><textarea id="message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Please pray for…" maxLength={1000} required rows={6} disabled={saving} /><div className="field-footer"><span>No name needed</span><span>{message.length}/1000</span></div><p className="privacy-note">Your request will be public. Please leave out personal or sensitive details about yourself or others.</p><button className="submit" disabled={saving || loading || !message.trim() || !!configurationError}>{saving ? 'Sharing…' : 'Share my prayer'} <span aria-hidden="true">↗</span></button><p className="success" role="status">{notice}</p></form><p className="aside-note">A quiet moment.<br />A little hope. A shared prayer.</p></aside>
        <section className="wall" aria-labelledby="wall-title"><div className="wall-heading"><div><div className="eyebrow">HOLDING ONE ANOTHER IN PRAYER</div><h2 id="wall-title">Our prayer wall <span className="count">{requests.length}</span></h2></div>{!demoMode && <button className="refresh" onClick={refresh} disabled={loading || saving || !supabase}>{loading ? 'Loading…' : '↻ Refresh'}</button>}</div>
          {error && <div className="error" role="alert">{error}</div>}
          {loading && <p role="status">Gathering our prayers…</p>}
          {!loading && !error && requests.length === 0 && <div className="empty"><span aria-hidden="true">♡</span><h3>A little hope starts here.</h3><p>Be the first to share a prayer with our community.</p></div>}
          <div className="cards">{requests.map((request, index) => <article className={`card tone-${index % 4}`} key={request.id}><div className="card-top"><span>{request.example ? 'EXAMPLE PRAYER' : 'A PRAYER FROM OUR COMMUNITY'}</span><span className="card-star" aria-hidden="true">✧</span></div><p>{request.message}</p><footer><span>Anonymous</span><time dateTime={request.created_at}>{new Date(request.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></footer></article>)}</div>
          <p className="wall-note">Pause. Read a prayer. Hold someone in your heart.</p>
        </section>
      </div>
    </main><footer className="site-footer"><span>MCAC · A community in prayer</span><span>Made for moments of hope ♡</span></footer>
  </>;
}
createRoot(document.getElementById('root')).render(<App />);
