import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { configurationError, demoMode, supabase } from './supabase';
import './styles.css';
import type { PrayerRequest } from './types';
import { PrayerTree, prayerLabel } from './PrayerTree';

const storageKey = 'mcac-prayer-wall-demo-v1';
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
    if (Array.isArray(saved) && saved.every(isPrayerRequest)) return saved.map(request => ({ ...request, name: request.name ?? null }));
  } catch { /* Use examples when browser storage is unavailable. */ }
  return ['I want to grow closer to God and make more room for Him in my everyday life.', 'Please pray for peace and wisdom as I step into a new season.', 'For our community to keep showing up for one another with kindness and love.'].map((message, index) => ({ id: `example-${index}`, message, name: null, created_at: new Date().toISOString(), example: true }));
}

function App() {
  const [requests, setRequests] = useState<PrayerRequest[]>(() => demoMode ? readDemo() : []);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [loading, setLoading] = useState(!demoMode && !configurationError);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(configurationError);
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const [selected, setSelected] = useState<PrayerRequest | null>(null);
  const [listView, setListView] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 650px)').matches);
  const [page, setPage] = useState(0);
  const [prayed, setPrayed] = useState<Set<string>>(() => new Set());
  const [guided, setGuided] = useState(false);
  const card = useRef<HTMLDialogElement>(null);
  const pageSize = mobile ? 6 : 40;
  const pageCount = Math.max(1, Math.ceil(requests.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const selectedIndex = selected ? requests.findIndex(request => request.id === selected.id) : -1;
  useEffect(() => {
    const query = window.matchMedia('(max-width: 650px)');
    const update = () => { setMobile(query.matches); setPage(0); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { if (selected && !card.current?.open) card.current?.showModal(); }, [selected]);
  function selectRequest(request: PrayerRequest) { setGuided(false); setSelected(request); }
  function changePage(direction: number) { setPage((currentPage + direction + pageCount) % pageCount); }

  async function refresh() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase.from('prayer_requests').select('id,message,name,created_at').order('created_at', { ascending: false }).limit(200);
      if (queryError) throw queryError;
      setRequests(data);
    } catch {
      setError('We couldn’t load the prayer tree. Try refreshing. Check that the Supabase table, name migration, and policies are set up.');
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    const submittedName = anonymous ? null : name.trim();
    if (!text || (!anonymous && !submittedName) || busy.current || configurationError || loading) return;
    busy.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      let request: PrayerRequest;
      if (demoMode) {
        request = { id: crypto.randomUUID(), message: text, name: submittedName, created_at: new Date().toISOString() };
        localStorage.setItem(storageKey, JSON.stringify([request, ...requests]));
      } else {
        if (!supabase) throw new Error('Supabase is not configured');
        const { data, error: insertError } = await supabase.from('prayer_requests').insert({ message: text, name: submittedName }).select('id,message,name,created_at').single();
        if (insertError) throw insertError;
        request = data;
      }
      setRequests(current => [request, ...current.filter(item => item.id !== request.id)]);
      setMessage('');
      setName('');
      setAnonymous(true);
      setPage(0);
      setNotice(demoMode ? 'Saved in this browser.' : 'Prayer added.');
    } catch {
      setError(demoMode ? 'Your browser couldn’t save this demo request. Please allow local storage and try again.' : 'We couldn’t save your request. Your text is still here; please try again.');
    } finally { busy.current = false; setSaving(false); }
  }

  return <>
    <header className="site-header"><a className="brand" href="#"><span aria-hidden="true">❧</span><span>BETHANY<small>FELLOWSHIP</small></span></a><a className="header-link" href="#prayer-form">＋ Add a prayer</a></header>
    <main>
      <section className="intro" aria-labelledby="page-title"><h1 id="page-title">Bethany Prayer Tree</h1><div className="intro-actions"><button className="button primary" aria-describedby="guided-help" disabled={!requests.length || loading} onClick={() => { setGuided(true); setSelected(requests[0]); }}>Pray with us <span aria-hidden="true">→</span></button><p id="guided-help">Pray through the requests, one at a time.</p></div></section>
      {demoMode && <p className="demo-note">Demo — requests are saved only in this browser.</p>}
      <div className="wall-layout">
        <section className="wall" aria-label="Prayer requests"><div className="wall-heading"><span>{requests.length} {requests.length === 1 ? 'prayer' : 'prayers'}</span><div className="wall-controls"><button className="refresh" onClick={() => setListView(!listView)} aria-pressed={listView}>{listView ? 'Tree view' : 'List view'}</button>{!demoMode && <button className="refresh" onClick={refresh} disabled={loading || saving || !supabase}>{loading ? 'Loading…' : 'Refresh'}</button>}</div></div>
          {error && <div className="error" role="alert">{error}</div>}
          {loading && <p role="status">Loading requests…</p>}
          {!loading && !error && requests.length === 0 && <p className="empty">No prayer requests yet.</p>}
          {listView ? <div className="cards">{requests.map((request, index) => <button className="list-card" key={request.id} onClick={() => selectRequest(request)}><strong>Prayer {index + 1} · {request.name || 'Anonymous'}</strong><p>{prayerLabel(request.message)}</p></button>)}</div> : <><PrayerTree requests={requests.slice(currentPage * pageSize, (currentPage + 1) * pageSize)} offset={currentPage * pageSize} mobile={mobile} prayed={prayed} onSelect={selectRequest} onSwipe={changePage} />{pageCount > 1 && <div className="branch-navigation"><button className="refresh" aria-label="Previous branch" onClick={() => changePage(-1)}>←</button><span>{currentPage + 1} / {pageCount}</span><button className="refresh" aria-label="Next branch" onClick={() => changePage(1)}>→</button></div>}</>}
        </section>
        <aside><form id="prayer-form" onSubmit={submit}>
          <div className="form-heading"><span className="form-icon" aria-hidden="true">♡</span><h2>Add a prayer</h2></div>
          <label htmlFor="message">What would you like prayer for?</label>
          <textarea id="message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Please pray for…" maxLength={1000} required rows={4} disabled={saving} />
          <fieldset className="identity-choice" disabled={saving}><legend>How would you like to share?</legend><div className="identity-options">
            <label className={anonymous ? 'chosen' : ''}><input type="radio" name="identity" checked={anonymous} onChange={() => setAnonymous(true)} />Stay anonymous</label>
            <label className={!anonymous ? 'chosen' : ''}><input type="radio" name="identity" checked={!anonymous} onChange={() => setAnonymous(false)} />Add my name</label>
          </div></fieldset>
          {!anonymous && <div className="name-field"><label htmlFor="prayer-name">Your name</label><input id="prayer-name" type="text" autoComplete="given-name" value={name} onChange={event => setName(event.target.value)} placeholder="First name" maxLength={60} required disabled={saving} /></div>}
          <p className="privacy-note">Requests{anonymous ? '' : ' and your name'} are publicly visible. Please leave out sensitive details.</p>
          <button className="submit" disabled={saving || loading || !message.trim() || (!anonymous && !name.trim()) || !!configurationError}>{saving ? 'Adding…' : 'Add to the tree'}</button><p className="success" role="status">{notice}</p>
        </form></aside>
      </div>
    </main>
    <dialog ref={card} className="prayer-dialog" onClose={() => { setSelected(null); setGuided(false); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) card.current?.close(); } }}>
      {selected && <><button className="close-dialog" aria-label="Close prayer" onClick={() => card.current?.close()}>×</button><h2>{guided ? 'Pray with us' : `Prayer ${selectedIndex + 1}`}</h2><p className="prayer-meta">{selected.example ? 'Example prayer' : selected.name || 'Anonymous'} · <time dateTime={selected.created_at}>{new Date(selected.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time></p><p className="prayer-message">{selected.message}</p><button className="button primary" disabled={prayed.has(selected.id)} onClick={() => setPrayed(current => new Set([...current, selected.id]))}>{prayed.has(selected.id) ? 'Prayed' : 'I prayed for you'}</button><p className="prayer-confirmation" role="status">{prayed.has(selected.id) ? 'Thank you for taking a moment to pray.' : ''}</p>{guided && <div className="guided-navigation"><small>{selectedIndex + 1} of {requests.length}</small><button className="button secondary" onClick={() => { if (selectedIndex + 1 < requests.length) setSelected(requests[selectedIndex + 1]); else card.current?.close(); }}>{selectedIndex + 1 < requests.length ? 'Next prayer →' : 'Finish'}</button></div>}</>}
    </dialog>
  </>;
}
const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');
createRoot(root).render(<App />);
