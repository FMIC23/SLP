import type { ScriptLine } from '../core/types';

/** Síntesis de voz (Web Speech API) para reproducir guiones con varias voces. */
export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

const FEMALE = /female|woman|libby|sonia|hazel|susan|kate|serena|martha|stephanie|fiona|moira|tessa|karen|samantha|victoria|zira|aria|jenny|emma|amy|olivia|mia|natasha/i;
const MALE = /male|man|ryan|george|daniel|arthur|oliver|thomas|rishi|alex|fred|david|guy|brian|james|liam|william|christopher|eric/i;

export function englishVoices(): SpeechSynthesisVoice[] {
  if (!ttsAvailable()) return [];
  return speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
}

export function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = englishVoices();
    if (v.length) return resolve(v);
    if (!ttsAvailable()) return resolve([]);
    const done = () => resolve(englishVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

/** Elige voces: prefiere británicas, alterna género según el hablante. */
export function pickVoices(speakers: string[], genders: Record<string, 'male' | 'female'> = {}, preferred?: string): Map<string, SpeechSynthesisVoice | undefined> {
  const all = englishVoices();
  const gb = all.filter((v) => /en[-_]GB/i.test(v.lang));
  const pool = gb.length >= 2 ? [...gb, ...all.filter((v) => !gb.includes(v))] : all;
  const fem = pool.filter((v) => FEMALE.test(v.name) && !/\bmale\b/i.test(v.name.replace(/female/i, '')));
  const mal = pool.filter((v) => MALE.test(v.name) && !FEMALE.test(v.name));
  const map = new Map<string, SpeechSynthesisVoice | undefined>();
  let fi = 0;
  let mi = 0;
  let oi = 0;
  speakers.forEach((s, i) => {
    const g = genders[s] ?? (i % 2 === 0 ? 'female' : 'male');
    let v: SpeechSynthesisVoice | undefined;
    if (i === 0 && preferred) v = pool.find((x) => x.name === preferred);
    if (!v) v = g === 'female' ? fem[fi++ % Math.max(fem.length, 1)] : mal[mi++ % Math.max(mal.length, 1)];
    if (!v) v = pool[oi++ % Math.max(pool.length, 1)];
    map.set(s, v);
  });
  return map;
}

export interface ScriptPlayer {
  play(): void;
  pause(): void;
  stop(): void;
  setRate(r: number): void;
  onLine?: (i: number) => void;
  onEnd?: () => void;
}

export function scriptPlayer(script: ScriptLine[], genders: Record<string, 'male' | 'female'> = {}, rate = 1, preferredVoice?: string): ScriptPlayer {
  const speakers = [...new Set(script.map((l) => l.speaker))];
  let voices = pickVoices(speakers, genders, preferredVoice);
  let idx = 0;
  let playing = false;
  let r = rate;
  const pitchFor = (s: string) => {
    const k = speakers.indexOf(s);
    return 1 + ((k % 3) - 1) * 0.08; // ligera variación si solo hay una voz
  };
  const p: ScriptPlayer = {
    play() {
      if (!ttsAvailable()) return;
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
        playing = true;
        return;
      }
      if (!englishVoices().length) voices = pickVoices(speakers, genders, preferredVoice);
      playing = true;
      speakNext();
    },
    pause() {
      speechSynthesis.pause();
      playing = false;
    },
    stop() {
      playing = false;
      idx = 0;
      speechSynthesis.cancel();
    },
    setRate(v: number) {
      r = v;
    },
  };
  function speakNext() {
    if (!playing) return;
    if (idx >= script.length) {
      playing = false;
      idx = 0;
      p.onEnd?.();
      return;
    }
    const line = script[idx];
    const u = new SpeechSynthesisUtterance(line.text);
    const v = voices.get(line.speaker);
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-GB';
    u.rate = r;
    u.pitch = pitchFor(line.speaker);
    p.onLine?.(idx);
    u.onend = () => {
      idx++;
      setTimeout(speakNext, 350);
    };
    u.onerror = () => {
      idx++;
      setTimeout(speakNext, 50);
    };
    speechSynthesis.speak(u);
  }
  return p;
}
