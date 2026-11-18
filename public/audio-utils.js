export const TARGET_RATE = 16000;

export function mergeAudio(parts) {
  const length = parts.reduce((n, part) => n + part.length, 0);
  const output = new Float32Array(length);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

// Band-limited windowed-sinc downsampling avoids folding high-frequency noise
// into the 16 kHz Whisper input. Retain the historical export name for callers.
export function resampleLinear(data, originalRate, targetRate = TARGET_RATE) {
  if (!Number.isFinite(originalRate) || originalRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0)
    throw new Error('Sample rate نامعتبر است.');
  if (originalRate === targetRate) return new Float32Array(data);
  if (!data.length) return new Float32Array(0);
  const length = Math.max(1, Math.round(data.length * targetRate / originalRate));
  const output = new Float32Array(length);
  const ratio = originalRate / targetRate;
  if (ratio <= 1) {
    for (let i = 0; i < length; i++) {
      const at = i * ratio, left = Math.floor(at), right = Math.min(data.length - 1, left + 1);
      output[i] = (data[left] || 0) * (1 - (at - left)) + (data[right] || 0) * (at - left);
    }
    return output;
  }
  const cutoff = .48 / ratio;
  const radius = Math.max(16, Math.ceil(12 * ratio));
  for (let i = 0; i < length; i++) {
    const center = i * ratio;
    let sum = 0, weights = 0;
    for (let j = Math.max(0, Math.ceil(center - radius)); j <= Math.min(data.length - 1, Math.floor(center + radius)); j++) {
      const delta = j - center;
      const x = 2 * Math.PI * cutoff * delta;
      const sinc = Math.abs(x) < 1e-8 ? 1 : Math.sin(x) / x;
      const window = .5 + .5 * Math.cos(Math.PI * delta / radius);
      const w = 2 * cutoff * sinc * window;
      sum += data[j] * w;
      weights += w;
    }
    output[i] = weights ? sum / weights : 0;
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
