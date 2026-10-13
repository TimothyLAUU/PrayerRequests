import type { PrayerRequest } from './types';

export type PrayerFilters = {
  search: string;
  identity: 'all' | 'named' | 'anonymous';
  period: 'all' | '7' | '30';
  order: 'newest' | 'oldest';
};

export function filterPrayers(requests: PrayerRequest[], filters: PrayerFilters, now = Date.now()) {
  const words = filters.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const cutoff = filters.period === 'all' ? null : now - Number(filters.period) * 86400000;
  return requests.filter(request => {
    const name = request.name?.trim() || '';
    const text = `${name || 'Anonymous'} ${request.message}`.toLocaleLowerCase();
    if (!words.every(word => text.includes(word))) return false;
    if (filters.identity === 'named' && !name) return false;
    if (filters.identity === 'anonymous' && name) return false;
    const timestamp = Date.parse(request.created_at);
    return cutoff === null || (timestamp >= cutoff && timestamp <= now);
  }).sort((a, b) => {
    const difference = Date.parse(a.created_at) - Date.parse(b.created_at);
    return filters.order === 'oldest' ? difference : -difference;
  });
}
