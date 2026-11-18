// ONNX weights come from public Hugging Face repositories. No API tokens are used.
export const MODELS = Object.freeze([
  {
    id: 'large',
    name: 'Whisper Large v3',
    subtitle: 'حداکثر دقت',
    description: 'برای سیستم‌های قدرتمند و متن‌هایی که دقت اولویت نخست است.',
    size: 'حدود ۳٫۱ گیگابایت',
    model: 'onnx-community/whisper-large-v3-ONNX',
    dtype: { encoder_model: 'fp16', decoder_model_merged: 'fp16' },
    recommended: false,
    desktopOnly: true
  },
  {
    id: 'turbo-fp16',
    name: 'Whisper Turbo FP16',
    subtitle: 'متعادل و دقیق',
    description: 'نسخه سریع‌تر Large با دقت مناسب برای فارسی.',
    size: 'حدود ۱٫۶ گیگابایت',
    model: 'onnx-community/whisper-large-v3-turbo',
    dtype: { encoder_model: 'fp16', decoder_model_merged: 'fp16' },
    recommended: false,
    desktopOnly: false
  },
  {
    id: 'turbo-q8',
    name: 'Whisper Turbo Q8',
    subtitle: 'سبک‌تر و سریع‌تر برای دانلود',
    description: 'نسخه ۸بیتی Turbo؛ سرعت نهایی وابسته به مرورگر و دستگاه است.',
    size: 'حدود ۱٫۱ گیگابایت',
    model: 'onnx-community/whisper-large-v3-turbo',
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    recommended: true,
    desktopOnly: false
  }
]);
export function getModel(id) { return MODELS.find(x => x.id === id) || null; }
