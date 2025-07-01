# Mini Transcriber

A simple, modern web app for transcribing audio and video files using AssemblyAI's powerful speech-to-text API.

## Features
- Drag & drop or select audio/video files for transcription
- Super-accurate AI transcription (AssemblyAI)
- Clean, responsive UI with light/dark/device theme support
- Copy transcript with one click
- User-friendly settings modal for API key and theme
- No backend required—fully static, easy to deploy (Netlify, Vercel, GitHub Pages, etc.)

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/missingfoot/mini-transcriber.git
cd mini-transcriber
```

### 2. Deploy or Open Locally
- **Open `index.html` directly in your browser** (for local use)
- **Or deploy to Netlify, Vercel, or GitHub Pages** (just upload the files)

## AssemblyAI API Key
This app requires your own [AssemblyAI](https://www.assemblyai.com/) API key to function. This keeps your usage private and secure.

### How to Get an API Key
1. Go to [AssemblyAI](https://www.assemblyai.com/) and sign up for a free account.
2. After logging in, go to your dashboard and copy your API key.
3. Open the Mini Transcriber app. The settings modal will prompt you to paste your API key. You can also access it anytime via the "Settings" link in the top right.
4. Your API key is stored only in your browser (localStorage).

## Usage
1. Open the app in your browser.
2. Drag & drop or select an audio/video file.
3. Wait for the spinner and progress messages.
4. When done, view and copy your transcript!

## Theme
- Choose between Device, Light, or Dark mode in Settings.

## Deployment
- **Netlify**: Drag and drop the folder or connect your repo.
- **Vercel**: Import the repo and deploy as a static site.
- **GitHub Pages**: Push to your repo and enable Pages in settings.

## License
MIT 