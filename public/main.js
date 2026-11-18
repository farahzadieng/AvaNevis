import { MODELS } from './model-registry.js';
import { getInstalled, markInstalled, removeModels } from './model-cache.js';
import { TARGET_RATE, mergeAudio, resampleLinear, audioToMono, hasVoice, splitIntoChunks, formatTime } from './audio-utils.js';

const $ = (id) => document.getElementById(id);
const state = {
  worker: null, ready: false, loading: false, modelId: null, selectedModel: 'turbo-q8',
  mode: 'live', recording: false, audioContext: null, mediaStream: null, audioSource: null,
  processor: null, silenceSink: null, liveFrames: [], liveLength: 0, startedAt: 0,
  liveTimer: null, flushTimer: null, selectedFile: null, queue: [], processing: false,
  jobCounter: 0, session: 0, currentJob: null, totalChunks: 0, finishedChunks: 0, removing: false
};
let toastTimer;
const PERSIAN_NUM = new Intl.NumberFormat('fa-IR');

function notify(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4600);
}
function setProcessing(text, active = false) {
  $('processingState').innerHTML = `<span class="processing-dot" style="background:${active ? '#b0a6df' : '#a8bd9e'}"></span>`;
  $('processingState').append(document.createTextNode(text));
}
function modelLabel() { return MODELS.find(m => m.id === state.modelId)?.name || 'مدل آماده نیست'; }
function updateIndicator() {
  $('modelIndicator').classList.toggle('ready', state.ready);
  $('modelIndicatorText').textContent = state.ready ? modelLabel() : 'مدل آماده نیست';
  $('recordButton').disabled = !state.ready || state.loading;
  $('transcribeFile').disabled = !state.ready || !state.selectedFile || state.loading || state.processing || state.recording;
}
function setText(text) {
  $('transcript').value = text;
  updateWordCount();
}
function appendText(value) {
  const current = $('transcript').value.trim();
  const next = value.trim();
  if (!next) return;
  setText([current, next].filter(Boolean).join(' '));
  $('transcript').scrollTop = $('transcript').scrollHeight;
}
function updateWordCount() {
  const words = $('transcript').value.trim().split(/\s+/u).filter(Boolean).length;
  $('wordCount').textContent = `${PERSIAN_NUM.format(words)} واژه`;
  $('copyButton').disabled = words === 0;
}
function setMode(mode) {
  if (state.recording || state.processing) { notify('ابتدا عملیات جاری را متوقف یا تمام کنید.'); return; }
  state.mode = mode;
  const live = mode === 'live';
  $('liveTab').classList.toggle('active', live); $('fileTab').classList.toggle('active', !live);
  $('liveTab').setAttribute('aria-selected', String(live)); $('fileTab').setAttribute('aria-selected', String(!live));
  $('liveMode').classList.toggle('hidden', !live); $('fileMode').classList.toggle('hidden', live);
  $('resultHint').textContent = live ? 'جمله‌ها به‌تدریج در این بخش ظاهر می‌شوند.' : 'متن استخراج‌شده از فایل در این بخش ظاهر می‌شود.';
}
function showModels() {
  if (state.recording || state.processing || state.loading || state.removing) { notify('در زمان پردازش یا دانلود نمی‌توان تنظیمات را تغییر داد.'); return; }
  renderModels();
  $('modelOverlay').classList.remove('hidden');
  $('closeModal').classList.toggle('hidden', !state.ready);
}
function closeModels() { if (state.ready && !state.loading && !state.removing) $('modelOverlay').classList.add('hidden'); }
function renderModels() {
  const installed = getInstalled();
  $('modelGrid').innerHTML = MODELS.map(m => {
    const active = state.ready && state.modelId === m.id;
    const saved = !!installed[m.id];
    return `<article class="model-card ${m.recommended ? 'highlight' : ''} ${active ? 'is-active' : ''}">
      <div class="model-card-top"><span class="model-card-icon">${m.id === 'large' ? '✦' : m.id === 'turbo-fp16' ? '◈' : '✳'}</span>${m.recommended ? '<span class="tag">پیشنهادی</span>' : ''}</div>
      <h3>${m.name}</h3><span class="model-card-subtitle">${m.subtitle}</span><p>${m.description}</p>
      <span class="model-state ${saved ? '' : 'not-installed'}">${active ? '● مدل فعال' : saved ? '✓ قبلاً دانلود شده' : 'دانلود نشده'}</span>
      <div class="model-card-bottom"><span class="model-size">${m.size}</span></div>
      <div class="model-action-row"><button class="choose-model" data-model="${m.id}" ${active ? 'disabled' : ''}>${active ? 'فعال' : saved ? 'استفاده از مدل' : 'دانلود و فعال‌سازی'}</button>
      ${saved ? `<button class="delete-model" data-delete="${m.id}" aria-label="پاک کردن ${m.name}">حذف مدل</button>` : ''}</div></article>`;
  }).join('');
}
async function deleteModels(ids) {
  if (state.removing || state.loading || state.recording || state.processing || state.queue.length) {
    notify('ابتدا عملیات فعلی را تمام کنید.'); return;
  }
  const all = ids.length === MODELS.length;
  const names = ids.map(id => MODELS.find(m => m.id === id)?.name).filter(Boolean).join('، ');
  if (!confirm(all ? 'همه مدل‌های دانلودشده از حافظه مرورگر پاک شوند؟' : `مدل ${names} از حافظه مرورگر پاک شود؟`)) return;
  state.removing = true; toggleModelButtons(true);
  try {
    if (ids.includes(state.modelId)) {
      // Release in-memory model BEFORE deleting backing cache.
      if (state.worker) { state.worker.terminate(); state.worker = null; }
      state.modelId = null; state.ready = false; state.loading = false;
      updateIndicator();
    }
    const summary = await removeModels(ids);
    if (ids.includes(localStorage.getItem('avanevis-last-model'))) localStorage.removeItem('avanevis-last-model');
    notify(`مدل پاک شد (${PERSIAN_NUM.format(summary.deleted)} فایل از کش).`);
  } catch(e) { notify('حذف مدل ناموفق بود: ' + (e?.message || e)); }
  finally { state.removing = false; renderModels(); updateIndicator(); }
}
function createWorker() {
  if (state.worker) return;
  state.worker = new Worker('/inference.worker.js', { type: 'module' });
  state.worker.addEventListener('message', onWorkerMessage);
  state.worker.addEventListener('error', (e) => {
    state.loading = false; state.processing = false; state.ready = false;
    renderModels(); toggleModelButtons(false);
    $('downloadMessage').textContent = 'موتور اجرا با خطا مواجه شد.';
    notify('بارگذاری موتور انجام نشد. اتصال اینترنت و سازگاری مرورگر را بررسی کنید.');
    updateIndicator();
    console.error(e);
  });
}
function toggleModelButtons(disabled) { document.querySelectorAll('.choose-model').forEach(b => { b.disabled = disabled; }); }
function loadModel(id) {
  if (state.loading || state.recording || state.processing) return;
  state.loading = true; state.ready = false; state.selectedModel = id;
  $('downloadBox').classList.remove('hidden');
  $('downloadMessage').textContent = 'آماده‌سازی موتور هوش مصنوعی…';
  $('downloadPercent').textContent = '—'; $('downloadFile').textContent = '';
  $('downloadBar').style.width = '0%';
  toggleModelButtons(true); updateIndicator(); createWorker();
  state.worker.postMessage({ type: 'load', modelId: id, preferredDevice: navigator.gpu ? 'webgpu' : 'wasm' });
}
function onWorkerMessage({ data }) {
  switch (data.type) {
    case 'status': $('downloadMessage').textContent = data.text; break;
    case 'device':
      if (data.device === 'wasm') notify('WebGPU در دسترس نیست؛ پردازش CPU ممکن است بسیار کند باشد.');
      break;
    case 'progress': {
      const name = data.file || '';
      $('downloadFile').textContent = name;
      const percent = data.progress !== null ? data.progress : data.total ? 100 * data.loaded / data.total : null;
      if (percent !== null && Number.isFinite(percent)) {
        $('downloadBar').style.width = `${Math.max(0, Math.min(100, percent))}%`;
        $('downloadPercent').textContent = `${Math.round(percent)}%`;
      }
      if (data.status === 'done') $('downloadMessage').textContent = 'فایل دریافت شد؛ در حال آماده‌سازی…';
      break;
    }
    case 'ready':
      state.ready = true; state.loading = false; state.modelId = data.modelId;
      localStorage.setItem('avanevis-last-model', data.modelId); markInstalled(data.modelId);
      toggleModelButtons(false); updateIndicator(); renderModels();
      $('downloadBox').classList.add('hidden'); $('modelOverlay').classList.add('hidden');
      notify('مدل آماده است؛ پردازش فقط روی دستگاه شما انجام می‌شود.');
      break;
    case 'error':
      state.loading = false; state.ready = false;
      toggleModelButtons(false); updateIndicator(); renderModels();
      $('downloadMessage').textContent = 'بارگذاری مدل ناموفق بود؛ مدل دیگر یا مرورگر دیگری را امتحان کنید.';
      notify(data.message);
      break;
    case 'result': finishJob(data, null); break;
    case 'job-error': finishJob(data, data.message); break;
  }
}
function enqueue(audio, type = 'file', session = state.session) {
  if (!audio.length) return;
  state.queue.push({ id: ++state.jobCounter, audio, type, session });
  processQueue();
}
function processQueue() {
  if (state.processing || !state.queue.length || !state.ready) return;
  const job = state.queue.shift();
  if (job.session !== state.session) return processQueue();
  state.processing = true; state.currentJob = job;
  setProcessing(job.type === 'live' ? 'در حال تبدیل گفتار…' : `در حال تبدیل قطعه ${PERSIAN_NUM.format(state.finishedChunks + 1)} از ${PERSIAN_NUM.format(state.totalChunks)}…`, true);
  updateIndicator();
  state.worker.postMessage({ type: 'transcribe', id: job.id, audio: job.audio.buffer }, [job.audio.buffer]);
}
function finishJob(data, error) {
  if (!state.currentJob || data.id !== state.currentJob.id) return;
  const job = state.currentJob;
  state.currentJob = null; state.processing = false;
  if (job.session === state.session) {
    if (error) notify('خطا در تبدیل صوت: ' + error);
    else appendText(data.text || '');
    if (job.type === 'file') state.finishedChunks++;
  }
  if (state.queue.length) processQueue();
  else {
    setProcessing(state.recording ? 'در حال گوش دادن…' : 'آماده');
    if (!state.recording && job.type === 'file') notify('پردازش فایل به پایان رسید.');
  }
  updateIndicator();
}
async function beginRecording() {
  if (!state.ready) { showModels(); return; }
  if (state.processing || state.queue.length) { notify('پردازش قبلی هنوز تمام نشده است.'); return; }
  if (!navigator.mediaDevices?.getUserMedia) { notify('مرورگر به میکروفون دسترسی ندارد. از HTTPS استفاده کنید.'); return; }
  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }, video: false });
    const AC = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AC();
    await state.audioContext.resume();
    await state.audioContext.audioWorklet.addModule('/audio.worklet.js');
    state.audioSource = state.audioContext.createMediaStreamSource(state.mediaStream);
    state.processor = new AudioWorkletNode(state.audioContext, 'pcm-stream-processor');
    state.silenceSink = state.audioContext.createGain(); state.silenceSink.gain.value = 0;
    state.audioSource.connect(state.processor); state.processor.connect(state.silenceSink); state.silenceSink.connect(state.audioContext.destination);
    state.liveFrames = []; state.liveLength = 0; state.startedAt = Date.now();
    state.recording = true; state.session++;
    const recordingSession = state.session;
    state.processor.port.onmessage = ({ data }) => {
      if (!state.recording || recordingSession !== state.session) return;
      state.liveFrames.push(data); state.liveLength += data.length;
    };
    $('liveMode').classList.add('recording');
    $('recordTitle').textContent = 'در حال شنیدن صدای شما…';
    $('recordSubtitle').textContent = 'با یک بار لمس دوباره میکروفون، ضبط پایان می‌یابد.';
    $('recordButton').setAttribute('aria-label', 'توقف ضبط');
    $('recordTimer').hidden = false;
    state.liveTimer = setInterval(() => $('recordTimer').textContent = formatTime((Date.now() - state.startedAt) / 1000), 350);
    state.flushTimer = setInterval(() => flushLive(false), 5500);
    setProcessing('در حال گوش دادن…', true);
  } catch (e) {
    notify('دسترسی به میکروفون انجام نشد: ' + (e?.message || e));
    await stopRecording(true);
  }
}
function flushLive(force) {
  if (!state.liveLength) return;
  const input = mergeAudio(state.liveFrames);
  state.liveFrames = []; state.liveLength = 0;
  const audio = resampleLinear(input, state.audioContext?.sampleRate || 48000);
  if (audio.length < TARGET_RATE * .45 || !hasVoice(audio)) return;
  // Limit backlog on slower mobile devices. Keep no more than two queued sections.
  if (!force && state.queue.filter(j => j.type === 'live').length >= 2) {
    notify('پردازش از سرعت گفتار عقب افتاده است؛ بخشی از صدا برای جلوگیری از فشار به دستگاه رد شد.');
    return;
  }
  enqueue(audio, 'live');
}
async function stopRecording(discard = false) {
  if (!state.recording && !state.mediaStream && !state.audioContext) return;
  clearInterval(state.flushTimer); clearInterval(state.liveTimer);
  if (!discard && state.recording) flushLive(true);
  state.recording = false;
  state.processor?.disconnect(); state.audioSource?.disconnect(); state.silenceSink?.disconnect();
  state.mediaStream?.getTracks().forEach(t => t.stop());
  try { await state.audioContext?.close(); } catch {}
  state.audioContext = null; state.mediaStream = null; state.processor = null; state.audioSource = null; state.silenceSink = null;
  state.liveFrames = []; state.liveLength = 0;
  $('liveMode').classList.remove('recording');
  $('recordTitle').textContent = 'برای شروع، روی میکروفون بزن';
  $('recordSubtitle').textContent = 'متن صحبت‌هایت همین‌جا، هم‌زمان با پردازش ظاهر می‌شود.';
  $('recordButton').setAttribute('aria-label', 'شروع ضبط');
  $('recordTimer').hidden = true;
  if (!state.processing && !state.queue.length) setProcessing('آماده');
}
function selectFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  if (!(/\.(mp3|wav)$/.test(name) || /^(audio\/mpeg|audio\/wav|audio\/x-wav|audio\/wave)$/.test(file.type))) { notify('فقط MP3 و WAV پشتیبانی می‌شوند.'); return; }
  state.selectedFile = file;
  $('selectedFile').classList.remove('hidden');
  $('selectedFileName').textContent = file.name;
  $('selectedFileSize').textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  updateIndicator();
}
async function transcribeFile() {
  if (!state.ready || !state.selectedFile || state.processing || state.queue.length) return;
  const file = state.selectedFile;
  let ctx;
  $('transcribeFile').disabled = true;
  try {
    setProcessing('در حال خواندن و آماده‌سازی فایل…', true);
    const binary = await file.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    const decoded = await ctx.decodeAudioData(binary);
    const mono = audioToMono(decoded);
    const audio = resampleLinear(mono, decoded.sampleRate);
    const chunks = splitIntoChunks(audio, 25);
    state.totalChunks = chunks.length; state.finishedChunks = 0; state.session++;
    if (!chunks.length) { notify('فایل صوتی خالی است.'); return; }
    for (const part of chunks) enqueue(part, 'file');
  } catch (e) {
    notify('خواندن فایل ناموفق بود: ' + (e?.message || e));
    setProcessing('آماده');
  } finally {
    try { await ctx?.close(); } catch {}
    updateIndicator();
  }
}
async function copyText() {
  const text = $('transcript').value.trim(); if (!text) return;
  try { await navigator.clipboard.writeText(text); notify('متن کپی شد.'); }
  catch { $('transcript').focus(); $('transcript').select(); const result = document.execCommand('copy'); notify(result ? 'متن کپی شد.' : 'متن را انتخاب و به‌صورت دستی کپی کنید.'); }
}
function bootstrap() {
  renderModels();
  $('modelOverlay').classList.remove('hidden');
  $('closeModal').classList.add('hidden');
  $('closeModal').addEventListener('click', closeModels);
  $('changeModel').addEventListener('click', showModels);
  $('modelGrid').addEventListener('click', e => {
    const choose = e.target.closest('[data-model]');
    const remove = e.target.closest('[data-delete]');
    if (choose) loadModel(choose.dataset.model);
    if (remove) deleteModels([remove.dataset.delete]);
  });
  $('removeAllModels').addEventListener('click', () => deleteModels(MODELS.map(m => m.id)));
  $('liveTab').addEventListener('click', () => setMode('live'));
  $('fileTab').addEventListener('click', () => setMode('file'));
  $('recordButton').addEventListener('click', () => state.recording ? stopRecording() : beginRecording());
  $('audioFile').addEventListener('change', e => selectFile(e.target.files[0]));
  $('clearFile').addEventListener('click', () => { state.selectedFile = null; $('audioFile').value = ''; $('selectedFile').classList.add('hidden'); updateIndicator(); });
  $('transcribeFile').addEventListener('click', transcribeFile);
  $('copyButton').addEventListener('click', copyText);
  $('clearText').addEventListener('click', () => { setText(''); notify('متن پاک شد.'); });
  $('transcript').addEventListener('input', updateWordCount);
  const dz = $('dropzone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); selectFile(e.dataTransfer?.files?.[0]); });
  updateIndicator();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  // Do not autoplay massive downloads. The user must explicitly choose a model.
  if (!navigator.gpu) $('downloadMessage').textContent = 'WebGPU در دسترس نیست؛ حالت CPU بسیار کندتر است.';
}
bootstrap();
