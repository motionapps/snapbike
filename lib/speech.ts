import { Platform } from 'react-native';

/**
 * Webbläsarens inbyggda taligenkänning (Web Speech API) som fallback när
 * ingen OpenAI-nyckel finns för Whisper. Fungerar bara på webben och bäst
 * i Chrome/Edge (svenska stöds); Firefox saknar stödet.
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

/**
 * Startar taligenkänning. `onPhrase` (valfri) anropas för varje färdig fras
 * medan man pratar – används för live-avbockning i besiktningen.
 */
export function startWebSpeech(onPhrase?: (phrase: string) => void): void {
  const Ctor = recognitionCtor();
  if (!Ctor) throw new Error('Taligenkänning stöds inte i den här webbläsaren.');

  collected = '';
  lastError = '';
  lastFinalIndex = -1;
  recognition = new Ctor();
  recognition.lang = 'sv-SE';
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    // Börja vid första ändrade resultatet, annars 0. Bearbeta varje färdig
    // fras EN gång (event.results växer och skickas om vid varje event).
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
  recognition.onerror = (event) => {
    lastError = event.error;
  };
  recognition.start();
}

export function stopWebSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!recognition) {
      reject(new Error('Ingen pågående inspelning.'));
      return;
    }
    const active = recognition;
    active.onend = () => {
      recognition = null;
      if (lastError && lastError !== 'no-speech' && !collected.trim()) {
        reject(new Error(`Taligenkänning misslyckades (${lastError}).`));
      } else {
        resolve(collected.trim());
      }
    };
    active.stop();
  });
}
