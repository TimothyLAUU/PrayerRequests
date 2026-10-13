import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from './supabase';
import type { FellowshipEvent } from './types';

export function EventManager({ onChange }: { onChange: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authRevision, setAuthRevision] = useState(0);
  const [admin, setAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<FellowshipEvent[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [current, setCurrent] = useState(false);
  const actionBusy = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdmin(false); setChecking(true); setUserId(session?.user.id ?? null);
      setAuthRevision(revision => revision + 1);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAuthError('');
    if (!userId || !supabase) { setAdmin(false); setChecking(false); return; }
    supabase.from('event_admins').select('user_id').eq('user_id', userId).maybeSingle().then(({ data, error: queryError }) => {
      if (cancelled) return;
      setAdmin(!!data && !queryError); setChecking(false);
      if (queryError) setAuthError('Could not verify admin access. Check the admin migration and try again.');
    });
    return () => { cancelled = true; };
  }, [userId, authRevision]);

  async function loadEvents() {
    if (!supabase) return;
    const { data, error: queryError } = await supabase.from('fellowship_events').select('id,title,event_date,is_current').order('event_date', { ascending: false });
    if (queryError) throw queryError;
    setEvents(data);
  }

  function resetForm() { setEditing(null); setTitle(''); setDate(''); setCurrent(false); }
  async function open() {
    setError(''); setNotice(''); resetForm(); dialog.current?.showModal();
    try { await loadEvents(); } catch { setError('Could not load events. Please try again.'); }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase || actionBusy.current) return;
    actionBusy.current = true; setBusy(true); setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      setPassword('');
    } catch { setError('Sign-in failed. Check your email and password, then try again.'); }
    finally { actionBusy.current = false; setBusy(false); }
  }

  async function signOut() {
    if (!supabase || actionBusy.current) return;
    actionBusy.current = true; setBusy(true); setError('');
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setAdmin(false); setUserId(null); setPassword(''); resetForm();
    } catch { setError('Could not sign out. Please try again.'); }
    finally { actionBusy.current = false; setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !admin || !title.trim() || !date || actionBusy.current) return;
    actionBusy.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const { error: saveError } = await supabase.rpc('save_fellowship_event', { p_id: editing, p_title: title.trim(), p_date: date, p_current: current });
      if (saveError) throw saveError;
      resetForm();
      setNotice('Event saved.');
      try { await loadEvents(); await onChange(); } catch { setError('The event was saved, but the list could not refresh. Close this window and refresh the wall.'); }
    } catch { setError('Could not save the event. Check your admin access and try again. Your changes are still here.'); }
    finally { actionBusy.current = false; setBusy(false); }
  }

  if (!supabase) return null;
  return <>
    <button className="header-link" onClick={open}>{admin ? 'Manage events' : 'Admin sign-in'}</button>
    <dialog ref={dialog} className="event-manager" aria-labelledby="event-manager-title" onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => setPassword('')}>
      <button className="popup-close" aria-label="Close event manager" disabled={busy} onClick={() => dialog.current?.close()}>×</button>
      <h2 id="event-manager-title">{admin ? 'Manage events' : 'Admin sign-in'}</h2>
      {checking ? <p role="status">Checking access…</p> : !userId ? <form onSubmit={signIn}>
        <p className="popup-intro">Sign in with your admin account.</p>
        <label htmlFor="admin-email">Email</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} />
        <label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={busy} />
        <button className="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form> : !admin ? <div><p>{authError || 'This account does not have event admin access. Ask a fellowship administrator to add you.'}</p><button className="refresh" disabled={busy} onClick={signOut}>Sign out</button></div> : <>
        <form onSubmit={save}>
          <p className="popup-intro">{editing ? 'Edit gathering' : 'New gathering'}</p>
          <label htmlFor="event-title">Event name</label><input id="event-title" value={title} maxLength={100} onChange={event => setTitle(event.target.value)} required disabled={busy} />
          <label htmlFor="event-date">Date</label><input id="event-date" type="date" value={date} onChange={event => setDate(event.target.value)} required disabled={busy} />
          <label className="current-event-choice"><input type="checkbox" checked={current} onChange={event => setCurrent(event.target.checked)} disabled={busy} />Make this the current event</label>
          {current && <p className="field-hint">New prayer requests will go here. The previous event will move to past events.</p>}
          <div className="manager-actions"><button className="submit" disabled={busy || !title.trim() || !date}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create event'}</button>{editing && <button type="button" className="refresh" disabled={busy} onClick={resetForm}>Cancel edit</button>}</div>
        </form>
        <p className="success" role="status">{notice}</p>
        <ul className="manager-event-list">{events.map(event => <li key={event.id}><div><strong>{event.title}</strong><small>{event.event_date}{event.is_current ? ' · Current event' : ''}</small></div><button className="refresh" disabled={busy} onClick={() => { setEditing(event.id); setTitle(event.title); setDate(event.event_date); setCurrent(event.is_current); setNotice(''); }}>Edit</button></li>)}</ul>
        <button className="header-link" disabled={busy} onClick={signOut}>Sign out</button>
      </>}
      {error && <p className="error" role="alert">{error}</p>}
    </dialog>
  </>;
}
