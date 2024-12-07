// js/timeline.js
import { audioContext, inputGainNode } from './audioEngine.js';
import { pushState } from './stateManager.js';

let tracks = [];
let isPlayingTimeline = false;
let timelineStartTime = 0;

// Constants
const NUM_TRACKS = 16;
const TRACK_HEIGHT = 100; // height of each track in pixels
const TRACK_SPACING = 10; // space between tracks if desired
const CLIP_HEIGHT = 60;   // height of clip display
const LEFT_OFFSET = 50;   // initial left offset for clips
const PX_PER_SEC = 100;   // pixels per second horizontal scale
const playbackLine = document.createElement('div');
playbackLine.classList.add('playback-line');

// Initialize tracks
export function initTimeline() {
    const waveformContainer = document.getElementById('waveform-container');
    // Create 16 empty tracks
    for (let i = 0; i < NUM_TRACKS; i++) {
        tracks.push({ clips: [] });
    }

    waveformContainer.addEventListener('dragover', onFileDragOver);
    waveformContainer.addEventListener('drop', onFileDrop);

    const audioFileInput = document.getElementById('audio-file-input');
    audioFileInput.addEventListener('change', onFileInput);

    const playPauseTimelineBtn = document.getElementById('play-pause-timeline');
    playPauseTimelineBtn.addEventListener('click', toggleTimelinePlay);

    waveformContainer.appendChild(playbackLine);
    drawAllTracks();
}

async function onFileDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const waveformContainer = document.getElementById('waveform-container');
        const rect = waveformContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const trackIndex = Math.floor(y / TRACK_HEIGHT);
        if (trackIndex < 0 || trackIndex >= NUM_TRACKS) return; // out of range

        await loadAudioFile(files[0], trackIndex, x);
        pushState();
    }
}

async function onFileInput(e) {
    if (e.target.files.length > 0) {
        // Default to track 0, positioned at x=50
        await loadAudioFile(e.target.files[0], 0, LEFT_OFFSET);
        pushState();
    }
}

function onFileDragOver(e) {
    e.preventDefault();
}

async function loadAudioFile(file, trackIndex, xPos) {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    addAudioClip(audioBuffer, trackIndex, xPos);
    drawAllTracks();
}

function addAudioClip(buffer, trackIndex, x) {
    const duration = buffer.duration;
    const width = duration * PX_PER_SEC;
    const clip = {
        buffer,
        startTime: (x - LEFT_OFFSET)/PX_PER_SEC,
        x: x,
        width,
        duration
    };
    tracks[trackIndex].clips.push(clip);
    drawAllTracks();
}

function drawAllTracks() {
    const container = document.getElementById('waveform-container');
    container.innerHTML = '';
    container.appendChild(playbackLine);

    // Draw each track and its clips
    for (let t = 0; t < NUM_TRACKS; t++) {
        const track = tracks[t];
        for (let clip of track.clips) {
            const clipDiv = document.createElement('div');
            clipDiv.className = 'audio-clip';
            clipDiv.style.left = clip.x + 'px';
            clipDiv.style.top = (t * TRACK_HEIGHT + (TRACK_HEIGHT - CLIP_HEIGHT)/2) + 'px';
            clipDiv.style.width = clip.width + 'px';
            clipDiv.style.height = CLIP_HEIGHT + 'px';
            
            const canvas = document.createElement('canvas');
            canvas.width = clip.width;
            canvas.height = CLIP_HEIGHT;
            clipDiv.appendChild(canvas);
            drawWaveform(canvas, clip.buffer);

            clipDiv.draggable = true;
            clipDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({trackIndex: t, x: clip.x}));
                e.dataTransfer.effectAllowed = 'move';
                currentDraggingClip = { clip, trackIndex: t };
            });

            container.appendChild(clipDiv);
        }
    }

    // Add drop handlers for moving clips horizontally
    container.addEventListener('drop', onClipDrop);
    container.addEventListener('dragover', onClipDragOver);
}

let currentDraggingClip = null;
function onClipDragOver(e) {
    e.preventDefault();
}

function onClipDrop(e) {
    e.preventDefault();
    if (currentDraggingClip) {
        const container = document.getElementById('waveform-container');
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // Determine if we want to also allow changing tracks by vertical movement:
        const y = e.clientY - rect.top;
        let newTrackIndex = Math.floor(y / TRACK_HEIGHT);
        if (newTrackIndex < 0 || newTrackIndex >= NUM_TRACKS) {
            newTrackIndex = currentDraggingClip.trackIndex; // revert to original track if out of range
        }

        // Remove clip from old track
        const oldTrack = tracks[currentDraggingClip.trackIndex];
        const clipIndex = oldTrack.clips.indexOf(currentDraggingClip.clip);
        oldTrack.clips.splice(clipIndex, 1);

        // Update clip position and track
        currentDraggingClip.clip.x = x;
        currentDraggingClip.clip.startTime = (x - LEFT_OFFSET)/PX_PER_SEC;

        tracks[newTrackIndex].clips.push(currentDraggingClip.clip);

        currentDraggingClip = null;
        drawAllTracks();
        pushState();
    }
}

function drawWaveform(canvas, buffer) {
    const ctx = canvas.getContext('2d');
    const data = buffer.getChannelData(0);
    const step = Math.floor(data.length / canvas.width);
    const amp = canvas.height / 2;
    const panelColor = getComputedStyle(document.body).getPropertyValue('--panel-color').trim();
    const fgColor = getComputedStyle(document.body).getPropertyValue('--fg-color').trim();
    ctx.fillStyle = panelColor;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = fgColor;
    ctx.beginPath();
    for (let i=0; i<canvas.width; i++) {
        const slice = data.slice(i*step,(i+1)*step);
        const min = Math.min(...slice);
        const max = Math.max(...slice);
        ctx.moveTo(i, amp*(1+min));
        ctx.lineTo(i, amp*(1+max));
    }
    ctx.stroke();
}

function toggleTimelinePlay() {
    const btn = document.getElementById('play-pause-timeline');
    if (!isPlayingTimeline) {
        startTimelinePlayback();
        btn.textContent = 'Pause';
    } else {
        stopTimelinePlayback();
        btn.textContent = 'Play';
    }
}

function startTimelinePlayback() {
    isPlayingTimeline = true;
    timelineStartTime = audioContext.currentTime;
    // Start all clips
    for (let t = 0; t < NUM_TRACKS; t++) {
        for (let clip of tracks[t].clips) {
            const source = audioContext.createBufferSource();
            source.buffer = clip.buffer;
            source.connect(inputGainNode);
            source.start(timelineStartTime + clip.startTime);
            clip.source = source;
        }
    }
    requestAnimationFrame(updatePlaybackLine);
}

function stopTimelinePlayback() {
    isPlayingTimeline = false;
    for (let t = 0; t < NUM_TRACKS; t++) {
        for (let clip of tracks[t].clips) {
            if (clip.source) {
                clip.source.stop();
                clip.source.disconnect();
                clip.source = null;
            }
        }
    }
    const btn = document.getElementById('play-pause-timeline');
    btn.textContent = 'Play';
}

function updatePlaybackLine() {
    if (!isPlayingTimeline) return;
    const now = audioContext.currentTime;
    const elapsed = now - timelineStartTime;
    const x = LEFT_OFFSET + elapsed * PX_PER_SEC;
    playbackLine.style.left = x + 'px';
    playbackLine.style.top = '0px';
    playbackLine.style.height = (TRACK_HEIGHT * NUM_TRACKS) + 'px';
    requestAnimationFrame(updatePlaybackLine);
}