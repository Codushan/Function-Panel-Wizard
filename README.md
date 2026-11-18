# 🎭 Natak Stage Soundboard & Instant Media Control Panel

A zero-latency, tactile soundboard and live cue controller designed for stage plays, drama performances (*Natak*), Ramleela, cultural programs, and live events.

Trigger any audio (MP3, WAV, OGG) or video (MP4, MKV, WebM) instantly with a single click, project videos to external monitors or stage TVs, and control the show with keyboard hotkeys.

---

## ✨ Features

- **⚡ Instant 1-Click Triggering:** Click any pad to play audio or video immediately with zero lag. Click again to pause/resume, or click another cue to switch instantly.
- **🎬 Dual Audio & Video Playback:** Seamlessly plays both audio tracks and video clips.
- **🖥️ External Stage Screen & Projector Mode:**
  - **`PROJECTOR SCREEN` Button:** Pops out a borderless, synchronized video output window that you can drag to a second monitor, stage projector, or TV.
  - **Picture-in-Picture (PiP) & Fullscreen:** Float the video player over your screen or take it full screen on demand.
- **🔄 Automatic Library Scanning & Updates:**
  - Drop your audio and video files into the `Natak Audio/` folder.
  - Whenever `server.js` starts, it automatically indexes all media files.
  - While running, it continuously detects newly added, deleted, or renamed files in real-time without needing a restart.
- **🏷️ Smart Cue Formatting:**
  - Automatically parses filenames like `21. डिगी डिगी डम डम.mp3` into clean cue pads (`CUE 21: 21. डिगी डिगी डम डम`).
  - Suffixes like `(MP3_320K)` or `(720P_HD)` are cleaned automatically.
  - Cues are sorted in natural numerical order (`1, 2, 3 ... 21 ... 45`).
- **🚨 Stage Operator Emergency Controls:**
  - **STOP ALL (`Esc`):** Big red panic button to kill all sound and video instantly.
  - **SMOOTH FADE OUT (`F`):** 2-second linear fade-out for natural scene transitions.
  - **LOOP (`L`):** Toggle continuous loop for background atmosphere or ongoing scenes.
  - **Master Gain Console:** Volume slider with quick presets (25%, 50%, 75%, 100%) and mute toggle (`M`).
  - **Speed Adjust:** 0.8x, 1.0x, 1.2x, 1.5x.
- **🔍 Quick Search & Category Filters:**
  - Instant fuzzy filter by cue number (e.g. `10`, `21`) or song name in Hindi/English.
  - Filter tabs: **All**, **Audio Only**, **Video Only**, and **Starred**.
  - Soundboard Grid View & Sequential Cue List View.

---

## 🚀 How to Run

### Method 1: 1-Click Launch (Recommended)
1. Double-click **`Launch_Panel.bat`**.
2. The streaming server starts and automatically opens your default browser at `http://localhost:3000`.

### Method 2: Command Line (Node.js)
Open PowerShell or Command Prompt in the project folder and run:
```bash
node server.js
```
Then navigate to `http://localhost:3000` in your browser.

### Method 3: Direct Offline Mode
Simply double-click **`index.html`** to open it directly in Google Chrome, Microsoft Edge, or Firefox.

---

## 📁 How to Add Your Audio & Video Files

Place your audio (`.mp3`, `.wav`, `.ogg`, `.m4a`) and video (`.mp4`, `.mkv`, `.webm`) files inside the **`Natak Audio`** directory.

### Naming Convention:
Prefix each file with its cue number followed by a dot or space:
```text
Natak Audio/
├── 1. Opening Entry Music.mp3
├── 2. Scene 1 Dialogue BG.mp3
├── 10. 1 दृश्य मुखिया बना के.mp4
├── 21. डिगी डिगी डम डम.mp3
├── 26. बियाह पॉवर.mp4
└── 45. Curtain Closing Call.mp3
```

- The panel will automatically extract the cue number and format the card title cleanly as:  
  `21. डिगी डिगी डम डम`
- New files appear on the soundboard automatically within a few seconds!

---

## ⌨️ Keyboard Shortcuts Reference

| Key | Action | Description |
| :--- | :--- | :--- |
| **`Space`** | **Play / Pause** | Toggles playback of current cue |
| **`Esc`** | **STOP ALL** | Emergency panic stop (kills all sound & video) |
| **`F`** | **Fade Out** | 2-second linear smooth fade-out |
| **`N`** or **`PageDown`** | **Next Cue** | Skips to the next sequential cue |
| **`P`** or **`PageUp`** | **Previous Cue** | Jumps back to the previous cue |
| **`←` / `→`** | **Seek ±5s** | Rewind or fast-forward 5 seconds |
| **`↑` / `↓`** | **Volume ±5%** | Increases or decreases master gain |
| **`M`** | **Mute** | Mutes or unmutes sound |
| **`L`** | **Loop** | Toggles infinite loop mode |
| **`/`** | **Quick Search** | Instantly focuses the search bar |

---

## 🛠️ Project Structure

```text
├── Natak Audio/           # Place your MP3 and MP4 files here (ignored by git)
│   └── .gitkeep           # Preserves folder structure in repository
├── app.js                 # Dynamic soundboard application logic & audio engine
├── index.html             # High-contrast stage console interface
├── style.css              # Dark stage theme styles & responsive pad grid
├── server.js              # Streaming HTTP server with range requests & auto-indexing
├── Launch_Panel.bat       # Windows 1-click launcher
├── .gitignore             # Excludes media files while keeping project structure
└── README.md              # User instructions and documentation
```

---

## 📦 Requirements

- **Browser:** Google Chrome, Microsoft Edge, or any modern HTML5 browser.
- **Runtime (Optional but recommended):** [Node.js](https://nodejs.org/) (v16 or higher) for auto-updating directory scanning and HTTP 206 video seeking.
