// Default initial fallback tracks dataset
let TRACKS_DATA = [];

// Audio & Video Media Elements
const audioElement = document.getElementById('mainAudio');
const videoElement = document.getElementById('mainVideo');
const videoPlaceholder = document.getElementById('videoPlaceholder');

// State Variables
let currentTrack = null;
let currentActiveElement = null; // Either audioElement or videoElement
let isPlaying = false;
let isLooping = false;
let masterVolume = 1.0;
let isMuted = false;
let currentSpeed = 1.0;
let fadeInterval = null;
let starredTracks = new Set(JSON.parse(localStorage.getItem('natak_starred_tracks') || '[]'));
let currentFilter = 'all'; // 'all', 'audio', 'video', 'starred'
let searchQuery = '';
let currentView = 'grid'; // 'grid' or 'list'

// Web Audio API Visualizer Setup
let audioCtx = null;
let analyser = null;
let audioSource = null;
let videoSource = null;
const canvas = document.getElementById('visualizerCanvas');
const canvasCtx = canvas ? canvas.getContext('2d') : null;

function initAudioContext() {
  if (audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;

    audioSource = audioCtx.createMediaElementSource(audioElement);
    audioSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    videoSource = audioCtx.createMediaElementSource(videoElement);
    videoSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    renderVisualizer();
  } catch (e) {
    console.log('Web Audio visualizer fallback');
  }
}

function renderVisualizer() {
  if (!canvasCtx || !analyser) return;
  requestAnimationFrame(renderVisualizer);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = (canvas.width / bufferLength) * 1.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height;
    
    // Gradient color from cyan to emerald
    const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(1, '#10b981');

    canvasCtx.fillStyle = gradient;
    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
    x += barWidth;
  }
}

// Format Seconds to MM:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// Load Tracks Dynamically from Server or Fallback File
async function loadDynamicTracks(isSilent = false) {
  try {
    const res = await fetch('/api/tracks?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.tracks)) {
        updateTracksDataset(data.tracks, isSilent);
        return;
      }
    }
  } catch (err) {
    // When running directly from file:///, fallback to local tracks_data.json
    try {
      const fileRes = await fetch('tracks_data.json?t=' + Date.now());
      if (fileRes.ok) {
        const localData = await fileRes.json();
        if (Array.isArray(localData)) {
          updateTracksDataset(localData, isSilent);
          return;
        }
      }
    } catch (e) {
      // Fallback
    }
  }
}

// Force a full server re-scan of "Natak Audio"
async function triggerLibraryRefresh() {
  const icon = document.getElementById('refreshIcon');
  if (icon) icon.classList.add('fa-spin');

  try {
    const res = await fetch('/api/tracks?rescan=1&t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.tracks)) {
        updateTracksDataset(data.tracks, false);
      }
    }
  } catch (err) {
    console.error('Failed to refresh from server:', err);
  } finally {
    setTimeout(() => {
      if (icon) icon.classList.remove('fa-spin');
    }, 500);
  }
}

// Update dataset and re-render only if there are actual changes
function updateTracksDataset(newTracks, isSilent) {
  const oldSig = TRACKS_DATA.map(t => `${t.rawFilename}_${t.num}`).join('|');
  const newSig = newTracks.map(t => `${t.rawFilename}_${t.num}`).join('|');

  if (oldSig !== newSig || TRACKS_DATA.length === 0) {
    TRACKS_DATA = newTracks;
    renderTracks();
    if (!isSilent) {
      console.log(`[Soundboard] Updated library: ${TRACKS_DATA.length} cues loaded.`);
    }
  }
}

// Instant Play Track Function
function playTrack(track, forceRestart = false) {
  initAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // Cancel any ongoing fade
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }

  // Toggle if already playing the same track
  if (currentTrack && currentTrack.id === track.id && !forceRestart) {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
    return;
  }

  // Stop previous media completely
  stopPlayback();

  currentTrack = track;
  const isVideo = track.type === 'video';

  if (isVideo) {
    currentActiveElement = videoElement;
    audioElement.pause();
    audioElement.src = '';
    
    videoElement.style.display = 'block';
    videoPlaceholder.style.display = 'none';
    
    videoElement.src = encodeURI(track.path);
    videoElement.playbackRate = currentSpeed;
    videoElement.loop = isLooping;
    videoElement.volume = isMuted ? 0 : masterVolume;
    
    videoElement.play().then(() => {
      isPlaying = true;
      updateUI();
    }).catch(err => {
      console.error('Video playback retry unencoded:', err);
      videoElement.src = track.path;
      videoElement.play();
      isPlaying = true;
      updateUI();
    });

  } else {
    currentActiveElement = audioElement;
    videoElement.pause();
    videoElement.style.display = 'none';
    videoPlaceholder.style.display = 'flex';
    
    audioElement.src = encodeURI(track.path);
    audioElement.playbackRate = currentSpeed;
    audioElement.loop = isLooping;
    audioElement.volume = isMuted ? 0 : masterVolume;
    
    audioElement.play().then(() => {
      isPlaying = true;
      updateUI();
    }).catch(err => {
      console.error('Audio playback retry unencoded:', err);
      audioElement.src = track.path;
      audioElement.play();
      isPlaying = true;
      updateUI();
    });
  }

  updateUI();
}

// Next & Previous Cue Navigation
function playNextTrack() {
  if (!currentTrack || TRACKS_DATA.length === 0) {
    if (TRACKS_DATA.length > 0) playTrack(TRACKS_DATA[0]);
    return;
  }
  const idx = TRACKS_DATA.findIndex(t => t.id === currentTrack.id);
  if (idx !== -1 && idx < TRACKS_DATA.length - 1) {
    playTrack(TRACKS_DATA[idx + 1]);
  } else if (isLooping && TRACKS_DATA.length > 0) {
    playTrack(TRACKS_DATA[0]);
  }
}

function playPrevTrack() {
  if (!currentTrack || TRACKS_DATA.length === 0) return;
  const idx = TRACKS_DATA.findIndex(t => t.id === currentTrack.id);
  if (idx > 0) {
    playTrack(TRACKS_DATA[idx - 1]);
  }
}

// Pause Playback
function pausePlayback() {
  if (currentActiveElement) {
    currentActiveElement.pause();
  }
  isPlaying = false;
  updateUI();
}

// Resume Playback
function resumePlayback() {
  if (currentActiveElement && currentTrack) {
    currentActiveElement.play().then(() => {
      isPlaying = true;
      updateUI();
    });
  }
}

// Emergency Panic Stop (Cuts all audio and video immediately)
function panicStop() {
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.src = '';
  }
  
  if (videoElement) {
    videoElement.pause();
    videoElement.currentTime = 0;
    videoElement.style.display = 'none';
  }
  
  videoPlaceholder.style.display = 'flex';
  isPlaying = false;
  currentTrack = null;
  currentActiveElement = null;

  updateUI();
  updateProgress(0, 0);
}

// Smooth Fade Out over 2 seconds
function smoothFadeOut() {
  if (!currentActiveElement || !isPlaying) return;
  
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }

  const startVolume = currentActiveElement.volume;
  const steps = 20;
  const stepTime = 100;
  const stepDecr = startVolume / steps;
  let currentVol = startVolume;

  fadeInterval = setInterval(() => {
    currentVol -= stepDecr;
    if (currentVol <= 0.02) {
      clearInterval(fadeInterval);
      fadeInterval = null;
      pausePlayback();
      currentActiveElement.volume = isMuted ? 0 : masterVolume;
    } else {
      currentActiveElement.volume = currentVol;
    }
  }, stepTime);
}

// Seek relative
function seekRelative(seconds) {
  if (currentActiveElement) {
    currentActiveElement.currentTime = Math.max(0, Math.min(currentActiveElement.duration || 0, currentActiveElement.currentTime + seconds));
  }
}

// Stop current playback cleanly
function stopPlayback() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
  if (videoElement) {
    videoElement.pause();
    videoElement.currentTime = 0;
    videoElement.style.display = 'none';
  }
  isPlaying = false;
}

// Update Master Volume
function setMasterVolume(val) {
  masterVolume = parseFloat(val);
  const percent = Math.round(masterVolume * 100);
  document.getElementById('volumeSlider').value = masterVolume;
  document.getElementById('volumeLabel').textContent = percent + '%';
  
  if (currentActiveElement) {
    currentActiveElement.volume = isMuted ? 0 : masterVolume;
  }
}

// Toggle Mute
function toggleMute() {
  isMuted = !isMuted;
  const icon = document.getElementById('volumeIcon');
  if (isMuted) {
    icon.className = 'fas fa-volume-mute volume-icon text-danger';
    if (currentActiveElement) currentActiveElement.volume = 0;
  } else {
    icon.className = 'fas fa-volume-up volume-icon';
    if (currentActiveElement) currentActiveElement.volume = masterVolume;
  }
}

// Toggle Loop
function toggleLoop() {
  isLooping = !isLooping;
  const loopBtn = document.getElementById('loopBtn');
  if (isLooping) {
    loopBtn.classList.add('active');
  } else {
    loopBtn.classList.remove('active');
  }
  if (currentActiveElement) {
    currentActiveElement.loop = isLooping;
  }
}

// Playback Speed
function setSpeed(speed) {
  currentSpeed = speed;
  if (currentActiveElement) {
    currentActiveElement.playbackRate = speed;
  }
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
  });
}

// Video Fullscreen & Picture-in-Picture
function toggleVideoFullscreen() {
  if (!videoElement) return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    if (videoElement.requestFullscreen) {
      videoElement.requestFullscreen();
    } else if (videoElement.webkitRequestFullscreen) {
      videoElement.webkitRequestFullscreen();
    }
  }
}

function togglePictureInPicture() {
  if (!videoElement) return;
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture();
  } else if (document.pictureInPictureEnabled) {
    videoElement.requestPictureInPicture().catch(console.error);
  }
}

// Open Dedicated Projector Stage Window
function openStagePopout() {
  const win = window.open('', 'NatakStageWindow', 'width=960,height=540,menubar=no,toolbar=no,location=no,status=no');
  if (!win) {
    alert('Pop-up was blocked. Please allow popups for Stage Projection Mode!');
    return;
  }
  
  win.document.title = 'STAGE PROJECTOR SCREEN - LIVE NATAK';
  win.document.body.style.margin = '0';
  win.document.body.style.backgroundColor = '#000';
  win.document.body.style.display = 'flex';
  win.document.body.style.alignItems = 'center';
  win.document.body.style.justifyContent = 'center';
  win.document.body.style.height = '100vh';
  win.document.body.style.overflow = 'hidden';

  // Insert synchronized video
  win.document.body.innerHTML = `
    <video id="stageVideo" style="width: 100vw; height: 100vh; object-fit: contain;" autoplay></video>
    <div id="stageOverlay" style="position: absolute; bottom: 10px; right: 10px; color: rgba(255,255,255,0.4); font-family: sans-serif; font-size: 11px;">
      PROJECTOR OUTPUT
    </div>
  `;

  const stageVid = win.document.getElementById('stageVideo');
  if (currentTrack && currentTrack.type === 'video') {
    stageVid.src = currentTrack.path;
    stageVid.currentTime = videoElement.currentTime;
    if (isPlaying) stageVid.play();
  }

  // Keep synced
  videoElement.addEventListener('timeupdate', () => {
    if (win && !win.closed && Math.abs(stageVid.currentTime - videoElement.currentTime) > 0.3) {
      stageVid.currentTime = videoElement.currentTime;
    }
  });

  videoElement.addEventListener('play', () => {
    if (win && !win.closed) {
      if (stageVid.src !== videoElement.src) stageVid.src = videoElement.src;
      stageVid.play();
    }
  });

  videoElement.addEventListener('pause', () => {
    if (win && !win.closed) stageVid.pause();
  });
}

// Toggle Star/Bookmark
function toggleStar(e, trackId) {
  e.stopPropagation();
  if (starredTracks.has(trackId)) {
    starredTracks.delete(trackId);
  } else {
    starredTracks.add(trackId);
  }
  localStorage.setItem('natak_starred_tracks', JSON.stringify([...starredTracks]));
  renderTracks();
}

// Update UI (Cards, Now Playing, Icons)
function updateUI() {
  const playPauseBtn = document.getElementById('mainPlayPause');
  const nowCue = document.getElementById('nowPlayingCue');
  const nowTitle = document.getElementById('nowPlayingTitle');
  const statusIndicator = document.getElementById('headerStatusIndicator');
  const statusText = document.getElementById('headerStatusText');

  if (isPlaying && currentTrack) {
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    nowCue.textContent = `CUE #${currentTrack.num} (${currentTrack.ext})`;
    nowTitle.textContent = currentTrack.contentName || `${currentTrack.num}. ${currentTrack.title}`;
    statusIndicator.className = 'status-indicator playing';
    statusText.textContent = `PLAYING CUE #${currentTrack.num}`;
  } else if (currentTrack) {
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    nowCue.textContent = `PAUSED #${currentTrack.num}`;
    nowTitle.textContent = currentTrack.contentName || `${currentTrack.num}. ${currentTrack.title}`;
    statusIndicator.className = 'status-indicator';
    statusText.textContent = `PAUSED`;
  } else {
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    nowCue.textContent = 'STANDBY';
    nowTitle.textContent = 'Click any audio or video pad to play instantly';
    statusIndicator.className = 'status-indicator';
    statusText.textContent = 'STANDBY';
  }

  // Update pad highlight classes
  document.querySelectorAll('.track-card, .track-row').forEach(el => {
    const trackId = parseInt(el.dataset.id, 10);
    if (currentTrack && trackId === currentTrack.id) {
      el.classList.add(isPlaying ? 'playing' : 'paused');
      el.classList.remove(isPlaying ? 'paused' : 'playing');
      const wave = el.querySelector('.mini-wave');
      if (wave) wave.style.display = isPlaying ? 'flex' : 'none';
      const label = el.querySelector('.state-text');
      if (label) label.textContent = isPlaying ? 'PLAYING' : 'PAUSED';
    } else {
      el.classList.remove('playing', 'paused');
      const wave = el.querySelector('.mini-wave');
      if (wave) wave.style.display = 'none';
      const label = el.querySelector('.state-text');
      if (label) label.textContent = 'READY';
    }
  });
}

// Update Scrubber & Times
function updateProgress(curr, dur) {
  const fill = document.getElementById('scrubberFill');
  const currLabel = document.getElementById('currentTimeLabel');
  const durLabel = document.getElementById('durationLabel');

  currLabel.textContent = formatTime(curr);
  durLabel.textContent = formatTime(dur);

  const pct = (dur > 0) ? (curr / dur) * 100 : 0;
  fill.style.width = pct + '%';
}

// Media Event Handlers
[audioElement, videoElement].forEach(el => {
  el.addEventListener('timeupdate', () => {
    if (currentActiveElement === el) {
      updateProgress(el.currentTime, el.duration);
    }
  });

  el.addEventListener('ended', () => {
    if (currentActiveElement === el) {
      const autoAdvance = document.getElementById('autoAdvanceToggle')?.checked;
      if (autoAdvance) {
        playNextTrack();
      } else if (!isLooping) {
        isPlaying = false;
        updateUI();
      }
    }
  });
});

// Scrubber Click to Seek
const scrubberBar = document.getElementById('scrubberBar');
scrubberBar.addEventListener('click', (e) => {
  if (!currentActiveElement || !currentActiveElement.duration) return;
  const rect = scrubberBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  currentActiveElement.currentTime = pct * currentActiveElement.duration;
});

// Render Tracks (Grid or List)
function renderTracks() {
  const container = document.getElementById('tracksContainer');
  container.innerHTML = '';

  const filtered = TRACKS_DATA.filter(t => {
    // Category Filter
    if (currentFilter === 'audio' && t.type !== 'audio') return false;
    if (currentFilter === 'video' && t.type !== 'video') return false;
    if (currentFilter === 'starred' && !starredTracks.has(t.id)) return false;

    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = String(t.num).includes(q);
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchContent = (t.contentName || '').toLowerCase().includes(q);
      const matchRaw = (t.rawFilename || '').toLowerCase().includes(q);
      if (!matchNum && !matchTitle && !matchContent && !matchRaw) return false;
    }
    return true;
  });

  document.getElementById('tracksCountBadge').textContent = `${filtered.length} / ${TRACKS_DATA.length}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-dim);">
        <i class="fas fa-search" style="font-size: 36px; margin-bottom: 12px; opacity: 0.5;"></i>
        <p style="font-size: 16px; font-weight: 600;">No tracks match your search "${searchQuery}"</p>
        <p style="font-size: 13px; margin-top: 6px;">Try searching by cue number (e.g. 21) or song name</p>
      </div>
    `;
    return;
  }

  if (currentView === 'grid') {
    container.className = 'tracks-grid';
    filtered.forEach(track => {
      const isStarred = starredTracks.has(track.id);
      const isThisPlaying = currentTrack && currentTrack.id === track.id && isPlaying;
      const isThisPaused = currentTrack && currentTrack.id === track.id && !isPlaying;
      
      const displayName = track.contentName || `${track.num}. ${track.title}`;

      const card = document.createElement('div');
      card.className = `track-card ${track.type} ${isThisPlaying ? 'playing' : ''} ${isThisPaused ? 'paused' : ''}`;
      card.dataset.id = track.id;

      card.innerHTML = `
        <div class="track-header">
          <span class="cue-badge">CUE ${track.num}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="type-pill ${track.type}">${track.type === 'video' ? '🎬 VIDEO' : '🎵 AUDIO'}</span>
            <span class="star-btn ${isStarred ? 'active' : ''}" style="color: ${isStarred ? '#f59e0b' : 'rgba(255,255,255,0.2)'}; font-size: 14px;" title="Bookmark / Star">
              <i class="${isStarred ? 'fas' : 'far'} fa-star"></i>
            </span>
          </div>
        </div>
        <div class="track-body">
          <div class="track-title" title="${track.fullName}">${displayName}</div>
        </div>
        <div class="track-footer">
          <div class="playback-state-label">
            <div class="mini-wave" style="display: ${isThisPlaying ? 'flex' : 'none'};">
              <span></span><span></span><span></span><span></span>
            </div>
            <span class="state-text">${isThisPlaying ? 'PLAYING' : (isThisPaused ? 'PAUSED' : 'READY')}</span>
          </div>
          <span style="font-family: monospace; font-size: 11px; opacity: 0.7;">${track.ext}</span>
        </div>
      `;

      card.addEventListener('click', () => playTrack(track));
      card.querySelector('.star-btn').addEventListener('click', (e) => toggleStar(e, track.id));

      container.appendChild(card);
    });

  } else {
    // List View
    container.className = 'tracks-list';
    filtered.forEach(track => {
      const isThisPlaying = currentTrack && currentTrack.id === track.id && isPlaying;
      const displayName = track.contentName || `${track.num}. ${track.title}`;

      const row = document.createElement('div');
      row.className = `track-row ${isThisPlaying ? 'playing' : ''}`;
      row.dataset.id = track.id;

      row.innerHTML = `
        <div class="row-cue">#${track.num}</div>
        <div class="row-title" title="${track.fullName}">${displayName}</div>
        <span class="type-pill ${track.type}">${track.type === 'video' ? '🎬 VIDEO' : '🎵 AUDIO'}</span>
        <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px;">
          <i class="fas ${isThisPlaying ? 'fa-pause' : 'fa-play'}"></i>
        </button>
      `;

      row.addEventListener('click', () => playTrack(track));
      container.appendChild(row);
    });
  }
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initial dynamic load
  loadDynamicTracks(false);

  // Background auto-refresh polling every 3 seconds
  setInterval(() => {
    loadDynamicTracks(true);
  }, 3000);

  // Refresh Button Click
  const refreshBtn = document.getElementById('refreshLibraryBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', triggerLibraryRefresh);
  }

  // Panic Button
  document.getElementById('panicBtn').addEventListener('click', panicStop);
  document.getElementById('fadeBtn').addEventListener('click', smoothFadeOut);

  // Play/Pause Main Button
  document.getElementById('mainPlayPause').addEventListener('click', () => {
    if (isPlaying) {
      pausePlayback();
    } else if (currentTrack) {
      resumePlayback();
    } else if (TRACKS_DATA.length > 0) {
      playTrack(TRACKS_DATA[0]);
    }
  });

  // Skip & Cue Navigation Buttons
  document.getElementById('rewindBtn').addEventListener('click', () => seekRelative(-5));
  document.getElementById('forwardBtn').addEventListener('click', () => seekRelative(5));
  
  const prevBtn = document.getElementById('prevTrackBtn');
  if (prevBtn) prevBtn.addEventListener('click', playPrevTrack);

  const nextBtn = document.getElementById('nextTrackBtn');
  if (nextBtn) nextBtn.addEventListener('click', playNextTrack);

  document.getElementById('loopBtn').addEventListener('click', toggleLoop);

  // Video Tools
  document.getElementById('btnFullscreen').addEventListener('click', toggleVideoFullscreen);
  document.getElementById('btnPiP').addEventListener('click', togglePictureInPicture);
  document.getElementById('btnPopout').addEventListener('click', openStagePopout);

  // Volume
  const volumeSlider = document.getElementById('volumeSlider');
  volumeSlider.addEventListener('input', (e) => setMasterVolume(e.target.value));
  document.getElementById('volumeIcon').addEventListener('click', toggleMute);

  // Volume Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (btn.dataset.vol) {
      btn.addEventListener('click', () => setMasterVolume(parseFloat(btn.dataset.vol)));
    }
  });

  // Speed Presets
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => setSpeed(parseFloat(btn.dataset.speed)));
  });

  // Search Input
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    searchClear.style.display = searchQuery ? 'block' : 'none';
    renderTracks();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.style.display = 'none';
    renderTracks();
    searchInput.focus();
  });

  // Filter Buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTracks();
    });
  });

  // View Mode Toggles
  document.getElementById('viewGridBtn').addEventListener('click', () => {
    currentView = 'grid';
    document.getElementById('viewGridBtn').classList.add('active');
    document.getElementById('viewListBtn').classList.remove('active');
    renderTracks();
  });

  document.getElementById('viewListBtn').addEventListener('click', () => {
    currentView = 'list';
    document.getElementById('viewListBtn').classList.add('active');
    document.getElementById('viewGridBtn').classList.remove('active');
    renderTracks();
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === searchInput) {
      if (e.key === 'Escape') {
        searchInput.blur();
      }
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (isPlaying) pausePlayback();
      else resumePlayback();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      panicStop();
    } else if (e.key === 'f' || e.key === 'F') {
      smoothFadeOut();
    } else if (e.key === 'm' || e.key === 'M') {
      toggleMute();
    } else if (e.key === 'l' || e.key === 'L') {
      toggleLoop();
    } else if (e.key === 'n' || e.key === 'N' || e.key === 'PageDown') {
      playNextTrack();
    } else if (e.key === 'p' || e.key === 'P' || e.key === 'PageUp') {
      playPrevTrack();
    } else if (e.key === '/') {
      e.preventDefault();
      searchInput.focus();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      seekRelative(-5);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      seekRelative(5);
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      setMasterVolume(Math.min(1.0, masterVolume + 0.05));
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      setMasterVolume(Math.max(0.0, masterVolume - 0.05));
    }
  });
});
