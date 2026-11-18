// Conservative safeguards: avoid displaying obviously corrupt non-Persian output.
// These checks are not replacements for verifying the actual inference engine.
export function audioMetrics(audio) {
  if (!audio?.length) return { rms: 0, peak: 0, clipped: 0, duration: 0 };
  let power = 0, peak = 0, clipped = 0;
  for (let i = 0; i < audio.length; i++) {
    const sample = audio[i];
    power += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
    if (Math.abs(sample) >= .995) clipped++;
  }
  return { rms: Math.sqrt(power/audio.length), peak, clipped: clipped/audio.length, duration: audio.length/16000 };
}
export function inspectTranscript(raw) {
  const text = String(raw || '').trim();
  if (!text) return { ok: true, text: '', reason: 'empty' };
  if (text.length > 12000) return { ok: false, text: '', reason: 'excessive' };
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  // Reject clearly unrelated Latin-heavy output for a Persian-only app.
  if (latin >= 24 && arabic < latin * 0.28) return { ok: false, text: '', reason: 'wrong-language' };
  // A repeated substring often indicates runaway Whisper hallucinations.
  if (/(.{3,32})\1{5,}/u.test(text)) return { ok: false, text: '', reason: 'repetition' };
  if (/(\S{3,30})\s+\1(?:\s+\1){4,}/u.test(text)) return { ok: false, text: '', reason: 'repetition' };
  return { ok: true, text, reason: 'valid' };
}
export function shouldProcessAudio(audio) {
  const { rms, peak, clipped, duration } = audioMetrics(audio);
  if (!Number.isFinite(rms) || !Number.isFinite(peak)) return { ok: false, reason: 'invalid' };
  if (duration < .35) return { ok: false, reason: 'too-short' };
  if (rms < 0.003 || peak < 0.015) return { ok: false, reason: 'silence' };
  if (clipped > .1) return { ok: false, reason: 'clipping' };
  return { ok: true, reason: 'valid' };
}
