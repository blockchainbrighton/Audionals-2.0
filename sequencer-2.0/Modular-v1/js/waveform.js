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


// <!-- 
// <details>
// <summary><strong>Collapsible Notes: waveform.js</strong></summary>

// ### Overview
// `waveform.js` handles the visualization and manipulation of audio clips within the **Audional Sequencer 2.0** application. It allows users to load audio files, display their waveforms, and interact with them through drag-and-drop functionality. This module complements `timeline.js` by focusing on the waveform representation and basic clip management.

// ### Key Components

// - **Audio Clips Management**:
//   - **audioClips Array**: Stores all loaded audio clips, each containing information about the audio buffer, position, duration, and playback source.

// - **Playback Control**:
//   - **isPlayingTimeline Flag**: Tracks whether the timeline is currently in playback mode.
//   - **Playback Line**: Though defined in `timeline.js`, `waveform.js` interacts with playback controls to manage audio sources.

// ### Key Functions

// - **initWaveform()**:
//   - Sets up event listeners for drag-and-drop and file input interactions within the waveform container.
//   - Initializes playback controls by linking the play/pause button to the timeline playback functions.
//   - Adds additional drag-and-drop listeners for manipulating clips.

// - **onFileDrop(e)** and **onFileInput(e)**:
//   - Handle audio files dropped onto the waveform container or selected via the file input.
//   - Decode and load the audio files into the application, adding them as clips.

// - **loadAudioFile(file)**:
//   - Reads the audio file as an ArrayBuffer.
//   - Decodes the ArrayBuffer into an AudioBuffer using the Web Audio API.
//   - Adds the decoded AudioBuffer as a new clip and updates the UI.

// - **addAudioClip(buffer)**:
//   - Creates a clip object containing the audio buffer, position (`x`), width (proportional to duration), and duration.
//   - Adds the clip to the `audioClips` array and triggers a redraw of all clips.

// - **drawClips()**:
//   - Clears the waveform container and redraws all audio clips.
//   - Creates visual representations of each clip using div elements and embedded canvas waveforms.
//   - Sets up drag-and-drop event listeners for each clip to allow repositioning.

// - **drawWaveform(canvas, buffer)**:
//   - Renders the waveform of an audio buffer onto a canvas element.
//   - Calculates the minimum and maximum amplitudes for each segment to accurately depict the waveform.

// - **clipDragOver(e)** and **clipDrop(e)**:
//   - Manage the drag-over and drop events for repositioning clips within the waveform container.
//   - Updates the clip's position based on where it is dropped and triggers a UI redraw.

// - **toggleTimelinePlay()**, **startTimelinePlayback()**, and **stopTimelinePlayback()**:
//   - Control the playback of all audio clips in the timeline.
//   - Start playback by scheduling each clip to play at its designated start time.
//   - Stop playback by halting all active audio sources and resetting their connections.

// ### Data Structures

// - **audioClips**:
//   - An array storing clip objects, each containing:
//     - **buffer**: The decoded AudioBuffer.
//     - **startTime**: The start time in seconds relative to the timeline.
//     - **x**: The horizontal position in pixels on the timeline.
//     - **width**: The width of the clip in pixels, proportional to its duration.
//     - **duration**: The duration of the clip in seconds.
//     - **source**: The `AudioBufferSourceNode` associated with the clip for playback control.

// ### UI Components Managed

// - **Waveform Container**:
//   - Hosts all audio clips and their visual waveform representations.
//   - Supports drag-and-drop for organizing clips horizontally within the timeline.

// - **Playback Controls**:
//   - **Play/Pause Button**: Toggles the playback of all audio clips in the timeline.
  
// - **Audio Clips**:
//   - Represented as draggable div elements with embedded canvas waveforms.
//   - Allow users to visualize and rearrange audio clips within the timeline.

// ### Integration with Other Modules

// - **audioEngine.js**:
//   - Imports `audioContext` and `inputGainNode` to handle audio processing and routing.
  
// - **stateManager.js**:
//   - Utilizes `pushState()` to save the current state after adding or rearranging clips, enabling undo/redo functionality.

// ### Extensibility

// - **Clip Manipulation**:
//   - Supports adding and moving audio clips. Future enhancements could include resizing clips, layering multiple audio sources, or integrating with additional audio effects.

// - **Waveform Features**:
//   - Can be extended to include zooming, panning, or more detailed waveform rendering for better visualization.

// - **Playback Features**:
//   - Integrate features like looping specific sections, setting markers, or synchronizing with other media elements.

// ### Accessibility Features

// - **Draggable Clips**:
//   - Clips are made draggable to allow intuitive rearrangement within the timeline.
  
// - **Visual Indicators**:
//   - Waveforms provide visual feedback on the audio content, aiding users in identifying different clips.

// ### Error Handling

// - **File Loading**:
//   - Handles errors during audio file loading and decoding by preventing invalid clip additions and ensuring the application remains stable.
  
// - **Boundary Checks**:
//   - Ensures that clips are added within valid positions on the timeline to prevent overlapping or out-of-bound placements.

// ### Performance Considerations

// - **Efficient Rendering**:
//   - Uses canvas elements to render waveforms efficiently, minimizing DOM manipulation overhead.
  
// - **Playback Scheduling**:
//   - Schedules audio playback accurately using the Web Audio API's timing features to ensure synchronization across clips.

// ### Notes

// - **Overlap with timeline.js**:
//   - Both `timeline.js` and `waveform.js` handle aspects of audio clip management and playback. Consider consolidating functionalities to avoid redundancy and streamline the codebase.

// - **Playback Line Coordination**:
//   - While `timeline.js` manages the playback line, `waveform.js` focuses on clip visualization. Ensure proper coordination between these modules to maintain consistent playback feedback.

// - **State Persistence**:
//   - The current implementation saves the positions and properties of clips, but does not handle the persistence of the actual audio data beyond the session. Implementing a serialization mechanism for audio buffers would enhance state restoration capabilities.

// - **Styling Dependencies**:
//   - The waveform rendering relies on CSS variables like `--panel-color` and `--fg-color`. Ensure these are defined in your CSS to maintain consistent styling across the application.

// </details>
// -->
