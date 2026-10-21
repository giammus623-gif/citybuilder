import { ARCHETYPES, SUGGERIMENTI, classify, type Archetype } from '../data/archetypes';
import { fmtMoney, fmtNum, getLocale, setLocale, t, type Locale } from '../i18n';
import { CityRenderer, PRESETS, type QualityPreset } from '../render/city';
import { BKind, MAP_SIZE, TICKS_PER_HOUR, TICKS_PER_SECOND, TileUse, Zone } from '../sim/constants';
import { bandFor } from '../sim/economy';
import type { FromWorker, Snapshot, TileInfo, ToWorker } from '../sim/protocol';
import { tileCost, type Tool } from '../sim/rules';
import type { GameEvent, SaveData } from '../sim/world';
import { exportSave, importSave, loadGame, saveGame } from '../save/idb';
import { clear, h, svg } from '../ui/dom';
import { ICONS } from '../ui/icons';
import { referenceCommands } from '../sim/scenario';
import SimWorker from '../sim/worker?worker&inline';

type ToolId = Tool | 'select';
type PanelKind =
  | { k: 'business' }
  | { k: 'tile'; tile: number }
  | { k: 'happy' }
  | { k: 'money' }
  | { k: 'next' };

interface Settings {
  quality: QualityPreset;
  tiltShift: boolean;
  ao: boolean | null;
  reducedMotion: boolean;
  debug: boolean;
  locale: Locale;
}

const SETTINGS_KEY = 'city-lab.settings';
const AUTOSAVE_MS = 5 * 60 * 1000;

function loadSettings(): Settings {
  const coarse =
    window.matchMedia?.('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 820;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const base: Settings = {
    quality: coarse ? 'telefono' : 'bilanciato',
    tiltShift: !reduced,
    ao: null,
    reducedMotion: reduced,
    debug: false,
    locale: 'it',
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* storage blocked: defaults are fine */
  }
  return base;
}

function storeSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function clock(tod: number): string {
  const minutes = Math.floor((tod / TICKS_PER_HOUR) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export class Game {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly r: CityRenderer;
  private readonly worker: Worker;
  private snap: Snapshot | null = null;
  private grid: Snapshot['grid'] | null = null;
  private tool: ToolId = 'select';
  private speed = 1;
  private playing = false;
  private settings = loadSettings();
  private panel: PanelKind | null = null;
  private feedItems: GameEvent[] = [];
  private requestId = 0;
  private pending = new Map<number, (m: FromWorker) => void>();
  private lastFrame = performance.now();
  private fps = 60;
  private frameMs = 16;
  private lastPanelRefresh = 0;
  private lastSnapAt = 0;
  private menuSpin = true;

  // DOM refs
  private hud!: HTMLElement;
  private toolsEl!: HTMLElement;
  private hintEl!: HTMLElement;
  private costEl!: HTMLElement;
  private panelsEl!: HTMLElement;
  private feedEl!: HTMLElement;
  private bizLabel!: HTMLElement;
  private debugEl!: HTMLElement;
  private statEls: Record<string, HTMLElement> = {};

  // pointer state
  private pointers = new Map<number, { x: number; y: number }>();
  private drag: null | {
    mode: 'pan' | 'rotate' | 'paint' | 'gesture';
    sx: number;
    sy: number;
    lx: number;
    ly: number;
    moved: boolean;
    startTile: number;
  } = null;
  private gesture = { dist: 0, angle: 0, mx: 0, my: 0 };
  private paintTiles: number[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    setLocale(this.settings.locale);
    this.canvas = h('canvas', { id: 'scene', tabindex: 0, 'aria-label': 'Plastico della città' });
    root.append(this.canvas);
    this.r = new CityRenderer(this.canvas, MAP_SIZE);
    this.applySettings();
    this.worker = new SimWorker();
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => this.onWorker(e.data);
    this.buildChrome();
    this.bindInput();
    window.addEventListener('resize', () => this.r.resize());
    window.addEventListener('error', (e) => this.crash(e.message));
    window.addEventListener('unhandledrejection', (e) => this.crash(String(e.reason)));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing) void this.save(false);
    });
    setInterval(() => this.playing && void this.save(false), AUTOSAVE_MS);
    // A quiet demo plastico behind the menu (Part 13.4).
    this.send({ type: 'new', seed: Math.floor(Math.random() * 1e9), archetype: 'bottega' });
    this.send({ type: 'speed', speed: 0 });
    requestAnimationFrame((now) => this.loop(now));
    void this.showStart();
  }

  // ------------------------------------------------------------- worker

  private send(m: ToWorker): void {
    this.worker.postMessage(m);
  }

  private request<T extends FromWorker>(m: ToWorker & { requestId: number }): Promise<T> {
    return new Promise((resolve) => {
      this.pending.set(m.requestId, resolve as (m: FromWorker) => void);
      this.send(m);
    });
  }

  private onWorker(m: FromWorker): void {
    if (m.type === 'snapshot') return this.onSnapshot(m.snap);
    if (m.type === 'error') return this.crash(m.message);
    const cb = this.pending.get(m.requestId);
    if (cb) {
      this.pending.delete(m.requestId);
      cb(m);
    }
  }

  private onSnapshot(s: Snapshot): void {
    const now = performance.now();
    const interval = this.lastSnapAt
      ? Math.min(250, now - this.lastSnapAt)
      : 1000 / TICKS_PER_SECOND;
    this.lastSnapAt = now;
    this.snap = s;
    if (s.grid) {
      this.grid = s.grid;
      this.r.setPlayerTile(s.business.tile);
      this.r.setGrid(s.grid);
    }
    if (s.buildings) this.r.setBuildings(s.buildings);
    this.r.setPeople(s.people, now, interval);
    // Ask for the next snapshot only once this one is on screen.
    requestAnimationFrame(() => this.send({ type: 'ack' }));
    if (!this.playing) return;
    for (const e of s.events) this.pushFeed(e);
    this.updateHud();
    if (now - this.lastPanelRefresh > 500) {
      this.lastPanelRefresh = now;
      this.renderPanel();
    }
  }

  // ------------------------------------------------------------- frame loop

  private loop(now: number): void {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.frameMs = this.frameMs * 0.9 + dt * 1000 * 0.1;
    this.fps = 1000 / this.frameMs;
    if (this.menuSpin && !this.settings.reducedMotion) this.r.rig.rotateBy(dt * 0.06, 0);
    // Interpolate the clock between ticks so light moves smoothly.
    let tod = 15.5 * TICKS_PER_HOUR;
    if (this.snap && this.playing) {
      const ahead = this.playing
        ? Math.min(1, (now - this.lastSnapAt) / (1000 / TICKS_PER_SECOND)) * this.snap.speed
        : 0;
      tod = this.snap.timeOfDay + ahead;
    }
    this.r.frame(now, dt, tod);
    this.placeBizLabel();
    if (this.settings.debug) this.updateDebug();
    requestAnimationFrame((n) => this.loop(n));
  }

  // ------------------------------------------------------------- chrome

  private buildChrome(): void {
    const speedBtns = [0, 1, 2, 4, 8].map((s) =>
      h(
        'button',
        {
          'data-speed': s,
          'aria-pressed': String(s === this.speed),
          'aria-label': s === 0 ? t('hud.pause') : `×${s}`,
          onclick: () => this.setSpeed(s),
        },
        s === 0 ? svg(ICONS.pause) : `×${s}`,
      ),
    );
    const stat = (key: string, label: string, onclick?: () => void) => {
      const v = h('span', { class: 'stat-value' }, '—');
      this.statEls[key] = v;
      return h(
        'button',
        { class: 'stat', onclick, title: label },
        h('span', { class: 'stat-label' }, label),
        v,
      );
    };
    const demand = h('span', { class: 'demand', 'aria-hidden': 'true' });
    for (const [k, c] of [
      ['r', 'var(--agricoltura)'],
      ['c', 'var(--emergenza)'],
      ['i', 'var(--economia)'],
    ] as const) {
      const bar = h('span', { style: `color:${c}` }, h('i', { 'data-d': k }));
      demand.append(bar);
    }
    this.hud = h(
      'div',
      { class: 'hud', hidden: true },
      h(
        'div',
        { class: 'hud-city glass' },
        h(
          'div',
          {},
          h('div', { class: 'hud-name', id: 'city-name' }, ''),
          h('div', { class: 'hud-clock num', id: 'clock' }, ''),
        ),
        h('div', { class: 'speed' }, ...speedBtns),
      ),
      h(
        'div',
        { class: 'hud-stats glass' },
        stat('money', t('hud.money'), () => this.openPanel({ k: 'money' })),
        stat('pop', t('hud.pop')),
        stat('happy', t('hud.happy'), () => this.openPanel({ k: 'happy' })),
        stat('jobs', t('hud.jobs')),
        h(
          'button',
          { class: 'stat', title: t('hud.demand') },
          h('span', { class: 'stat-label' }, t('hud.demand')),
          demand,
        ),
      ),
      h(
        'div',
        { class: 'hud-right' },
        h(
          'button',
          { class: 'btn primary next', onclick: () => this.openPanel({ k: 'next' }) },
          svg(ICONS.bulb),
          h('span', {}, t('hud.next')),
        ),
        h(
          'button',
          {
            class: 'btn icon glass',
            'aria-label': t('settings.title'),
            onclick: () => this.openSettings(),
          },
          svg(ICONS.gear),
        ),
      ),
    );

    const toolDefs: [ToolId, string?][] = [
      ['select'],
      ['road'],
      ['res', 'var(--agricoltura)'],
      ['com', 'var(--emergenza)'],
      ['ind', 'var(--economia)'],
      ['park'],
      ['bulldoze'],
    ];
    this.toolsEl = h('nav', { class: 'tools glass', hidden: true, 'aria-label': 'Strumenti' });
    toolDefs.forEach(([id, sw], k) => {
      this.toolsEl.append(
        h(
          'button',
          {
            class: 'tool',
            'data-tool': id,
            'aria-pressed': String(id === this.tool),
            title: `${t(`tool.${id}`)} (${k + 1})`,
            onclick: () => this.setTool(id),
          },
          svg(ICONS[id]),
          t(`tool.${id}`),
          sw ? h('span', { class: 'sw', style: `background:${sw}` }) : null,
        ),
      );
    });
    this.toolsEl.append(
      h('hr'),
      h(
        'button',
        {
          class: 'tool',
          id: 'undo',
          title: `${t('tool.undo')} (Ctrl+Z)`,
          onclick: () => this.send({ type: 'cmd', cmd: { t: 'undo' } }),
        },
        svg(ICONS.undo),
        t('tool.undo'),
      ),
      h(
        'button',
        {
          class: 'tool',
          id: 'redo',
          title: `${t('tool.redo')} (Ctrl+Y)`,
          onclick: () => this.send({ type: 'cmd', cmd: { t: 'redo' } }),
        },
        svg(ICONS.redo),
        t('tool.redo'),
      ),
    );
    this.hintEl = h('div', { class: 'hint glass', hidden: true, role: 'status' });
    this.costEl = h('div', { class: 'cursor-cost glass num', hidden: true });
    this.panelsEl = h('aside', { class: 'panels', 'aria-live': 'polite' });
    this.feedEl = h('div', { class: 'feed', hidden: true });
    this.bizLabel = h('div', { class: 'biz-label', hidden: true });
    this.debugEl = h('div', { class: 'debug glass', hidden: true });
    const disclaimer = h(
      'div',
      { class: 'disclaimer glass', hidden: true, id: 'disclaimer' },
      t('disclaimer'),
    );
    this.root.append(
      this.bizLabel,
      this.hud,
      this.toolsEl,
      this.hintEl,
      this.costEl,
      this.panelsEl,
      this.feedEl,
      disclaimer,
      this.debugEl,
    );
  }

  private setSpeed(s: number): void {
    this.speed = s;
    this.send({ type: 'speed', speed: s });
    this.hud
      .querySelectorAll<HTMLButtonElement>('[data-speed]')
      .forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s)));
  }

  private setTool(id: ToolId): void {
    this.tool = id;
    this.toolsEl
      .querySelectorAll<HTMLButtonElement>('[data-tool]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === id)));
    clear(this.hintEl);
    this.hintEl.append(h('strong', {}, t(`tool.${id}`)), t(`tool.hint.${id}`));
    this.hintEl.hidden = false;
    clearTimeout((this.hintEl as unknown as { _t?: number })._t);
    (this.hintEl as unknown as { _t?: number })._t = window.setTimeout(
      () => (this.hintEl.hidden = true),
      4500,
    );
    this.r.setPreview([], [], id);
    this.costEl.hidden = true;
    this.canvas.style.cursor = id === 'select' ? 'grab' : 'crosshair';
  }

  private updateHud(): void {
    const s = this.snap!;
    (this.hud.querySelector('#city-name') as HTMLElement).textContent = s.cityName;
    (this.hud.querySelector('#clock') as HTMLElement).textContent =
      `${t('hud.day', { n: s.day })} · ${clock(s.timeOfDay)}`;
    this.statEls.money.textContent = fmtMoney(s.money);
    this.statEls.money.classList.toggle('neg', s.money < 0);
    this.statEls.pop.textContent = fmtNum(s.pop);
    this.statEls.happy.textContent = s.pop ? `${s.happiness}` : '—';
    this.statEls.jobs.textContent = `${fmtNum(s.employed)}/${fmtNum(s.jobs + s.business.posti)}`;
    for (const k of ['r', 'c', 'i'] as const) {
      const i = this.hud.querySelector<HTMLElement>(`[data-d="${k}"]`)!;
      const v = s.demand[k];
      i.classList.toggle('down', v < 0);
      i.style.height = `${Math.abs(v) * 50}%`;
    }
    (this.toolsEl.querySelector('#undo') as HTMLButtonElement).disabled = !s.canUndo;
    (this.toolsEl.querySelector('#redo') as HTMLButtonElement).disabled = !s.canRedo;
    this.bizLabel.textContent = ARCHETYPES.find((a) => a.id === s.business.archetipo)?.nome ?? '';
  }

  private placeBizLabel(): void {
    if (!this.playing || !this.snap) {
      this.bizLabel.hidden = true;
      return;
    }
    const p = this.r.project(this.snap.business.tile, 1.0);
    this.bizLabel.hidden = !p.visible || this.r.rig.dist > 120;
    this.bizLabel.style.left = `${p.x}px`;
    this.bizLabel.style.top = `${p.y}px`;
  }

  private pushFeed(e: GameEvent): void {
    this.feedItems.unshift(e);
    this.feedItems.length = Math.min(this.feedItems.length, 5);
    clear(this.feedEl);
    for (const ev of this.feedItems) {
      const b = h(
        'button',
        { class: 'glass', onclick: () => ev.tile !== undefined && this.goTo(ev.tile) },
        h('time', {}, clock(ev.tick % (24 * TICKS_PER_HOUR))),
        t(ev.key, ev.params),
      );
      this.feedEl.append(b);
    }
  }

  private goTo(tile: number): void {
    const [x, z] = this.r.tileCenter(tile);
    this.r.rig.flyTo(x, z, 16);
  }

  // ------------------------------------------------------------- panels

  private openPanel(p: PanelKind): void {
    this.panel = p;
    this.lastPanelRefresh = 0;
    this.renderPanel();
  }

  private closePanel(): void {
    this.panel = null;
    clear(this.panelsEl);
  }

  private panelShell(eyebrow: string, title: string, ...body: (Node | null)[]): HTMLElement {
    return h(
      'section',
      { class: 'panel glass' },
      h(
        'header',
        {},
        h('div', {}, h('p', { class: 'eyebrow' }, eyebrow), h('h2', {}, title)),
        h(
          'button',
          { class: 'x', 'aria-label': t('panel.close'), onclick: () => this.closePanel() },
          '×',
        ),
      ),
      ...body,
    );
  }

  private renderPanel(): void {
    if (!this.panel || !this.snap) return;
    const p = this.panel;
    if (p.k === 'tile') {
      void this.request<Extract<FromWorker, { type: 'inspect' }>>({
        type: 'inspect',
        tile: p.tile,
        requestId: ++this.requestId,
      }).then((m) => {
        if (this.panel === p) this.showPanel(this.tilePanel(m.info));
      });
      return;
    }
    const el =
      p.k === 'business'
        ? this.businessPanel()
        : p.k === 'happy'
          ? this.happyPanel()
          : p.k === 'money'
            ? this.moneyPanel()
            : this.nextPanel();
    this.showPanel(el);
  }

  private showPanel(el: HTMLElement): void {
    const old = this.panelsEl.firstElementChild;
    const scroll = old?.scrollTop ?? 0;
    clear(this.panelsEl);
    this.panelsEl.append(el);
    el.scrollTop = scroll;
    if (old) el.style.animation = 'none';
  }

  private kv(rows: [string, string | Node][]): HTMLElement {
    const dl = h('dl', { class: 'kv' });
    for (const [k, v] of rows) dl.append(h('dt', {}, k), h('dd', {}, v));
    return dl;
  }

  private businessPanel(): HTMLElement {
    const s = this.snap!;
    const b = s.business;
    const a = ARCHETYPES.find((x) => x.id === b.archetipo)!;
    const est = b.stimaOggi;
    const history = b.storico;
    const avg = history.length
      ? history.slice(-3).reduce((n, d) => n + d.profitto, 0) / Math.min(3, history.length)
      : est.profitto;
    const payback = avg > 0 ? b.investimento / avg : Infinity;
    const onTarget = Number.isFinite(payback) && payback <= b.rientroBersaglio * 1.25;
    const spark = this.sparkline(history.map((d) => d.profitto));
    return this.panelShell(
      t('panel.business'),
      a.nome,
      h(
        'div',
        {},
        h('div', { class: 'big' }, fmtMoney(est.profitto)),
        h(
          'p',
          {},
          `${t('panel.business.today')} · ${fmtNum(est.clienti)} ${t('panel.business.customers').toLowerCase()}`,
        ),
      ),
      this.kv([
        [t('panel.business.revenue'), fmtMoney(est.entrate)],
        [t('panel.business.costs'), fmtMoney(est.uscite)],
        [t('panel.business.staff'), `${b.dipendenti}/${b.posti}`],
        [t('panel.business.catchment'), fmtNum(b.bacino)],
        [t('panel.business.footfall'), fmtNum(b.passaggioOggi)],
        [t('panel.business.competitors'), fmtNum(b.concorrenti)],
        [
          t('panel.business.payback'),
          h(
            'span',
            {},
            h(
              'span',
              { class: `pill ${onTarget ? 'good' : 'bad'}` },
              Number.isFinite(payback) ? this.days(payback) : t('panel.business.never'),
            ),
            ' ',
            h('span', { class: 'pill' }, t('panel.business.target', { n: b.rientroBersaglio })),
          ),
        ],
      ]),
      history.length
        ? h('div', {}, h('p', { class: 'eyebrow' }, t('panel.business.history')), spark)
        : null,
      h('p', {}, t('panel.business.why')),
    );
  }

  private days(n: number): string {
    const v = Math.round(n * 10) / 10;
    return v === 1
      ? t('unit.day', { n: 1 })
      : t('unit.days', { n: v.toLocaleString(getLocale() === 'en' ? 'en-GB' : 'it-IT') });
  }

  private sparkline(values: number[]): SVGElement {
    const w = 300;
    const hgt = 54;
    if (values.length < 2) values = [...values, ...values];
    const max = Math.max(1, ...values);
    const min = Math.min(0, ...values);
    const x = (i: number) => (i / (values.length - 1)) * (w - 8) + 4;
    const y = (v: number) => hgt - 6 - ((v - min) / (max - min || 1)) * (hgt - 12);
    const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const last = values[values.length - 1];
    return svg(
      `<svg class="spark" viewBox="0 0 ${w} ${hgt}" preserveAspectRatio="none" role="img" aria-label="Profitto degli ultimi giorni">
        <line x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)" />
        <polyline points="4,${y(min)} ${pts} ${x(values.length - 1)},${y(min)}" fill="var(--chip)" stroke="none"/>
        <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>
        <circle cx="${x(values.length - 1)}" cy="${y(last)}" r="3.5" fill="var(--accent)"/>
      </svg>`,
    );
  }

  private happyPanel(): HTMLElement {
    const s = this.snap!;
    if (!s.pop)
      return this.panelShell(t('hud.happy'), t('hud.happy'), h('p', {}, t('panel.happy.empty')));
    const f = s.factors;
    const keys = ['base', 'lavoro', 'parchi', 'negozi', 'tragitto', 'inquinamento'] as const;
    const box = h('div', { class: 'factors' });
    for (const k of keys) {
      const v = f[k];
      const width = Math.min(70, (Math.abs(v) / 30) * 70);
      const bar = h('i', {
        style: `width:${width}%;background:${v >= 0 ? 'var(--good)' : 'var(--bad)'};left:${v >= 0 ? 30 : 30 - width}%`,
      });
      box.append(
        h(
          'div',
          { class: 'factor' },
          h('span', {}, t(`panel.happy.${k}`)),
          h('span', { class: 'val' }, `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v))}`),
          h('div', { class: 'bar' }, bar),
        ),
      );
    }
    // Suggest the factor with the most room left (Part 9.4, "cosa puoi fare").
    const gaps: [string, number][] = [
      ['parchi', 15 - f.parchi],
      ['negozi', 15 - f.negozi],
      ['lavoro', 30 - f.lavoro],
      ['inquinamento', -f.inquinamento],
      ['tragitto', 10 - f.tragitto],
    ];
    gaps.sort((a, b) => b[1] - a[1]);
    return this.panelShell(
      t('hud.happy'),
      t('panel.happy.title', { n: s.happiness }),
      h('p', {}, t('panel.happy.lead')),
      box,
      gaps[0][1] > 1 ? h('div', { class: 'tip' }, t(`panel.happy.tip.${gaps[0][0]}`)) : null,
    );
  }

  private moneyPanel(): HTMLElement {
    const s = this.snap!;
    const d = s.lastDay;
    return this.panelShell(
      t('hud.money'),
      t('panel.money.title'),
      h('div', { class: 'big' }, fmtMoney(s.money)),
      d
        ? this.kv([
            [t('panel.money.taxes'), fmtMoney(d.tasse)],
            [t('panel.money.upkeep'), fmtMoney(-d.manutenzione)],
            [t('panel.money.business'), fmtMoney(d.business)],
            [t('panel.money.balance'), fmtMoney(d.saldo)],
          ])
        : h('p', {}, t('panel.money.none')),
    );
  }

  private tilePanel(info: TileInfo): HTMLElement {
    const b = info.building;
    if (b?.player) {
      this.panel = { k: 'business' };
      return this.businessPanel();
    }
    const kindKey = !b
      ? 'empty'
      : b.kind === BKind.Res
        ? 'res'
        : b.kind === BKind.Com
          ? 'com'
          : 'ind';
    const rows: [string, string | Node][] = [];
    if (b) {
      if (b.progress < 1) rows.push([t('panel.tile.building'), `${Math.round(b.progress * 100)}%`]);
      rows.push([
        b.kind === BKind.Res ? t('panel.tile.residents') : t('panel.tile.workers'),
        `${b.occ}/${b.capacity}`,
      ]);
      if (b.happiness !== null) rows.push([t('panel.tile.happy'), String(b.happiness)]);
      if (b.kind === BKind.Com) rows.push([t('panel.tile.visits'), String(b.visits)]);
    }
    rows.push([t('panel.tile.land'), `${Math.round(info.landValue * 100)}/100`]);
    return this.panelShell(
      b ? t('panel.tile.level', { n: b.level }) : t(`panel.tile.zone.${info.zone}`),
      t(`panel.tile.title.${kindKey}`),
      this.kv(rows),
      b && b.kind !== BKind.Player ? h('p', {}, t('panel.tile.levelHint')) : null,
    );
  }

  private nextPanel(): HTMLElement {
    const items = this.suggestions();
    const ol = h('ol', { class: 'next-list' });
    for (const k of items.slice(0, 3)) ol.append(h('li', {}, t(k)));
    return this.panelShell(t('hud.next'), t('next.title'), ol);
  }

  /** The three most useful actions right now (Part 13.1). */
  private suggestions(): string[] {
    const s = this.snap;
    const g = this.grid;
    if (!s || !g) return ['next.road'];
    let roads = 0;
    let parks = 0;
    let emptyRes = 0;
    const zones = [0, 0, 0, 0];
    for (let i = 0; i < g.use.length; i++) {
      if (g.use[i] === TileUse.Road && !g.highway[i]) roads++;
      if (g.use[i] === TileUse.Park) parks++;
      if (g.zone[i] !== Zone.None) zones[g.zone[i]]++;
      if (g.zone[i] === Zone.Res && g.use[i] === TileUse.Empty) emptyRes++;
    }
    const out: string[] = [];
    if (roads === 0) out.push('next.road');
    if (zones[Zone.Res] === 0) out.push('next.res');
    if (s.pop > 12 && zones[Zone.Com] === 0) out.push('next.com');
    if (s.demand.i > 0.3 && zones[Zone.Ind] === 0) out.push('next.ind');
    if (s.pop > 40 && parks === 0) out.push('next.park');
    if (s.demand.r > 0.4 && emptyRes < 4 && zones[Zone.Res] > 0) out.push('next.moreRes');
    out.push('next.business', 'next.wait');
    return out;
  }

  // ------------------------------------------------------------- input

  private bindInput(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    c.addEventListener('pointermove', (e) => this.onMove(e));
    c.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('pointercancel', (e) => this.onUp(e));
    c.addEventListener('pointerleave', () => {
      if (!this.drag) {
        this.r.setPreview([], [], this.tool);
        this.costEl.hidden = true;
      }
    });
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.r.rig.zoomBy(Math.exp(e.deltaY * 0.0012));
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.playing) return;
    const tgt = e.target as HTMLElement;
    if (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') {
      e.preventDefault();
      this.send({ type: 'cmd', cmd: { t: e.shiftKey ? 'redo' : 'undo' } });
      return;
    }
    if ((e.ctrlKey || e.metaKey) && k === 'y') {
      e.preventDefault();
      this.send({ type: 'cmd', cmd: { t: 'redo' } });
      return;
    }
    const tools: ToolId[] = ['select', 'road', 'res', 'com', 'ind', 'park', 'bulldoze'];
    if (/^[1-7]$/.test(k)) this.setTool(tools[Number(k) - 1]);
    else if (k === 'q') this.r.rig.snap(-1);
    else if (k === 'e') this.r.rig.snap(1);
    else if (k === ' ') {
      e.preventDefault();
      this.setSpeed(this.speed === 0 ? 1 : 0);
    } else if (k === 'f3') {
      e.preventDefault();
      this.settings.debug = !this.settings.debug;
      this.applySettings();
    } else if (k === 'escape') {
      if (this.panel) this.closePanel();
      else this.setTool('select');
    } else if (
      ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)
    ) {
      const step = this.r.rig.dist * 0.08;
      const yaw = this.r.rig.yaw;
      const fwd: [number, number] = [-Math.sin(yaw), -Math.cos(yaw)];
      const right: [number, number] = [Math.cos(yaw), -Math.sin(yaw)];
      const [dx, dz] =
        k === 'w' || k === 'arrowup'
          ? fwd
          : k === 's' || k === 'arrowdown'
            ? [-fwd[0], -fwd[1]]
            : k === 'd' || k === 'arrowright'
              ? right
              : [-right[0], -right[1]];
      this.r.rig.panBy(dx * step, dz * step);
    }
  }

  private onDown(e: PointerEvent): void {
    if (!this.playing) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      // Two fingers: pan, pinch and twist; any paint in progress is dropped.
      this.paintTiles = [];
      this.r.setPreview([], [], this.tool);
      this.costEl.hidden = true;
      this.drag = { mode: 'gesture', sx: 0, sy: 0, lx: 0, ly: 0, moved: true, startTile: -1 };
      this.readGesture(true);
      return;
    }
    const rotate = e.button === 2 || e.button === 1;
    const mode = rotate ? 'rotate' : this.tool === 'select' ? 'pan' : 'paint';
    const startTile = mode === 'paint' ? this.r.pickTile(e.clientX, e.clientY) : -1;
    this.drag = {
      mode,
      sx: e.clientX,
      sy: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      moved: false,
      startTile,
    };
    this.menuSpin = false;
    if (mode === 'pan') this.canvas.style.cursor = 'grabbing';
    if (mode === 'paint') this.updatePaint(e.clientX, e.clientY);
  }

  private readGesture(reset: boolean): void {
    const [a, b] = [...this.pointers.values()];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if (!reset) {
      const g = this.gesture;
      if (g.dist > 0) this.r.rig.zoomBy(g.dist / dist);
      this.r.rig.rotateBy(-(angle - g.angle), 0);
      this.panPixels(mx - g.mx, my - g.my);
    }
    this.gesture = { dist, angle, mx, my };
  }

  private panPixels(dx: number, dy: number): void {
    const rig = this.r.rig;
    const s = ((rig.dist * 1.0) / Math.max(400, this.canvas.clientHeight)) * 0.5;
    const sy = s / Math.max(0.35, Math.sin(rig.pitch));
    const fwd: [number, number] = [-Math.sin(rig.yaw), -Math.cos(rig.yaw)];
    const right: [number, number] = [Math.cos(rig.yaw), -Math.sin(rig.yaw)];
    rig.panBy(-right[0] * dx * s + fwd[0] * dy * sy, -right[1] * dx * s + fwd[1] * dy * sy);
  }

  private onMove(e: PointerEvent): void {
    if (this.pointers.has(e.pointerId))
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = this.drag;
    if (!this.playing) return;
    if (!d) {
      // Hover: show the single tile under a build tool.
      if (this.tool !== 'select' && e.pointerType === 'mouse')
        this.hoverPreview(e.clientX, e.clientY);
      return;
    }
    if (d.mode === 'gesture') {
      if (this.pointers.size >= 2) this.readGesture(false);
      return;
    }
    const dx = e.clientX - d.lx;
    const dy = e.clientY - d.ly;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 5) d.moved = true;
    d.lx = e.clientX;
    d.ly = e.clientY;
    if (d.mode === 'pan') this.panPixels(dx, dy);
    else if (d.mode === 'rotate') this.r.rig.rotateBy(-dx * 0.006, dy * 0.004);
    else if (d.mode === 'paint') this.updatePaint(e.clientX, e.clientY);
  }

  private onUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    const d = this.drag;
    if (!d) return;
    if (d.mode === 'gesture') {
      if (this.pointers.size === 0) this.drag = null;
      return;
    }
    this.drag = null;
    if (d.mode === 'pan') {
      this.canvas.style.cursor = 'grab';
      if (!d.moved) {
        const tile = this.r.pickTile(e.clientX, e.clientY);
        if (tile >= 0 && this.grid && this.grid.use[tile] === TileUse.Building)
          this.openPanel({ k: 'tile', tile });
        else if (tile >= 0 && this.grid && this.grid.zone[tile] !== Zone.None)
          this.openPanel({ k: 'tile', tile });
        else this.closePanel();
      }
    } else if (d.mode === 'paint') {
      if (this.paintTiles.length && this.tool !== 'select') {
        this.send({ type: 'cmd', cmd: { t: 'paint', tool: this.tool, tiles: this.paintTiles } });
      }
      this.paintTiles = [];
      this.r.setPreview([], [], this.tool);
      this.costEl.hidden = true;
    }
  }

  private tilesBetween(a: number, b: number, tool: Tool): number[] {
    const s = MAP_SIZE;
    const ax = a % s;
    const ay = (a - ax) / s;
    const bx = b % s;
    const by = (b - bx) / s;
    const out: number[] = [];
    if (tool === 'road') {
      // L-shaped road: along the longer axis first, then the shorter one.
      const horizFirst = Math.abs(bx - ax) >= Math.abs(by - ay);
      const cx = horizFirst ? bx : ax;
      const cy = horizFirst ? ay : by;
      const line = (x0: number, y0: number, x1: number, y1: number) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let k = 0; k <= n; k++) {
          const x = x0 + Math.sign(x1 - x0) * k;
          const y = y0 + Math.sign(y1 - y0) * k;
          const tIdx = y * s + x;
          if (out[out.length - 1] !== tIdx) out.push(tIdx);
        }
      };
      line(ax, ay, cx, cy);
      line(cx, cy, bx, by);
    } else {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++)
        for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) out.push(y * s + x);
    }
    return out;
  }

  private costOf(tool: Tool, tiles: number[]): { valid: boolean[]; cost: number; n: number } {
    const g = this.grid!;
    const player = this.snap?.business.tile ?? -1;
    let cost = 0;
    let n = 0;
    const valid = tiles.map((ti) => {
      const c = tileCost(tool, {
        use: g.use[ti],
        zone: g.zone[ti],
        terrain: g.terrain[ti],
        highway: g.highway[ti] === 1,
        playerLot: ti === player,
      });
      if (c >= 0) {
        cost += c;
        n++;
      }
      return c >= 0;
    });
    return { valid, cost, n };
  }

  private showCost(x: number, y: number, n: number, cost: number): void {
    this.costEl.hidden = false;
    this.costEl.style.left = `${x}px`;
    this.costEl.style.top = `${y}px`;
    const broke = (this.snap?.money ?? 0) < cost;
    this.costEl.classList.toggle('bad', n === 0 || broke);
    this.costEl.textContent = n === 0 ? t('tool.invalid') : t('tool.cost', { n, c: fmtNum(cost) });
  }

  private hoverPreview(x: number, y: number): void {
    if (!this.grid || this.tool === 'select') return;
    const tile = this.r.pickTile(x, y);
    if (tile < 0) {
      this.r.setPreview([], [], this.tool);
      this.costEl.hidden = true;
      return;
    }
    const { valid, cost, n } = this.costOf(this.tool, [tile]);
    this.r.setPreview([tile], valid, this.tool);
    this.showCost(x, y, n, cost);
  }

  private updatePaint(x: number, y: number): void {
    const d = this.drag;
    if (!d || !this.grid || this.tool === 'select' || d.startTile < 0) return;
    const end = this.r.pickTile(x, y);
    if (end < 0) return;
    const tiles = this.tilesBetween(d.startTile, end, this.tool);
    const { valid, cost, n } = this.costOf(this.tool, tiles);
    this.paintTiles = tiles.filter((_, k) => valid[k]);
    this.r.setPreview(tiles, valid, this.tool);
    this.showCost(x, y, n, cost);
  }

  // ------------------------------------------------------------- test hooks

  /** Used by the screenshot script (tools/shoot.mjs) to drive a reproducible city. */
  testHook() {
    return {
      start: (seed: number, archetype: string) => {
        const overlay = this.root.querySelector<HTMLElement>('.start');
        const a = ARCHETYPES.find((x) => x.id === archetype) ?? ARCHETYPES[0];
        if (overlay) this.begin(seed, a, overlay);
      },
      layout: () => {
        if (!this.snap) return;
        for (const cmd of referenceCommands({ size: MAP_SIZE, business: this.snap.business }))
          this.send({ type: 'cmd', cmd });
      },
      speed: (s: number) => this.setSpeed(s),
      snap: () =>
        this.snap
          ? {
              day: this.snap.day,
              tod: this.snap.timeOfDay,
              pop: this.snap.pop,
              money: this.snap.money,
            }
          : null,
      camera: (x: number, z: number, dist: number, yawDeg: number) => {
        this.r.rig.flyTo(x, z, dist);
        this.r.rig.rotateBy((yawDeg * Math.PI) / 180 - this.r.rig.yaw, 0);
      },
      panel: (k: 'business' | 'happy' | 'next' | 'money') => this.openPanel({ k }),
      closePanel: () => this.closePanel(),
      debug: (on: boolean) => {
        this.settings.debug = on;
        this.applySettings();
      },
      businessTile: () => this.snap?.business.tile ?? -1,
      tileCenter: (tile: number) => this.r.tileCenter(tile),
    };
  }

  // ------------------------------------------------------------- start screen

  private async showStart(): Promise<void> {
    const saved = await loadGame();
    let seed = Math.floor(Math.random() * 1e6);
    const area = h('textarea', {
      id: 'biz',
      placeholder: t('start.placeholder'),
      maxlength: 200,
      rows: 2,
    }) as HTMLTextAreaElement;
    const chips = h('div', { class: 'chips' }, h('span', {}, t('start.examples')));
    for (const s of SUGGERIMENTI)
      chips.append(
        h('button', { type: 'button', onclick: () => ((area.value = s), area.focus()) }, s),
      );
    const seedInput = h('input', {
      id: 'seed',
      type: 'number',
      value: seed,
      min: 0,
      inputmode: 'numeric',
    }) as HTMLInputElement;
    const form = h('form', { class: 'start-card glass' });
    const step1 = () => {
      clear(form);
      form.append(
        h('div', { class: 'start-kicker' }, t('start.kicker')),
        h('h1', {}, 'City ', h('em', {}, 'Lab')),
        h('p', { class: 'lead' }, t('start.lead')),
        h('label', { for: 'biz' }, t('start.label')),
        area,
        chips,
        h(
          'div',
          { class: 'start-actions' },
          h('button', { class: 'btn primary', type: 'submit' }, t('start.go')),
          saved
            ? h(
                'button',
                {
                  class: 'btn',
                  type: 'button',
                  onclick: () => void this.resume(saved.data, overlay),
                },
                t('start.continue'),
              )
            : null,
          h('label', { class: 'seed', for: 'seed' }, t('start.seed'), seedInput),
        ),
      );
      area.focus({ preventScroll: true });
    };
    const step2 = (a: Archetype) => {
      clear(form);
      const band = bandFor(a.investimento);
      form.append(
        h('div', { class: 'start-kicker' }, t('start.card.title')),
        h(
          'div',
          { class: 'easel' },
          h('h3', {}, a.nome),
          this.kv([
            [t('start.card.sector'), a.settore],
            [t('start.card.investment'), fmtMoney(a.investimento)],
            [t('start.card.band'), band.nome],
            [t('start.card.payback'), this.days(band.rientroGiorni)],
            [t('start.card.jobs'), String(a.posti)],
            [t('start.card.ticket'), fmtMoney(a.scontrino)],
            [t('start.card.margin'), `${Math.round(a.margine * 100)}%`],
            [t('start.card.hours'), `${a.orari[0]}:00–${a.orari[1]}:00`],
          ]),
          h('p', { class: 'lead', style: 'font-size:12.5px' }, t('start.card.note')),
        ),
        h(
          'div',
          { class: 'start-actions' },
          h(
            'button',
            { class: 'btn primary', type: 'button', onclick: () => this.begin(seed, a, overlay) },
            t('start.card.open'),
          ),
          h('button', { class: 'btn', type: 'button', onclick: step1 }, t('start.card.back')),
        ),
      );
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      seed = Math.abs(Math.floor(Number(seedInput.value) || 0));
      step2(classify(area.value || 'bottega'));
    });
    const overlay = h('div', { class: 'start' }, form);
    this.root.append(overlay);
    step1();
  }

  private enterGame(overlay: HTMLElement): void {
    overlay.remove();
    this.playing = true;
    this.menuSpin = false;
    this.hud.hidden = false;
    this.toolsEl.hidden = false;
    this.feedEl.hidden = false;
    (this.root.querySelector('#disclaimer') as HTMLElement).hidden = false;
    this.canvas.style.cursor = 'grab';
    this.canvas.focus({ preventScroll: true });
  }

  private begin(seed: number, a: Archetype, overlay: HTMLElement): void {
    this.lastSnapAt = 0;
    this.send({ type: 'new', seed, archetype: a.id });
    this.setSpeed(1);
    this.enterGame(overlay);
    const wait = () => {
      if (!this.snap || this.snap.business.archetipo !== a.id) return void setTimeout(wait, 30);
      const [x, z] = this.r.tileCenter(this.snap.business.tile);
      this.r.rig.flyTo(x + 4, z, 34);
      this.openPanel({ k: 'next' });
      this.setTool('road');
    };
    wait();
  }

  private async resume(data: SaveData, overlay: HTMLElement): Promise<void> {
    this.send({ type: 'load', save: data });
    this.setSpeed(1);
    this.enterGame(overlay);
    this.toast(t('evt.loaded'));
    setTimeout(() => {
      if (!this.snap) return;
      const [x, z] = this.r.tileCenter(this.snap.business.tile);
      this.r.rig.flyTo(x + 4, z, 40);
    }, 100);
  }

  // ------------------------------------------------------------- saves & settings

  private async save(show: boolean): Promise<SaveData | null> {
    const m = await this.request<Extract<FromWorker, { type: 'saved' }>>({
      type: 'save',
      requestId: ++this.requestId,
    });
    const ok = await saveGame(m.save);
    if (show && ok) this.toast(t('evt.saved'));
    return m.save;
  }

  private toast(text: string): void {
    const el = h('div', { class: 'toast glass', role: 'status' }, text);
    this.root.append(el);
    setTimeout(() => el.remove(), 2200);
  }

  private applySettings(): void {
    setLocale(this.settings.locale);
    this.r.setQuality(this.settings.quality);
    this.r.configurePost(this.settings.tiltShift, this.settings.ao);
    this.r.rig.reducedMotion = this.settings.reducedMotion;
    if (this.debugEl) this.debugEl.hidden = !this.settings.debug;
    storeSettings(this.settings);
  }

  private openSettings(): void {
    const s = this.settings;
    const seg = <T extends string>(
      values: T[],
      current: T,
      label: (v: T) => string,
      on: (v: T) => void,
    ) => {
      const wrap = h('div', { class: 'seg', role: 'group' });
      for (const v of values) {
        wrap.append(
          h(
            'button',
            {
              type: 'button',
              'aria-pressed': String(v === current),
              onclick: (e: Event) => {
                wrap
                  .querySelectorAll('button')
                  .forEach((b) => b.setAttribute('aria-pressed', 'false'));
                (e.currentTarget as HTMLElement).setAttribute('aria-pressed', 'true');
                on(v);
              },
            },
            label(v),
          ),
        );
      }
      return wrap;
    };
    const check = (id: string, label: string, value: boolean, on: (v: boolean) => void) =>
      h(
        'label',
        { class: 'check', for: id },
        h('input', {
          id,
          type: 'checkbox',
          checked: value,
          onchange: (e: Event) => on((e.target as HTMLInputElement).checked),
        }),
        label,
      );
    const fileInput = h('input', {
      type: 'file',
      accept: '.json,application/json',
      hidden: true,
      id: 'import-file',
    }) as HTMLInputElement;
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      try {
        const data = importSave(await f.text());
        this.send({ type: 'load', save: data });
        this.toast(t('evt.loaded'));
        modal.remove();
      } catch (err) {
        this.toast(err instanceof Error ? err.message : String(err));
      }
    });
    const quality = Object.keys(PRESETS) as QualityPreset[];
    const modal = h(
      'div',
      { class: 'modal', onclick: (e: Event) => e.target === modal && modal.remove() },
      h(
        'section',
        {
          class: 'panel glass',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t('settings.title'),
        },
        h(
          'header',
          {},
          h('h2', {}, t('settings.title')),
          h(
            'button',
            { class: 'x', 'aria-label': t('panel.close'), onclick: () => modal.remove() },
            '×',
          ),
        ),
        h('p', { class: 'eyebrow' }, t('settings.quality')),
        seg(
          quality,
          s.quality,
          (q) => t(`settings.q.${q}`),
          (q) => {
            s.quality = q;
            s.ao = null;
            this.applySettings();
          },
        ),
        check('opt-tilt', t('settings.tilt'), s.tiltShift, (v) => {
          s.tiltShift = v;
          this.applySettings();
        }),
        check('opt-ao', t('settings.ao'), s.ao ?? PRESETS[s.quality].ao, (v) => {
          s.ao = v;
          this.applySettings();
        }),
        check('opt-motion', t('settings.motion'), s.reducedMotion, (v) => {
          s.reducedMotion = v;
          this.applySettings();
        }),
        check('opt-debug', t('settings.debug'), s.debug, (v) => {
          s.debug = v;
          this.applySettings();
        }),
        h('p', { class: 'eyebrow' }, t('settings.lang')),
        seg<Locale>(
          ['it', 'en'],
          getLocale(),
          (l) => (l === 'it' ? 'Italiano' : 'English'),
          (l) => {
            s.locale = l;
            this.applySettings();
            location.reload();
          },
        ),
        h(
          'div',
          { class: 'row' },
          h(
            'button',
            { class: 'btn', type: 'button', onclick: () => void this.save(true) },
            t('settings.save'),
          ),
          h(
            'button',
            { class: 'btn', type: 'button', onclick: () => void this.exportFile() },
            t('settings.export'),
          ),
          h(
            'button',
            { class: 'btn', type: 'button', onclick: () => fileInput.click() },
            t('settings.import'),
          ),
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              onclick: () => (modal.remove(), void this.takePhoto()),
            },
            svg(ICONS.camera),
            t('settings.photo'),
          ),
          h(
            'button',
            { class: 'btn', type: 'button', onclick: () => location.reload() },
            t('settings.new'),
          ),
          fileInput,
        ),
      ),
    );
    this.root.append(modal);
  }

  private async exportFile(): Promise<void> {
    const data = await this.save(false);
    if (!data) return;
    const blob = new Blob([exportSave(data)], { type: 'application/json' });
    const a = h('a', {
      href: URL.createObjectURL(blob),
      download: `city-lab-${data.seed}-giorno-${Math.floor(data.tick / (24 * TICKS_PER_HOUR)) + 1}.json`,
    });
    a.click();
  }

  private async takePhoto(): Promise<void> {
    const status = h('p', {}, t('photo.rendering'));
    const body = h('div', {}, status);
    const modal = h(
      'div',
      { class: 'modal photo', onclick: (e: Event) => e.target === modal && modal.remove() },
      h(
        'section',
        { class: 'panel glass', role: 'dialog', 'aria-label': t('photo.title') },
        h(
          'header',
          {},
          h('h2', {}, t('photo.title')),
          h(
            'button',
            { class: 'x', 'aria-label': t('panel.close'), onclick: () => modal.remove() },
            '×',
          ),
        ),
        body,
      ),
    );
    this.root.append(modal);
    await new Promise((r) => setTimeout(r, 30));
    const blob = await this.r.photo(3840, 2160, this.snap?.timeOfDay ?? 0);
    const url = URL.createObjectURL(blob);
    clear(body);
    body.append(
      h('img', { src: url, alt: 'Foto del plastico a 3840 per 2160 pixel' }),
      h(
        'div',
        { class: 'row', style: 'margin-top:10px;align-items:center' },
        h(
          'a',
          { class: 'btn primary', href: url, download: 'city-lab-4k.png' },
          t('photo.download'),
        ),
        h('p', {}, t('photo.hint')),
      ),
    );
  }

  private updateDebug(): void {
    const s = this.snap;
    let moving = 0;
    if (s) for (let i = 0; i < s.people.length; i += 2) if (!Number.isNaN(s.people[i])) moving++;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    this.debugEl.textContent = [
      `${t('debug.fps')}     ${this.fps.toFixed(0)}`,
      `${t('debug.frame')}   ${this.frameMs.toFixed(1)} ms`,
      `${t('debug.tick')}    ${s ? s.tickMs.toFixed(2) : '—'} ms`,
      `${t('debug.people')} ${moving}/${s?.pop ?? 0}`,
      `${t('debug.draws')} ${this.r.drawCalls}`,
      `${t('debug.res')} ${Math.round(this.r.renderScale * 100)}%`,
      mem ? `${t('debug.mem')} ${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private crash(message: string): void {
    console.error(message);
    if (this.root.querySelector('.modal.error')) return;
    void (this.playing ? this.save(false) : Promise.resolve(null)).catch(() => null);
    const modal = h(
      'div',
      { class: 'modal error' },
      h(
        'section',
        { class: 'panel glass', role: 'alertdialog' },
        h('h2', {}, t('error.title')),
        h('p', {}, t('error.body')),
        h('pre', { style: 'white-space:pre-wrap;font-size:11px;margin:0' }, message),
        h(
          'div',
          { class: 'row' },
          h(
            'button',
            { class: 'btn', onclick: () => void this.exportFile() },
            t('settings.export'),
          ),
          h(
            'button',
            { class: 'btn primary', onclick: () => location.reload() },
            t('error.reload'),
          ),
        ),
      ),
    );
    this.root.append(modal);
  }
}
