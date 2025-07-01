// API key is now set by the user in the settings modal and stored in localStorage
const UPLOAD_URL = 'https://api.assemblyai.com/v2/upload';
const TRANSCRIPT_URL = 'https://api.assemblyai.com/v2/transcript';

const dropArea = document.getElementById('drop-area');
const fileElem = document.getElementById('fileElem');
const fileSelect = document.getElementById('fileSelect');
const spinner = document.getElementById('spinner');
const transcriptSection = document.getElementById('transcript-section');
const transcriptBox = document.getElementById('transcript');
const copyBtn = document.getElementById('copyBtn');
const statusMessage = document.getElementById('status-message');

// Settings modal logic
const settingsLink = document.getElementById('settings-link');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const apiKeyInput = document.getElementById('api-key-input');

// Theme switching logic
const themeRadios = document.querySelectorAll('input[name="theme"]');
const htmlEl = document.documentElement;
function applyTheme(theme) {
  if (theme === 'light') {
    htmlEl.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    htmlEl.setAttribute('data-theme', 'dark');
  } else {
    htmlEl.removeAttribute('data-theme');
  }
}
function getSavedTheme() {
  return localStorage.getItem('mini_transcriber_theme') || 'device';
}
function setSavedTheme(theme) {
  localStorage.setItem('mini_transcriber_theme', theme);
}
function updateThemeRadios() {
  const saved = getSavedTheme();
  themeRadios.forEach(r => { r.checked = (r.value === saved); });
}
themeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    applyTheme(radio.value);
    setSavedTheme(radio.value);
  });
});
// On load, apply saved theme
applyTheme(getSavedTheme());
// On modal open, update radios
settingsLink.addEventListener('click', () => {
  updateThemeRadios();
});

if (apiKeyInput) {
  apiKeyInput.value = localStorage.getItem('assemblyai_api_key') || '';
  apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('assemblyai_api_key', apiKeyInput.value.trim());
  });
  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      settingsModal.style.display = 'none';
    }
  });
}
settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  settingsModal.style.display = 'flex';
  apiKeyInput.value = localStorage.getItem('assemblyai_api_key') || '';
  apiKeyInput.focus();
});
closeSettings.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.style.display = 'none';
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const API_KEY = localStorage.getItem('assemblyai_api_key') || '';
  if (!API_KEY) {
    settingsModal.style.display = 'flex';
    apiKeyInput.focus();
  }
});

function showSpinner(show) {
  spinner.style.display = show ? 'block' : 'none';
  statusMessage.style.display = show ? 'block' : 'none';
}
function showTranscriptSection(show) {
  transcriptSection.style.display = show ? 'block' : 'none';
}
function showError(msg) {
  alert(msg);
}
function setStatus(msg) {
  statusMessage.textContent = msg;
}

// Drag & Drop
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
  });
});
dropArea.addEventListener('drop', e => {
  const files = e.dataTransfer.files;
  if (files.length) handleFile(files[0]);
});
fileSelect.addEventListener('click', () => fileElem.click());
fileElem.addEventListener('change', () => {
  if (fileElem.files.length) handleFile(fileElem.files[0]);
});

let currentUploadXhr = null;
const cancelUploadBtn = document.getElementById('cancel-upload');

async function handleFile(file) {
  const API_KEY = localStorage.getItem('assemblyai_api_key') || '';
  if (!API_KEY) {
    showError('Please set your AssemblyAI API key in Settings.');
    return;
  }
  showTranscriptSection(false);
  showSpinner(true);
  setStatus('Uploading file… 0%');
  cancelUploadBtn.style.display = 'block';
  let cancelled = false;
  try {
    // 1. Upload file to AssemblyAI with progress
    const uploadUrl = UPLOAD_URL;
    const xhr = new XMLHttpRequest();
    currentUploadXhr = xhr;
    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('authorization', API_KEY);
    const uploadPromise = new Promise((resolve, reject) => {
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setStatus(`Uploading file… ${percent}%`);
        }
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = function () {
        reject(new Error('Upload failed'));
      };
      cancelUploadBtn.onclick = function () {
        cancelled = true;
        xhr.abort();
        showSpinner(false);
        cancelUploadBtn.style.display = 'none';
        setStatus('Upload cancelled.');
      };
    });
    xhr.send(file);
    const { upload_url } = await uploadPromise;
    if (cancelled) return;
    cancelUploadBtn.style.display = 'none';
    setStatus('Requesting transcription…');

    // 2. Request transcription
    const transcriptRes = await fetch(TRANSCRIPT_URL, {
      method: 'POST',
      headers: {
        'authorization': API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ audio_url: upload_url })
    });
    if (!transcriptRes.ok) throw new Error('Transcription request failed');
    setStatus('Transcribing audio…');
    const { id } = await transcriptRes.json();

    // 3. Poll for completion
    let completed = false;
    let transcriptText = '';
    while (!completed) {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch(`${TRANSCRIPT_URL}/${id}`, {
        headers: { 'authorization': API_KEY }
      });
      if (!pollRes.ok) throw new Error('Polling failed');
      const data = await pollRes.json();
      if (data.status === 'completed') {
        completed = true;
        transcriptText = data.text;
      } else if (data.status === 'failed') {
        throw new Error('Transcription failed');
      }
    }
    setStatus('Transcription complete!');
    // 4. Show transcript
    const formattedTranscript = transcriptText
      .split(/([.!?])\s+/)
      .reduce((acc, part, idx, arr) => {
        if (/[.!?]/.test(part) && idx > 0) {
          acc[acc.length - 1] += part;
        } else if (part.trim()) {
          acc.push(part.trim());
        }
        return acc;
      }, [])
      .map(sentence => `<p>${sentence}</p>`)
      .join('');
    transcriptBox.innerHTML = formattedTranscript;
    showTranscriptSection(true);
    copyBtn.addEventListener('click', () => {
      // Copy all transcript text as plain text
      const text = transcriptBox.textContent;
      navigator.clipboard.writeText(text);
      // Replace button label with 'Copied!' temporarily
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.disabled = true;
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.disabled = false;
      }, 1500);
    });
    statusMessage.style.display = 'none';
  } catch (err) {
    showError(err.message);
    setStatus('An error occurred.');
    cancelUploadBtn.style.display = 'none';
  } finally {
    showSpinner(false);
    currentUploadXhr = null;
  }
} 