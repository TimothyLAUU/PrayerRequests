import type { FellowshipEvent } from './types';

export const demoEvents: FellowshipEvent[] = [
  { id: 'demo-current', title: 'Fellowship gathering', event_date: '2026-10-13', is_current: true },
  { id: 'demo-past', title: 'Previous gathering', event_date: '2026-10-06', is_current: false },
];

export function resolveEvent(events: FellowshipEvent[], filter: string) {
  return filter === 'current' ? events.find(event => event.is_current) : events.find(event => event.id === filter);
}
