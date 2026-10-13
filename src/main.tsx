import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { configurationError, demoMode, supabase } from './supabase';
import './styles.css';
import type { FellowshipEvent, PrayerRequest } from './types';
import { demoEvents, resolveEvent } from './events';
import bethanyLogo from './assets/bethany-logo.png';
import { filterPrayers, type PrayerFilters } from './prayerFilters';
import { EventManager } from './EventManager';

const storageKey = 'mcac-prayer-wall-demo-v1';
const rulesKey = 'bethany-prayer-guidelines-v1';
function eventDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}
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
    && (!('event_id' in value) || value.event_id === null || typeof value.event_id === 'string')
    && (!('event_name' in value) || value.event_name === null || typeof value.event_name === 'string')
    && (!('example' in value) || typeof value.example === 'boolean');
}

function readDemo(): PrayerRequest[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (Array.isArray(saved) && saved.every(isPrayerRequest)) return saved;
  } catch { /* Use examples when browser storage is unavailable. */ }
  return ['I want to grow closer to God and make more room for Him in my everyday life.', 'Please pray for peace and wisdom as I step into a new season.', 'For our community to keep showing up for one another with kindness and love.'].map((message, index) => ({ id: `example-${index}`, message, event_id: index === 2 ? 'demo-past' : 'demo-current', created_at: new Date().toISOString(), example: true }));
}

function App() {
  const [requests, setRequests] = useState<PrayerRequest[]>(() => demoMode ? readDemo() : []);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [events, setEvents] = useState<FellowshipEvent[]>(demoMode ? demoEvents : []);
  const [eventFilter, setEventFilter] = useState('current');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [identity, setIdentity] = useState<PrayerFilters['identity']>('all');
  const [period, setPeriod] = useState<PrayerFilters['period']>('all');
  const [order, setOrder] = useState<PrayerFilters['order']>('newest');
  const currentEvent = events.find(event => event.is_current);
  const selectedEvent = resolveEvent(events, eventFilter);
  const eventRequests = demoMode ? requests.filter(request => eventFilter === 'legacy' ? !request.event_id : request.event_id === selectedEvent?.id) : requests;
  const visibleRequests = filterPrayers(eventRequests, { search, identity, period, order });
  const filtersActive = !!search.trim() || identity !== 'all' || period !== 'all' || order !== 'newest';
  const activeFilterCount = Number(identity !== 'all') + Number(period !== 'all') + Number(order !== 'newest');
  function clearFilters() { setSearch(''); setIdentity('all'); setPeriod('all'); setOrder('newest'); }
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
      const { data: eventData, error: eventError } = await supabase.from('fellowship_events').select('id,title,event_date,is_current').order('event_date', { ascending: false });
      if (eventError) throw eventError;
      setEvents(eventData);
      const chosenEvent = resolveEvent(eventData, eventFilter);
      if (eventFilter !== 'legacy' && !chosenEvent) { setRequests([]); return; }
      const query = supabase.from('prayer_requests').select('id,message,name,event_id,event_name,created_at');
      const filteredQuery = eventFilter === 'legacy' ? query.is('event_id', null) : query.eq('event_id', chosenEvent!.id);
      const { data, error: queryError } = await filteredQuery.order('created_at', { ascending: false }).limit(200);
      if (queryError) throw queryError;
      setRequests(data);
    } catch {
      setError('We couldn’t load the prayers. Try refreshing, or check that the event migration and Supabase policies have been applied.');
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [eventFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    const displayName = name.trim() || null;
    if (!text || !currentEvent || busy.current || configurationError || loading) return;
    busy.current = true;
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      let request: PrayerRequest;
      if (demoMode) {
        request = { id: crypto.randomUUID(), message: text, name: displayName, event_id: currentEvent.id, event_name: currentEvent.title, created_at: new Date().toISOString() };
        localStorage.setItem(storageKey, JSON.stringify([request, ...requests]));
      } else {
        if (!supabase) throw new Error('Supabase is not configured');
        const { data, error: insertError } = await supabase.from('prayer_requests').insert({ message: text, name: displayName, event_id: currentEvent.id, event_name: currentEvent.title }).select('id,message,name,event_id,event_name,created_at').single();
        if (insertError) throw insertError;
        request = data;
      }
      setRequests(current => [request, ...current.filter(item => item.id !== request.id)]);
      setMessage('');
      setName('');
      setEventFilter('current');
      setNotice(demoMode ? 'Saved in this browser.' : 'Prayer added.');
      prayerDialog.current?.close();
    } catch {
      setFormError(demoMode ? 'Your browser couldn’t save this demo request. Please allow local storage and try again.' : 'We couldn’t save your request. Your text is still here; please try again.');
    } finally { busy.current = false; setSaving(false); }
  }

  return <>
    <header className="site-header"><a className="brand" href="#"><img src={bethanyLogo} alt="Bethany Fellowship" /><span>Bethany Fellowship</span></a><nav aria-label="Prayer wall"><EventManager onChange={refresh} /><button className="header-link" onClick={() => rulesDialog.current?.showModal()}>Website rules</button><button className="add-button" onClick={openPrayer}>Add a prayer</button></nav></header>
    <main>
      {demoMode && <p className="demo-note">Demo — requests are saved only in this browser.</p>}
      <p className="success" role="status">{notice}</p>
      <div className="wall-layout">
        <section className="wall" aria-labelledby="wall-title"><div className="wall-heading"><div className="event-heading"><h1 id="wall-title">Prayer Requests</h1><p className="gathering-title">{selectedEvent?.title || (eventFilter === 'legacy' ? 'Earlier prayers' : 'This gathering')}{selectedEvent?.is_current && <span className="current-badge">Current</span>}</p>{selectedEvent && <time dateTime={selectedEvent.event_date}>{eventDate(selectedEvent.event_date)}</time>}</div>{!demoMode && <button className="refresh" onClick={refresh} disabled={loading || saving || !supabase}>{loading ? 'Loading…' : 'Refresh'}</button>}</div>
          <div className="event-filter"><label htmlFor="event-filter">Switch gathering/event</label><select id="event-filter" value={eventFilter} disabled={loading || saving} onChange={event => { setEventFilter(event.target.value); if (!demoMode) { setRequests([]); setLoading(true); } }}>
            <option value="current">{currentEvent ? 'Current' : 'No current gathering'}</option>
            <optgroup label="Past gatherings/events">{events.filter(event => !event.is_current).map(event => <option key={event.id} value={event.id}>{event.title} · {event.event_date}</option>)}</optgroup>
            <option value="legacy">Earlier prayers (no event)</option>
          </select></div>
          <div className="search-toolbar" role="search" aria-label="Find prayer requests">
            <div className="search-field"><label htmlFor="prayer-search">Search prayers</label><input id="prayer-search" type="search" placeholder="Search by name or request…" value={search} onChange={event => setSearch(event.target.value)} /></div>
            <button className="filter-toggle" aria-expanded={filtersOpen} aria-controls="prayer-filter-panel" onClick={() => setFiltersOpen(open => !open)}>Filters{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}<span aria-hidden="true">{filtersOpen ? '−' : '+'}</span></button>
          </div>
          <div id="prayer-filter-panel" className="prayer-filters" hidden={!filtersOpen}>
            <div><label htmlFor="identity-filter">Shared by</label><select id="identity-filter" value={identity} onChange={event => setIdentity(event.target.value as PrayerFilters['identity'])}><option value="all">Everyone</option><option value="named">With a name</option><option value="anonymous">Anonymous</option></select></div>
            <div><label htmlFor="period-filter">When</label><select id="period-filter" value={period} onChange={event => setPeriod(event.target.value as PrayerFilters['period'])}><option value="all">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></div>
            <div><label htmlFor="sort-order">Sort</label><select id="sort-order" value={order} onChange={event => setOrder(event.target.value as PrayerFilters['order'])}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
          </div>
          <div className="filter-summary"><span role="status" aria-live="polite">{loading ? 'Loading prayers…' : `${visibleRequests.length} of ${eventRequests.length} prayers`}</span>{filtersActive && <button className="header-link" onClick={clearFilters}>Clear filters</button>}</div>
          {!loading && !error && eventFilter === 'current' && !currentEvent && <p className="empty">No current event has been set. An admin can set one in Supabase.</p>}
          {error && <div className="error" role="alert">{error}</div>}
          {loading && <p role="status">Loading requests…</p>}
          {!loading && !error && visibleRequests.length === 0 && (eventFilter !== 'current' || currentEvent) && <p className="empty">{eventRequests.length ? 'No prayers match your search or filters. Try different words or clear the filters.' : 'No prayer requests for this gathering yet.'}</p>}
          <div className="cards">{visibleRequests.map((request, index) => <article className={`card tone-${index % 4}`} key={request.id}><p>{request.message}</p><footer><span>{request.example ? 'Example' : request.name?.trim() || 'Anonymous'}</span><time dateTime={request.created_at} title={fullTimestampFormat.format(new Date(request.created_at))}>{timestampFormat.format(new Date(request.created_at))}</time></footer></article>)}</div>
        </section>
      </div>
    </main>
    <dialog ref={prayerDialog} className="prayer-popup" aria-labelledby="prayer-form-title" onCancel={event => { if (saving) event.preventDefault(); }}>
          <button className="popup-close" type="button" aria-label="Close add prayer" disabled={saving} onClick={() => prayerDialog.current?.close()}>×</button>
          <form id="prayer-form" onSubmit={submit}>
            <h2 id="prayer-form-title">Add a prayer</h2>
            <p className="form-event">{currentEvent ? `For ${currentEvent.title} · ${eventDate(currentEvent.event_date)}` : 'An admin needs to set the current event before requests can be added.'}</p>
            <label htmlFor="message">Your prayer request</label>
            <textarea id="message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Please pray for…" maxLength={1000} required rows={5} disabled={saving} autoFocus aria-describedby="request-limit" />
            <div className="field-footer" id="request-limit"><span>{message.length}/1000</span></div>
            <label htmlFor="name">Name (optional)</label>
            <input id="name" name="name" autoComplete="given-name" placeholder="Your first name" value={name} onChange={event => setName(event.target.value)} maxLength={80} disabled={saving} aria-describedby="name-hint" />
            <p id="name-hint" className="field-hint">Leave blank to stay anonymous.</p>
            <p className="privacy-note">Your name and request will be public.</p>
            {(formError || configurationError) && <p className="error" role="alert">{formError || configurationError}</p>}
            <button className="submit" disabled={saving || loading || !currentEvent || !message.trim() || !!configurationError}>{saving ? 'Adding…' : 'Add prayer'}</button>
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
