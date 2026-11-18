export const TARGET_RATE = 16000;

export function mergeAudio(parts) {
  const length = parts.reduce((n, part) => n + part.length, 0);
  const output = new Float32Array(length);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

export function resampleLinear(data, originalRate, targetRate = TARGET_RATE) {
  if (!Number.isFinite(originalRate) || originalRate <= 0) throw new Error('Sample rate نامعتبر است.');
  if (originalRate === targetRate) return new Float32Array(data);
  const newLength = Math.max(1, Math.round(data.length * targetRate / originalRate));
  const output = new Float32Array(newLength);
  const ratio = originalRate / targetRate;
  for (let i = 0; i < newLength; i++) {
    const index = i * ratio;
    const left = Math.floor(index);
    const right = Math.min(data.length - 1, left + 1);
    const fraction = index - left;
    output[i] = (data[left] || 0) * (1 - fraction) + (data[right] || 0) * fraction;
  }
  return output;
}

export function audioToMono(buffer) {
  const count = buffer.numberOfChannels;
  const mono = new Float32Array(buffer.length);
  for (let ch = 0; ch < count; ch++) {
    const source = buffer.getChannelData(ch);
    for (let i = 0; i < mono.length; i++) mono[i] += source[i] / count;
  }
  return mono;
}

export function hasVoice(audio, threshold = 0.007) {
  if (!audio.length) return false;
  let sum = 0;
  for (let i = 0; i < audio.length; i += 4) sum += audio[i] * audio[i];
  return Math.sqrt(sum / Math.ceil(audio.length / 4)) >= threshold;
}

export function splitIntoChunks(samples, seconds = 25, sampleRate = TARGET_RATE) {
  const length = Math.round(seconds * sampleRate);
  const out = [];
  for (let i = 0; i < samples.length; i += length) out.push(samples.slice(i, i + length));
  return out;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
