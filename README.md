# Avanevis (آوانویس)

**Persian speech to text, right in your browser.**

Avanevis is a simple, privacy-focused web app that turns spoken Persian into editable, copyable text. It works on phones and computers without an account or a transcription server.

## Features

- **Record and transcribe:** Record your voice, tap **Stop**, and wait for the transcription. Recording is not transcribed live.
- **Transcribe a file:** Choose an MP3 or WAV file and get the Persian text.
- **Copy your text:** Review or edit the result, then copy it with one tap.
- **Choose your model:** Download a model when you first use the app. Later, open **Settings** to switch models, download another, or delete downloaded models.

## Using Avanevis

1. Open the app in your browser.
2. If no usable model is stored, select one and let it download. The first download requires an internet connection and enough free space.
3. Select **Record** to capture your voice, then **Stop** to start transcription; or select an **MP3/WAV file**.
4. Copy the resulting text.

On later visits, Avanevis tries to reuse your downloaded model. You can manage models at any time in **Settings**.

## On iPhone and Android

Open Avanevis in a supported mobile browser. On iPhone, you can use Safari’s **Share → Add to Home Screen** to launch it like an app. Allow microphone access if you want to record speech.

Model files are stored in the browser’s own storage—not in a folder you have to choose. Your phone may remove them if storage is low or site data is cleared, in which case you’ll need to download a model again. Larger models may be slow or fail to load on memory-limited devices; performance depends on your phone and browser.

## Privacy and connectivity

Speech recognition runs **on your device**. The app does not intentionally upload your recordings or transcripts or keep a saved history. Downloaded models are stored locally; your current audio and text are only kept for the active session.

Models are downloaded from public **Hugging Face** repositories without requiring a sign-in. Internet access is needed for the initial download and may be needed for uncached app components. Once the required files are cached, the app may work offline, subject to browser storage and compatibility.

## Important notes

- **Language:** Persian (Farsi).
- **Models:** Includes a Persian-tuned Whisper Base option alongside larger Whisper models. A larger model is not always faster or better on every device.
- **Compatibility:** Designed for desktop and mobile browsers; large-model performance and reliability, particularly on iPhone Safari, are not guaranteed.
- **Storage:** Removing a downloaded model in Settings frees its cached model files; it does not delete anything from your phone outside the app’s browser storage.

**Current version: 0.5**
