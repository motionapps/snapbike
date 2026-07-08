import { Platform } from 'react-native';

/**
 * Webbläsarens inbyggda taligenkänning (Web Speech API) som fallback när
 * ingen OpenAI-nyckel finns för Whisper. Fungerar bara på webben och bäst
 * i Chrome/Edge (svenska stöds); Firefox och iOS Safari saknar stödet.
 */

type SpeechEvent = {
  resultIndex?: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (Platform.OS !== 'web') return null;
  const w = globalThis as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export const webSpeechAvailable = recognitionCtor() !== null;

let recognition: SpeechRecognitionLike | null = null;
let collected = '';
let lastError = '';
let lastFinalIndex = -1;
let manualStop = false;

/**
 * Startar taligenkänning. `onPhrase` (valfri) anropas för varje färdig fras
 * medan man pratar – används för live-avbockning i besiktningen.
 *
 * Web Speech avslutar sig själv efter en tystnad; för att kunna prata en hel
 * genomgång startar vi om passet automatiskt (onend) så länge man inte har
 * tryckt stopp. Utan detta tappas resten av inspelningen OCH ett redan
 * avslutat pass ger inget onend vid stopp → hängning.
 */
export function startWebSpeech(onPhrase?: (phrase: string) => void): void {
  const Ctor = recognitionCtor();
  if (!Ctor) throw new Error('Taligenkänning stöds inte i den här webbläsaren.');

  collected = '';
  lastError = '';
  lastFinalIndex = -1;
  manualStop = false;

  const rec = new Ctor();
  recognition = rec;
  rec.lang = 'sv-SE';
  rec.continuous = true;
  rec.interimResults = false;
  rec.onresult = (event) => {
    const start = event.resultIndex ?? 0;
    for (let i = start; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal && i > lastFinalIndex) {
        lastFinalIndex = i;
        const phrase = result[0].transcript.trim();
        if (phrase) {
          collected += `${phrase} `;
          onPhrase?.(phrase);
        }
      }
    }
  };
  rec.onerror = (event) => {
    // 'no-speech'/'aborted' är normalt mellan fraser – behåll passet.
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      lastError = event.error;
    }
  };
  rec.onend = () => {
    // Auto-avslut under inspelning → starta om så vi fortsätter lyssna.
    if (!manualStop && recognition === rec) {
      lastFinalIndex = -1;
      try {
        rec.start();
      } catch {
        // Kan inte startas om (t.ex. borttagen behörighet) – låt det vara.
      }
    }
  };
  rec.start();
}

/**
 * Stoppar och returnerar hela transkriptet. Löser sig på onend ELLER efter en
 * kort timeout (om passet redan avslutats och inget onend kommer) så att det
 * aldrig kan hänga i "Transkriberar…".
 */
export function stopWebSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!recognition) {
      reject(new Error('Ingen pågående inspelning.'));
      return;
    }
    const active = recognition;
    recognition = null;
    manualStop = true;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (lastError && !collected.trim()) {
        reject(new Error(`Taligenkänning misslyckades (${lastError}).`));
      } else {
        resolve(collected.trim());
      }
    };

    active.onend = finish;
    // Säkerhetsnät: om passet redan var avslutat kommer inget onend.
    const timer = setTimeout(finish, 1500);
    try {
      active.stop();
    } catch {
      finish();
    }
  });
}
