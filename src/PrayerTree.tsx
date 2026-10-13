import type { PrayerRequest } from './types';

export function Fig({ green = false }: { green?: boolean }) {
  return <svg viewBox="0 0 50 66" aria-hidden="true"><path d="M25 13Q23 5 30 2" stroke="#7c7250" strokeWidth="3" fill="none" /><path d="M25 11C18 14 19 26 12 34C-2 52 9 64 25 64S52 52 38 34C31 26 32 14 25 11Z" fill={green ? '#91a16b' : '#84627e'} /><path d="M23 23C13 43 13 51 20 57" fill="none" stroke="white" opacity=".22" strokeWidth="3" /></svg>;
}

export function prayerLabel(message: string) {
  return message.length > 42 ? `${message.slice(0, 39).trim()}…` : message;
}

const leaves = [[260,290,-65],[300,230,-30],[355,200,-40],[410,220,20],[435,155,-20],[492,183,35],[550,205,-25],[590,148,15],[656,203,45],[720,219,35],[769,270,65],[802,330,65],[730,357,40],[660,320,-25],[610,282,-40],[527,293,40],[468,293,-30],[400,303,-40],[337,300,-50],[240,350,-70],[309,369,10],[367,390,-30],[427,361,10],[580,378,-45],[651,401,65],[732,405,80],[289,413,-70],[505,241,5],[376,252,30],[688,270,50],[573,335,5],[466,389,40]];
// Forty equal-sized slots across the canopy; narrower rows follow its outline.
const positions = [6, 8, 10, 10, 6].flatMap((count, row) =>
  Array.from({ length: count }, (_, column) => [
    50 + (column - (count - 1) / 2) * 8,
    17 + row * 12,
  ]),
);
const mobilePositions = [[28,22],[72,22],[28,42],[72,42],[28,62],[72,62]];

type Props = { requests: PrayerRequest[]; offset: number; mobile: boolean; prayed: Set<string>; onSelect: (request: PrayerRequest) => void; onSwipe: (direction: number) => void };

export function PrayerTree({ requests, offset, mobile, prayed, onSelect, onSwipe }: Props) {
  return <div className="tree-scene" onTouchStart={event => { event.currentTarget.dataset.touchX = String(event.touches[0].clientX); }} onTouchEnd={event => { const start = Number(event.currentTarget.dataset.touchX); const distance = event.changedTouches[0].clientX - start; if (mobile && Math.abs(distance) > 50) onSwipe(distance < 0 ? 1 : -1); }}>
    <svg className="tree-illustration" viewBox="170 70 660 570" preserveAspectRatio="none" aria-hidden="true">
      <defs><g id="fig-leaf"><path d="M0 0C-43-14-54-42-37-52C-51-74-22-87-9-60C-6-103 22-103 21-64C47-89 69-62 43-42C75-39 69-12 38-15C40 7 11 14 0 0Z" fill="currentColor" /><path d="M0 0L9-62M5-25L-28-47M7-34L37-46" fill="none" stroke="#c4cf9f" strokeWidth="1.3" opacity=".55" /></g></defs>
      <ellipse cx="500" cy="608" rx="310" ry="30" fill="#e2e6d3" />
      <path d="M490 599C468 554 488 503 478 457C468 420 433 395 400 364L250 276M508 599C510 534 518 492 526 451C539 405 587 378 622 339L744 222M496 472C470 407 472 356 475 311L435 180M506 443C526 387 549 312 553 246L594 150M470 418L364 321L341 200M531 414L655 387L803 319" stroke="#88654c" strokeWidth="25" fill="none" strokeLinecap="round" />
      <path d="M495 592L496 433" stroke="#a17b58" strokeWidth="31" strokeLinecap="round" /><path d="M490 589L493 448" stroke="#c9a17a" strokeWidth="4" opacity=".6" />
      <g className="tree-leaves">{leaves.map(([x,y,rotation],i) => <use key={i} href="#fig-leaf" transform={`translate(${x} ${y}) rotate(${rotation}) scale(${i % 3 === 0 ? 1.1 : 1})`} style={{ color: ['#71885c','#859764','#9cac78','#617e55'][i % 4] }} />)}</g>
    </svg>
    <div className="tree-figs">{requests.map((request,index) => { const [left,top] = (mobile ? mobilePositions : positions)[index]; return <button className={`fig-button${prayed.has(request.id) ? ' prayed' : ''}`} key={request.id} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => onSelect(request)} title={prayerLabel(request.message)} aria-label={`Prayer ${offset + index + 1}: ${request.message}`}><Fig green={index % 3 === 1} /><span className="fig-number">{offset + index + 1}</span></button>; })}</div>
  </div>;
}
