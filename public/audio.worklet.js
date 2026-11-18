class PCMStreamProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.n = 0; }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) {
      const buffer = new Float32Array(input.length);
      buffer.set(input);
      this.port.postMessage(buffer, [buffer.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-stream-processor', PCMStreamProcessor);
