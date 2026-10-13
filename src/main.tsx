import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { configurationError, demoMode, supabase } from './supabase';
import './styles.css';
import type { PrayerRequest } from './types';

const storageKey = 'mcac-prayer-wall-demo-v1';
const rulesKey = 'bethany-prayer-guidelines-v1';
const timestampFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
const fullTimestampFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'full', timeStyle: 'long',
});
function isPrayerRequest(value: unknown): value is PrayerRequest {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'message' in value && typeof value.message === 'string'
    && 'created_at' in value && typeof value.created_at === 'string'
    && (!('name' in value) || value.name === null || typeof value.name === 'string')
    && (!('example' in value) || typeof value.example === 'boolean');
}

function readDemo(): PrayerRequest[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (Array.isArray(saved) && saved.every(isPrayerRequest)) return saved;
  } catch { /* Use examples when browser storage is unavailable. */ }
  return ['I want to grow closer to God and make more room for Him in my everyday life.', 'Please pray for peace and wisdom as I step into a new season.', 'For our community to keep showing up for one another with kindness and love.'].map((message, index) => ({ id: `example-${index}`, message, created_at: new Date().toISOString(), example: true }));
}

function App() {
  const [requests, setRequests] = useState<PrayerRequest[]>(() => demoMode ? readDemo() : []);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(!demoMode && !configurationError);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(configurationError);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const prayerDialog = useRef<HTMLDialogElement>(null);
  const rulesDialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    let acknowledged = false;
    try { acknowledged = localStorage.getItem(rulesKey) === 'accepted'; } catch { /* Still show the rules. */ }
    if (!acknowledged) rulesDialog.current?.showModal();
  }, []);

  function acknowledgeRules() {
    try { localStorage.setItem(rulesKey, 'accepted'); } catch { /* The popup remains usable without storage. */ }
    rulesDialog.current?.close();
  }

  function openPrayer() {
    setNotice('');
    setFormError('');
    prayerDialog.current?.showModal();
  }

  async function refresh() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase.from('prayer_requests').select('id,message,name,created_at').order('created_at', { ascending: false }).limit(200);
      if (queryError) throw queryError;
      setRequests(data);
    } catch {
      setError('We couldn’t load the prayer wall. Try refreshing. For a new setup, check the Supabase table and policies.');
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    const displayName = name.trim() || null;
    if (!text || busy.current || configurationError || loading) return;
    busy.current = true;
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      let request: PrayerRequest;
      if (demoMode) {
        request = { id: crypto.randomUUID(), message: text, name: displayName, created_at: new Date().toISOString() };
        localStorage.setItem(storageKey, JSON.stringify([request, ...requests]));
      } else {
        if (!supabase) throw new Error('Supabase is not configured');
        const { data, error: insertError } = await supabase.from('prayer_requests').insert({ message: text, name: displayName }).select('id,message,name,created_at').single();
        if (insertError) throw insertError;
        request = data;
      }
      setRequests(current => [request, ...current.filter(item => item.id !== request.id)]);
      setMessage('');
      setName('');
      setNotice(demoMode ? 'Saved in this browser.' : 'Prayer added.');
      prayerDialog.current?.close();
    } catch {
      setFormError(demoMode ? 'Your browser couldn’t save this demo request. Please allow local storage and try again.' : 'We couldn’t save your request. Your text is still here; please try again.');
    } finally { busy.current = false; setSaving(false); }
  }

  return <>
    <header className="site-header"><a className="brand" href="#">Bethany Fellowship</a><nav aria-label="Prayer wall"><button className="header-link" onClick={() => rulesDialog.current?.showModal()}>Website rules</button><button className="add-button" onClick={openPrayer}>Add a prayer</button></nav></header>
    <main>
      {demoMode && <p className="demo-note">Demo — requests are saved only in this browser.</p>}
      <p className="success" role="status">{notice}</p>
      <div className="wall-layout">
        <section className="wall" aria-labelledby="wall-title"><div className="wall-heading"><h1 id="wall-title">Prayer requests</h1>{!demoMode && <button className="refresh" onClick={refresh} disabled={loading || saving || !supabase}>{loading ? 'Loading…' : 'Refresh'}</button>}</div>
          {error && <div className="error" role="alert">{error}</div>}
          {loading && <p role="status">Loading requests…</p>}
          {!loading && !error && requests.length === 0 && <p className="empty">No prayer requests yet.</p>}
          <div className="cards">{requests.map((request, index) => <article className={`card tone-${index % 4}`} key={request.id}><p>{request.message}</p><footer><span>{request.example ? 'Example' : request.name?.trim() || 'Anonymous'}</span><time dateTime={request.created_at} title={fullTimestampFormat.format(new Date(request.created_at))}>{timestampFormat.format(new Date(request.created_at))}</time></footer></article>)}</div>
        </section>
      </div>
    </main>
    <dialog ref={prayerDialog} className="prayer-popup" aria-labelledby="prayer-form-title" onCancel={event => { if (saving) event.preventDefault(); }}>
          <button className="popup-close" type="button" aria-label="Close add prayer" disabled={saving} onClick={() => prayerDialog.current?.close()}>×</button>
          <form id="prayer-form" onSubmit={submit}>
            <h2 id="prayer-form-title">Add a prayer</h2>
            <label htmlFor="message">Your prayer request</label>
            <textarea id="message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Please pray for…" maxLength={1000} required rows={5} disabled={saving} autoFocus aria-describedby="request-limit" />
            <div className="field-footer" id="request-limit"><span>{message.length}/1000</span></div>
            <label htmlFor="name">Name (optional)</label>
            <input id="name" name="name" autoComplete="given-name" placeholder="Your first name" value={name} onChange={event => setName(event.target.value)} maxLength={80} disabled={saving} aria-describedby="name-hint" />
            <p id="name-hint" className="field-hint">Leave blank to stay anonymous.</p>
            <p className="privacy-note">Your name and request will be public.</p>
            {(formError || configurationError) && <p className="error" role="alert">{formError || configurationError}</p>}
            <button className="submit" disabled={saving || loading || !message.trim() || !!configurationError}>{saving ? 'Adding…' : 'Add prayer'}</button>
          </form>
    </dialog>
    <dialog ref={rulesDialog} className="rules-popup" aria-labelledby="rules-title">
      <button className="popup-close" type="button" aria-label="Close website rules" onClick={() => rulesDialog.current?.close()}>×</button>
      <h2 id="rules-title">Before you share</h2>
      <p className="popup-intro">A few guidelines for our prayer wall.</p>
      <ul className="rules-list">
        <li><strong>Keep it kind.</strong> Treat every request and person with respect.</li>
        <li><strong>Protect each other’s privacy.</strong> Requests are public. Leave out contact details and sensitive information.</li>
        <li><strong>Share what you’re comfortable sharing.</strong> Your name is optional; leave it blank to stay anonymous.</li>
        <li><strong>Keep this a place for prayer.</strong> Please don’t post advertising, spam, or hurtful content.</li>
      </ul>
      <button className="submit" onClick={acknowledgeRules}>I understand</button>
    </dialog>
  </>;
}
const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');
createRoot(root).render(<App />);
