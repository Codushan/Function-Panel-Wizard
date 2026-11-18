========================================================================
   NATAK LIVE AUDIO & VIDEO INSTANT PLAY SOUNDBOARD PANEL
========================================================================

AUTOMATIC UPDATES:
------------------
Whenever you add, delete, or rename files in the "Natak Audio" folder:
1. Every time "server.js" is called (or Launch_Panel.bat is run), it
   automatically scans the "Natak Audio" directory dynamically.
2. Even while the server is running, any new file added to "Natak Audio"
   is automatically detected and re-indexed in real time.
3. Content names are automatically formatted cleanly in the exact manner:
   e.g. "21. डिगी डिगी डम डम"
   (Number + dot + clean song/scene name).
4. Tracks are automatically sorted numerically by Cue Number (3, 4, 5... 21... 45).
5. The web panel auto-refreshes seamlessly in the background without
   interrupting whatever audio or video is currently playing!

HOW TO RUN:
-----------
Method 1 (Recommended):
  Double-click "Launch_Panel.bat" in this folder.
  It boots the server and automatically opens your browser at http://localhost:3000

Method 2 (Command Line):
  Run: node server.js

Method 3 (Direct Offline):
  Double-click "index.html" in Chrome or Edge.

------------------------------------------------------------------------
KEYBOARD SHORTCUTS:
------------------------------------------------------------------------
[ Space ]         Play / Pause
[ Esc ]           Emergency STOP ALL
[ F ]             Smooth Fade Out (2s)
[ N / PageDown ]  Next Cue
[ P / PageUp ]    Previous Cue
[ Left Arrow ]    Rewind 5 Seconds
[ Right Arrow ]   Fast Forward 5 Seconds
[ Up Arrow ]      Master Volume Up (+5%)
[ Down Arrow ]    Master Volume Down (-5%)
[ M ]             Mute / Unmute
[ L ]             Toggle Loop Mode
[ / ]             Quick Search by Cue # or Name
========================================================================
