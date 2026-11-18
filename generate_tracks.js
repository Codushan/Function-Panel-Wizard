const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, 'Natak Audio');
const files = fs.readdirSync(audioDir);

const tracks = files.map((filename, index) => {
    const ext = path.extname(filename).toLowerCase();
    const isVideo = ext === '.mp4' || ext === '.mkv' || ext === '.webm';
    
    // Extract leading number if present
    const match = filename.match(/^(\d+)\.\s*(.*?)(\.[^.]+)?$/);
    let trackNum = index + 1;
    let title = filename.replace(/\.[^/.]+$/, '');
    
    if (match) {
        trackNum = parseInt(match[1], 10);
        title = match[2];
    }
    
    // Clean up title
    let cleanTitle = title
        .replace(/\(MP3_\w+\)/gi, '')
        .replace(/\(\d+P(_HD)?\)/gi, '')
        .replace(/\(MP3_3\)/gi, '')
        .replace(/__+/g, ' ')
        .replace(/_+/g, ' ')
        .trim();
        
    return {
        id: index + 1,
        num: trackNum,
        rawFilename: filename,
        title: cleanTitle || title,
        fullName: filename,
        type: isVideo ? 'video' : 'audio',
        ext: ext.replace('.', '').toUpperCase(),
        path: 'Natak Audio/' + filename
    };
});

// Sort tracks by cue number
tracks.sort((a, b) => a.num - b.num);

fs.writeFileSync(path.join(__dirname, 'tracks_data.json'), JSON.stringify(tracks, null, 2), 'utf-8');
console.log(`Processed ${tracks.length} tracks successfully.`);

