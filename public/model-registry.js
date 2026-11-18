// ONNX weights come from public Hugging Face repositories. No API tokens are used.
export const MODELS = Object.freeze([
  {
    id: 'persian-base',
    name: 'Whisper Base فارسی',
    subtitle: 'سبک و آموزش‌دیده برای فارسی',
    description: 'مدل Base که مخصوص گفتار فارسی آموزش تکمیلی دیده؛ برای موبایل و دسکتاپ. کیفیت نهایی به صدا بستگی دارد.',
    size: 'حدود ۱۵۰ تا ۳۰۰ مگابایت (بسته به فایل‌ها)',
    model: 'armantee/whisper-base-persian-onnx',
    dtype: 'q8',
    recommended: true,
    desktopOnly: false
  },
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
    subtitle: 'کم‌حجم‌تر (INT8)' ,
    description: 'نسخه ۸بیتی Turbo؛ سرعت نهایی وابسته به مرورگر و دستگاه است.',
    size: 'حدود ۱٫۱ گیگابایت',
    model: 'onnx-community/whisper-large-v3-turbo',
    dtype: { encoder_model: 'int8', decoder_model_merged: 'int8' },
    recommended: false,
    desktopOnly: false
  }
]);
export function getModel(id) { return MODELS.find(x => x.id === id) || null; }
