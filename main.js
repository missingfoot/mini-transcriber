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
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');

// Settings modal logic
const settingsLink = document.getElementById('settings-link');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const apiKeyInput = document.getElementById('api-key-input');

// Theme switching logic
const themeRadios = document.querySelectorAll('input[name="theme"]');
const htmlEl = document.documentElement;
function applyTheme(theme) {
  if (theme === 'device') {
    const setDeviceTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlEl.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    };
    setDeviceTheme();
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setDeviceTheme);
  } else {
    htmlEl.setAttribute('data-theme', theme);
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
  if (show) fileInfo.style.display = 'none'; // Only hide file info when spinner is shown
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

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showFileInfo(file) {
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileInfo.style.display = 'block';
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
const playerContainer = document.getElementById('player-container');
let currentPlayerUrl = null;
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    // Hide file info
    fileInfo.style.display = 'none';
    // Hide player
    playerContainer.innerHTML = '';
    playerContainer.style.display = 'none';
    // Hide transcript
    showTranscriptSection(false);
    // Hide status message
    statusMessage.style.display = 'none';
    // Hide cancel button
    cancelUploadBtn.style.display = 'none';
    // Reset file input
    fileElem.value = '';
    // Reset copy button
    copyBtn.textContent = 'Copy';
    copyBtn.disabled = false;
    // Revoke any object URL
    if (currentPlayerUrl) {
      URL.revokeObjectURL(currentPlayerUrl);
      currentPlayerUrl = null;
    }
    // Clear localStorage
    clearSessionData();
  });
}

// Set up copy button event listener ONCE
copyBtn.addEventListener('click', () => {
  // Copy all transcript sentences as plain text, separated by double line breaks
  const paragraphs = Array.from(transcriptBox.querySelectorAll('p'));
  const text = paragraphs.map(p => p.textContent).join('\n\n');
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

// --- Persistence helpers ---
function saveSessionData(file, transcriptText) {
  localStorage.setItem('mini_transcriber_file', JSON.stringify({
    name: file.name,
    size: file.size,
    type: file.type
  }));
  localStorage.setItem('mini_transcriber_transcript', transcriptText);
}
function clearSessionData() {
  localStorage.removeItem('mini_transcriber_file');
  localStorage.removeItem('mini_transcriber_transcript');
}
function getSessionData() {
  const file = localStorage.getItem('mini_transcriber_file');
  const transcript = localStorage.getItem('mini_transcriber_transcript');
  return {
    file: file ? JSON.parse(file) : null,
    transcript: transcript || null
  };
}

// --- On page load, restore session if present ---
function restoreSession() {
  const session = getSessionData();
  if (session.file && session.transcript) {
    // Show file info
    fileName.textContent = session.file.name;
    fileSize.textContent = formatFileSize(session.file.size);
    fileInfo.style.display = 'block';
    // Show transcript
    let formattedTranscript = '';
    if (!session.transcript.trim()) {
      formattedTranscript = '<p style="color:#888;">The file supplied did not contain any speech.</p>';
    } else {
      formattedTranscript = session.transcript
        .split(/([.!?])(?=\s|$)/)
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
    }
    transcriptBox.innerHTML = formattedTranscript;
    showTranscriptSection(true);
    statusMessage.style.display = 'none';
    playerContainer.style.display = 'none'; // Can't restore file for playback
    copyBtn.textContent = 'Copy';
    copyBtn.disabled = false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const API_KEY = localStorage.getItem('assemblyai_api_key') || '';
  if (!API_KEY) {
    settingsModal.style.display = 'flex';
    apiKeyInput.focus();
  }
  restoreSession();
});

// --- In handleFile, clear UI and localStorage before processing new file ---
async function handleFile(file) {
  const API_KEY = localStorage.getItem('assemblyai_api_key') || '';
  if (!API_KEY) {
    showError('Please set your AssemblyAI API key in Settings.');
    return;
  }
  // Clear all UI and localStorage before new upload
  transcriptBox.innerHTML = '';
  fileInfo.style.display = 'none';
  showTranscriptSection(false);
  playerContainer.innerHTML = '';
  playerContainer.style.display = 'none';
  statusMessage.style.display = 'none';
  clearSessionData();
  showSpinner(true);
  setStatus('Uploading file… 0%');
  cancelUploadBtn.style.display = 'block';
  // Always hide player at start
  if (currentPlayerUrl) {
    URL.revokeObjectURL(currentPlayerUrl);
    currentPlayerUrl = null;
  }
  playerContainer.innerHTML = '';
  playerContainer.style.display = 'none';
  // Reset copy button state for new file
  copyBtn.textContent = 'Copy';
  copyBtn.disabled = false;
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
      body: JSON.stringify({ audio_url: upload_url, language_detection: true })
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
    let formattedTranscript = '';
    if (!transcriptText || !transcriptText.trim()) {
      formattedTranscript = '<p style="color:#888;">The file supplied did not contain any speech.</p>';
    } else {
      formattedTranscript = transcriptText
        .split(/([.!?])(?=\s|$)/)
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
    }
    transcriptBox.innerHTML = formattedTranscript;
    // Show file info now, just before player
    showFileInfo(file);
    // Save session data
    saveSessionData(file, transcriptText);
    // Show player only now
    // Check if it's an audio/video file by type or extension
    const ext = file.name.split('.').pop().toLowerCase();
    const isAudioVideo = file.type.startsWith('audio/') || file.type.startsWith('video/') || 
                        ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'opus', 'flac', 'amr', 'wma', 'aiff', 'alac', 'mp4', 'mov', 'webm', 'ogv', 'avi', 'wmv', 'mkv'].includes(ext);
    
    if (file && isAudioVideo) {
      // iOS detection
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      // Check file extension for known unsupported formats on iOS
      const unsupportedFormats = ['ogg', 'opus', 'flac', 'amr', 'wma', 'aiff', 'alac', 'ogv', 'avi', 'wmv', 'mkv'];
      
      if (isIOS && unsupportedFormats.includes(ext)) {
        // Show unsupported message only on iOS
        playerContainer.innerHTML = '<div class="unsupported-message">Preview unavailable: This file type is not supported on your device.</div>';
        playerContainer.style.display = 'block';
      } else {
        // Try to create player as usual
        const url = currentPlayerUrl || URL.createObjectURL(file);
        currentPlayerUrl = url;
        let playerEl;
        if (file.type.startsWith('video/')) {
          // Create a wrapper for the video to limit height but allow controls to be full width
          const wrapper = document.createElement('div');
          wrapper.style.width = '100%';
          wrapper.style.maxHeight = '240px';
          wrapper.style.backgroundColor = 'black';
          wrapper.style.overflow = 'hidden';
          playerEl = document.createElement('video');
          playerEl.controls = true;
          playerEl.style.width = '100%';
          playerEl.style.display = 'block';
          playerEl.style.objectFit = 'contain';
          playerEl.style.maxHeight = '240px';
          playerEl.setAttribute('playsinline', '');
          playerEl.setAttribute('webkit-playsinline', '');
          playerEl.src = url;
          playerEl.id = 'media-player';
          wrapper.appendChild(playerEl);
          playerContainer.innerHTML = '';
          playerContainer.appendChild(wrapper);
          playerContainer.style.display = 'block';
        } else {
          playerEl = document.createElement('audio');
          playerEl.controls = true;
          playerEl.style.width = '100%';
          playerEl.src = url;
          playerEl.id = 'media-player';
          playerContainer.innerHTML = '';
          playerContainer.appendChild(playerEl);
          playerContainer.style.display = 'block';
        }
      }
    }
    showTranscriptSection(true);
    statusMessage.style.display = 'none';
  } catch (err) {
    showError(err.message);
    setStatus('An error occurred.');
    cancelUploadBtn.style.display = 'none';
    playerContainer.style.display = 'none';
  } finally {
    showSpinner(false);
    currentUploadXhr = null;
  }
} 