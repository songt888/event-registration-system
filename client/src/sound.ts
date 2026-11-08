// Y2K interface sounds, synthesized with Web Audio (no audio files). On by default, but they only ever play in
// response to the user's own action, which browsers allow; the taskbar toggle mutes them and the choice is remembered.
const KEY = 'sound';
let ctx: AudioContext | null = null;
let on = (() => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
})();

export const soundOn = () => on;

export function setSound(value: boolean) {
  on = value;
  try {
    localStorage.setItem(KEY, value ? 'on' : 'off');
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  if (value) play('chime');
}

export type Kind =
  | 'click' // glossy button press
  | 'tick' // link or taskbar task
  | 'key' // typing in a field
  | 'whirr' // pointer over a CD
  | 'open' // a window opens
  | 'minimize'
  | 'maximize'
  | 'close'
  | 'chime' // success
  | 'error'
  | 'burn' // registration: the disc spins up, then "burn complete"
  | 'startup' // signed in
  | 'shutdown'; // logged out

// one note: frequency (optionally gliding to freqEnd), start offset, length, waveform, volume
type Note = { f: number; to?: number; at?: number; len: number; type?: OscillatorType; vol?: number };

const SOUNDS: Record<Kind, Note[]> = {
  click: [{ f: 1100, len: 0.07, type: 'triangle', vol: 0.22 }],
  tick: [{ f: 1900, len: 0.035, type: 'sine', vol: 0.16 }],
  key: [{ f: 2600, len: 0.02, type: 'square', vol: 0.035 }],
  whirr: [{ f: 220, to: 660, len: 0.28, type: 'sawtooth', vol: 0.045 }],
  open: [{ f: 420, to: 980, len: 0.16, type: 'sine', vol: 0.18 }],
  minimize: [{ f: 900, to: 260, len: 0.22, type: 'sine', vol: 0.2 }],
  maximize: [{ f: 300, to: 1200, len: 0.2, type: 'triangle', vol: 0.18 }],
  close: [{ f: 640, to: 180, len: 0.12, type: 'square', vol: 0.09 }],
  chime: [{ f: 880, len: 0.25, vol: 0.3 }, { f: 1320, at: 0.09, len: 0.25, vol: 0.3 }],
  error: [{ f: 180, len: 0.25, type: 'sawtooth', vol: 0.2 }, { f: 150, at: 0.12, len: 0.25, type: 'sawtooth', vol: 0.16 }],
  burn: [
    { f: 120, to: 1400, len: 1.1, type: 'sawtooth', vol: 0.06 },
    { f: 1046, at: 1.1, len: 0.22, vol: 0.28 },
    { f: 1318, at: 1.2, len: 0.22, vol: 0.28 },
    { f: 1568, at: 1.3, len: 0.35, vol: 0.28 },
  ],
  startup: [
    { f: 523, len: 0.4, type: 'triangle', vol: 0.2 },
    { f: 659, at: 0.12, len: 0.4, type: 'triangle', vol: 0.2 },
    { f: 784, at: 0.24, len: 0.4, type: 'triangle', vol: 0.2 },
    { f: 1046, at: 0.36, len: 0.6, type: 'sine', vol: 0.24 },
  ],
  shutdown: [
    { f: 784, len: 0.3, type: 'triangle', vol: 0.2 },
    { f: 659, at: 0.14, len: 0.3, type: 'triangle', vol: 0.2 },
    { f: 523, at: 0.28, len: 0.3, type: 'triangle', vol: 0.2 },
    { f: 392, at: 0.42, len: 0.55, type: 'sine', vol: 0.22 },
  ],
};

const last: Partial<Record<Kind, number>> = {};

export function play(kind: Kind) {
  if (!on) return;
  // keys and the CD whirr can fire very often: throttle them so they stay a texture, not noise
  const now = performance.now();
  const gap = kind === 'key' ? 45 : kind === 'whirr' ? 350 : 0;
  if (gap && now - (last[kind] ?? 0) < gap) return;
  last[kind] = now;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    for (const n of SOUNDS[kind]) {
      const t = ctx.currentTime + (n.at ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.setValueAtTime(n.f, t);
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t + n.len);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(n.vol ?? 0.2, t + 0.008); // tiny attack: no click artefact
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.len + 0.03);
    }
  } catch {
    /* no audio support: stay silent */
  }
}

// Global listeners: buttons click, links tick, fields type, CDs whirr; success and error messages get their own sound.
// A control can name its own sound with data-sound="..." (window buttons, Register).
export function installSounds() {
  addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element).closest('[data-sound], button, a');
      if (!el) return;
      const own = el.getAttribute('data-sound') as Kind | null;
      if (own) return; // the control plays its own sound
      play(el.tagName === 'A' ? 'tick' : 'click');
    },
    true,
  );
  addEventListener('keydown', (e) => {
    const el = e.target as Element;
    if (el.matches('input, textarea') && e.key.length === 1) play('key');
  });
  addEventListener('pointerover', (e) => {
    const el = (e.target as Element).closest('.cd-case');
    if (el && !el.contains(e.relatedTarget as Node)) play('whirr');
  });
  new MutationObserver((records) => {
    for (const r of records)
      for (const n of r.addedNodes)
        if (n instanceof Element) {
          if (n.matches('[data-sound-skip]')) continue;
          if (n.matches('[role="status"]') || n.querySelector('[role="status"]')) play('chime');
          else if (n.matches('[role="alert"]') || n.querySelector('[role="alert"]')) play('error');
        }
  }).observe(document.body, { childList: true, subtree: true });
}
