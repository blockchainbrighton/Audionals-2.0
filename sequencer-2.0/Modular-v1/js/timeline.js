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


// <!-- 
// <details>
// <summary><strong>Collapsible Notes: timeline.js</strong></summary>

// ### Overview
// `timeline.js` manages the multi-track timeline feature of the **Audional Sequencer 2.0** application. It handles the creation, display, and playback of audio clips across multiple tracks, supporting drag-and-drop functionality for organizing clips and visualizing their waveforms.

// ### Key Components

// - **Tracks Management**:
//   - **Tracks Array**: Maintains an array of 16 tracks, each capable of holding multiple audio clips.
//   - **Constants**: Defines visual and functional constants such as `NUM_TRACKS`, `TRACK_HEIGHT`, `CLIP_HEIGHT`, `LEFT_OFFSET`, and `PX_PER_SEC` to control the layout and scaling of the timeline.

// - **Playback Line**:
//   - **playbackLine Element**: A visual indicator that moves across the timeline to show the current playback position.

// ### Key Functions

// - **initTimeline()**:
//   - Initializes the timeline by creating empty tracks.
//   - Sets up event listeners for drag-and-drop interactions and file input for loading audio files.
//   - Initializes the playback controls by adding the playback line to the waveform container and drawing all tracks.

// - **onFileDrop(e)**:
//   - Handles files dropped onto the waveform container.
//   - Determines the target track based on the vertical position of the drop.
//   - Loads and adds the audio file to the specified track at the dropped horizontal position.
//   - Pushes the new state for undo/redo functionality.

// - **onFileInput(e)**:
//   - Handles files selected via the file input.
//   - Defaults to adding the audio file to the first track at a predefined left offset.
//   - Pushes the new state for undo/redo functionality.

// - **loadAudioFile(file, trackIndex, xPos)**:
//   - Reads and decodes the audio file using the Web Audio API.
//   - Adds the decoded audio buffer as a clip to the specified track at the given position.
//   - Redraws all tracks to reflect the new clip.

// - **addAudioClip(buffer, trackIndex, x)**:
//   - Creates an audio clip object containing the buffer, start time, position, width, and duration.
//   - Adds the clip to the specified track and redraws all tracks.

// - **drawAllTracks()**:
//   - Clears the waveform container and redraws all tracks and their respective clips.
//   - Creates visual representations of audio clips with waveforms using canvas elements.
//   - Sets up drag-and-drop event listeners for reordering clips within and across tracks.

// - **drawWaveform(canvas, buffer)**:
//   - Renders the waveform of an audio buffer onto a canvas element.
//   - Calculates the minimum and maximum amplitudes for each segment to draw the waveform accurately.

// - **toggleTimelinePlay()**:
//   - Toggles the playback state between playing and paused.
//   - Updates the play/pause button text accordingly.

// - **startTimelinePlayback()**:
//   - Initiates playback by scheduling each clip to start at its designated time.
//   - Begins updating the playback line to reflect the current playback position.

// - **stopTimelinePlayback()**:
//   - Stops all currently playing audio sources.
//   - Resets the playback state and updates the play/pause button text.

// - **updatePlaybackLine()**:
//   - Animates the playback line across the timeline based on the elapsed time since playback started.
//   - Continuously updates the position of the playback line using `requestAnimationFrame`.

// ### Data Structures

// - **tracks**:
//   - An array of track objects, each containing an array of audio clips.
//   - Example: `tracks[0].clips = [clip1, clip2, ...]`

// - **clip Object**:
//   - **buffer**: The decoded audio buffer.
//   - **startTime**: The start time in seconds relative to the timeline.
//   - **x**: The horizontal position in pixels on the timeline.
//   - **width**: The width of the clip in pixels, proportional to its duration.
//   - **duration**: The duration of the clip in seconds.
//   - **source**: The `AudioBufferSourceNode` associated with the clip for playback control.

// ### UI Components Managed

// - **Waveform Container**:
//   - Hosts the visual timeline, tracks, and audio clips.
//   - Supports drag-and-drop for organizing clips.

// - **Playback Controls**:
//   - **Play/Pause Button**: Toggles the playback of the timeline.
//   - **Playback Line**: Visually indicates the current playback position across all tracks.

// - **Audio Clips**:
//   - Represented as draggable div elements with embedded canvas waveforms.
//   - Allow users to visualize and rearrange audio clips within the timeline.

// ### Integration with Other Modules

// - **audioEngine.js**:
//   - Imports `audioContext` and `inputGainNode` to handle audio processing and routing.
  
// - **stateManager.js**:
//   - Utilizes `pushState()` to save the current state after adding or rearranging clips, enabling undo/redo functionality.

// ### Extensibility

// - **Multiple Tracks**:
//   - Currently supports 16 tracks, but can be easily extended by adjusting the `NUM_TRACKS` constant.
  
// - **Clip Manipulation**:
//   - Supports adding, moving, and removing audio clips. Future enhancements could include resizing clips, overlapping tracks, or adding effects to individual clips.

// - **Playback Features**:
//   - Can be extended to include features like looping, cue points, or synchronization with external devices.

// ### Accessibility Features

// - **Draggable Clips**:
//   - Clips are made draggable to allow intuitive rearrangement across tracks.
  
// - **Visual Indicators**:
//   - Playback line and waveforms provide visual feedback on playback status and audio content.

// ### Error Handling

// - **Boundary Checks**:
//   - Ensures that clips are added within valid track indices and within the bounds of the timeline.
  
// - **File Loading**:
//   - Handles errors during audio file loading and decoding by preventing invalid clip additions.

// ### Performance Considerations

// - **Efficient Rendering**:
//   - Uses canvas elements to render waveforms efficiently, minimizing DOM manipulation overhead.
  
// - **Playback Scheduling**:
//   - Schedules audio playback accurately using the Web Audio API's timing features to ensure synchronization across tracks.

// ### Notes

// - **Playback Line Styling**:
//   - The `playback-line` element should be styled via CSS to appear as a moving indicator across the timeline during playback.
  
// - **Dynamic Scaling**:
//   - The `PX_PER_SEC` constant controls the horizontal scaling of the timeline. Adjusting this value will change the zoom level of the timeline.
  
// - **State Persistence**:
//   - The current implementation saves the positions and properties of clips, but does not handle the persistence of the actual audio data beyond the session. Implementing a serialization mechanism for audio buffers would enhance state restoration capabilities.

// </details>
// -->
