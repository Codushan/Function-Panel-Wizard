const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const ROOT_DIR = __dirname;
const AUDIO_DIR = path.join(ROOT_DIR, 'Natak Audio');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const VALID_MEDIA_EXTS = new Set([
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
  '.mp4', '.mkv', '.webm', '.avi', '.mov'
]);

// In-memory tracks cache
let currentTracks = [];
let watchDebounce = null;

// Parse a single track file according to standard format like "21. डिगी डिगी डम डम"
function parseTrackFile(filename, index) {
  const ext = path.extname(filename);
  const extLower = ext.toLowerCase();
  const isVideo = ['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(extLower);

  // Base name without extension
  let base = path.basename(filename, ext);

  // Extract leading number if present (e.g. "21.", "21 ", "4.", "03.")
  const numMatch = base.match(/^(\d+)[\.\s\-_]*(.*)$/);
  let num = index + 1;
  let rawTitle = base;

  if (numMatch) {
    num = parseInt(numMatch[1], 10);
    rawTitle = numMatch[2].trim();
  }

  // Clean title: remove quality/bitrate tags like (MP3_320K), (720P_HD), (360P), (1080P_HD), extra underscores
  let cleanTitle = rawTitle
    .replace(/\((MP3_\w+|MP3_3|\d+P(_HD)?)\)/gi, '')
    .replace(/__+/g, ' ')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle) {
    cleanTitle = base;
  }

  // Content Name in the exact requested manner: "21. डिगी डिगी डम डम"
  const contentName = `${num}. ${cleanTitle}`;

  return {
    id: index + 1,
    num: num,
    title: cleanTitle,
    contentName: contentName,
    rawFilename: filename,
    fullName: filename,
    type: isVideo ? 'video' : 'audio',
    ext: extLower.replace('.', '').toUpperCase(),
    path: 'Natak Audio/' + filename
  };
}

// Dynamically scan the "Natak Audio" directory
function scanNatakAudio() {
  try {
    if (!fs.existsSync(AUDIO_DIR)) {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
    }

    const files = fs.readdirSync(AUDIO_DIR);
    const mediaFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return VALID_MEDIA_EXTS.has(ext);
    });

    const parsedTracks = mediaFiles.map((file, idx) => parseTrackFile(file, idx));

    // Sort naturally by Cue Number
    parsedTracks.sort((a, b) => a.num - b.num);

    // Re-index IDs sequentially
    parsedTracks.forEach((t, i) => {
      t.id = i + 1;
    });

    currentTracks = parsedTracks;

    // Automatically update tracks_data.json on disk so offline / static index.html stays in sync
    const jsonPath = path.join(ROOT_DIR, 'tracks_data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(currentTracks, null, 2), 'utf-8');

    console.log(`[Natak Audio Scan] Updated library: ${currentTracks.length} tracks detected.`);
    return currentTracks;
  } catch (err) {
    console.error('[Natak Audio Scan Error]', err.message);
    return currentTracks;
  }
}

// Initial scan
scanNatakAudio();

// Setup real-time file watcher for the "Natak Audio" folder
try {
  fs.watch(AUDIO_DIR, (eventType, filename) => {
    if (filename) {
      clearTimeout(watchDebounce);
      watchDebounce = setTimeout(() => {
        console.log(`[Natak Audio Event] ${eventType} on ${filename}`);
        scanNatakAudio();
      }, 400);
    }
  });
} catch (e) {
  console.log('[Notice] fs.watch not active, polling/API fallback active.');
}

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse path
  let decodedPath = '';
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    decodedPath = decodeURIComponent(urlObj.pathname);
  } catch (err) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  // API Route: Live Tracks Endpoint
  if (decodedPath === '/api/tracks') {
    // If client requests fresh scan with ?rescan=1, perform immediate scan
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    if (urlObj.searchParams.get('rescan') === '1') {
      scanNatakAudio();
    }

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify({
      success: true,
      count: currentTracks.length,
      tracks: currentTracks
    }));
    return;
  }

  // Fallback to index.html for root
  if (decodedPath === '/') {
    decodedPath = '/index.html';
  }

  const filePath = path.join(ROOT_DIR, decodedPath);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Handle HTTP Range Requests for Audio/Video seeking (HTTP 206 Partial Content)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size || end >= stats.size) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stats.size}`
        });
        res.end();
        return;
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`====================================================`);
  console.log(`  NATAK LIVE AUDIO & VIDEO PANEL IS READY!`);
  console.log(`  Library: ${currentTracks.length} tracks loaded from "Natak Audio"`);
  console.log(`  Auto-Update: ACTIVE (updates whenever Natak Audio changes)`);
  console.log(`  Access locally at: ${url}`);
  console.log(`====================================================`);

  // Auto-open browser on Windows
  exec(`start "" "${url}"`);
});
