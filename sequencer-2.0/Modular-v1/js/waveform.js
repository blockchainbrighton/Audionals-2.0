// js/waveform.js
import { audioContext, inputGainNode } from './audioEngine.js';
import { pushState } from './stateManager.js';

export let audioClips = [];
let currentDraggingClip = null;
let isPlayingTimeline = false;

export function initWaveform() {
    const waveformContainer = document.getElementById('waveform-container');
    const audioFileInput = document.getElementById('audio-file-input');
    const playPauseTimelineBtn = document.getElementById('play-pause-timeline');

    waveformContainer.addEventListener('dragover', e => { e.preventDefault(); });
    waveformContainer.addEventListener('drop', onFileDrop);
    audioFileInput.addEventListener('change', onFileInput);
    playPauseTimelineBtn.addEventListener('click', toggleTimelinePlay);

    waveformContainer.addEventListener('dragover', clipDragOver);
    waveformContainer.addEventListener('drop', clipDrop);
}

async function onFileDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        await loadAudioFile(files[0]);
    }
}

async function onFileInput(e) {
    if (e.target.files.length > 0) {
        await loadAudioFile(e.target.files[0]);
    }
}

async function loadAudioFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    addAudioClip(audioBuffer);
    pushState();
}

function addAudioClip(buffer) {
    const duration = buffer.duration;
    const pxPerSec = 100;
    const width = duration * pxPerSec;
    const clip = {
        buffer,
        startTime: 0,
        x: 50,
        width,
        duration
    };
    audioClips.push(clip);
    drawClips();
}

function drawClips() {
    const waveformContainer = document.getElementById('waveform-container');
    waveformContainer.innerHTML = '';
    for (let clip of audioClips) {
        const clipDiv = document.createElement('div');
        clipDiv.className = 'audio-clip';
        clipDiv.style.left = clip.x + 'px';
        clipDiv.style.width = clip.width + 'px';
        clipDiv.style.height = '60px';

        const canvas = document.createElement('canvas');
        canvas.width = clip.width;
        canvas.height = 60;
        clipDiv.appendChild(canvas);
        drawWaveform(canvas, clip.buffer);

        clipDiv.draggable = true;
        clipDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', clip.x);
            e.dataTransfer.effectAllowed = 'move';
            currentDraggingClip = clip;
        });

        waveformContainer.appendChild(clipDiv);
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

function clipDragOver(e) {
    e.preventDefault();
}

function clipDrop(e) {
    e.preventDefault();
    const waveformContainer = document.getElementById('waveform-container');
    if (currentDraggingClip) {
        const rect = waveformContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        currentDraggingClip.x = x;
        currentDraggingClip.startTime = (x - 50)/100;
        drawClips();
        pushState();
        currentDraggingClip = null;
    }
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
    const now = audioContext.currentTime;
    for (let clip of audioClips) {
        const source = audioContext.createBufferSource();
        source.buffer = clip.buffer;
        source.connect(inputGainNode);
        source.start(now + clip.startTime);
        clip.source = source;
    }
}

function stopTimelinePlayback() {
    isPlayingTimeline = false;
    for (let clip of audioClips) {
        if (clip.source) {
            clip.source.stop();
            clip.source.disconnect();
            clip.source = null;
        }
    }
}
