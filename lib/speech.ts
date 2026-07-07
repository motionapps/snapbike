import { Platform } from 'react-native';

/**
 * Webbläsarens inbyggda taligenkänning (Web Speech API) som fallback när
 * ingen OpenAI-nyckel finns för Whisper. Fungerar bara på webben och bäst
 * i Chrome/Edge (svenska stöds); Firefox saknar stödet.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
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

export function startWebSpeech(): void {
  const Ctor = recognitionCtor();
  if (!Ctor) throw new Error('Taligenkänning stöds inte i den här webbläsaren.');

  collected = '';
  lastError = '';
  recognition = new Ctor();
  recognition.lang = 'sv-SE';
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) collected += `${result[0].transcript} `;
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
