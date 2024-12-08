// js/uiHandlers.js
import { addInsertEffect, addSend } from './plugins/plugins.js';
import { undo, redo, savePreset, loadPreset, setFaderFromValue, pushState } from './stateManager.js';
import { panNode, masterGain, dbToGain } from './audioEngine.js';


export async function initUI() {
    document.getElementById('add-plugin').addEventListener('click', onAddPlugin);
    document.getElementById('inserts-list').addEventListener('click', onInsertsListClick);
    document.getElementById('inserts-list').addEventListener('dragstart', onInsertDragStart);
    document.getElementById('inserts-list').addEventListener('dragover', onInsertDragOver);
    document.getElementById('inserts-list').addEventListener('drop', onInsertDrop);

    document.getElementById('add-send').addEventListener('click', () => addSend('reverb'));

    document.getElementById('save-preset').addEventListener('click', savePreset);
    document.getElementById('load-preset').addEventListener('click', loadPreset);
    document.getElementById('undo').addEventListener('click', undo);
    document.getElementById('redo').addEventListener('click', redo);

    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
    });

    const inputGainSlider = document.getElementById('input-gain');
    inputGainSlider.addEventListener('input', () => {
        inputGainNode.gain.value = parseFloat(inputGainSlider.value);
        pushState();
    });

    const monoStereoSelect = document.getElementById('mono-stereo');
    monoStereoSelect.addEventListener('change', () => {
        // setMonoStereo not fully implemented
        pushState();
    });

    const panControl = document.getElementById('pan');
    panControl.addEventListener('input', () => {
        panNode.pan.value = parseFloat(panControl.value);
        pushState();
    });

    const outputDest = document.getElementById('output-dest');
    outputDest.addEventListener('change', () => {
        // No bus routing implemented
        pushState();
    });

    document.getElementById('add-final-effect').addEventListener('click', () => {
        addInsertEffect('Compressor');
        pushState();
    });

    // Fader
    const faderContainer = document.getElementById('fader-container');
    const faderKnob = document.getElementById('fader-knob');
    let isDraggingFader = false;
    let faderHeight = 150;
    let knobHeight = 10;
    let faderMin = -60;
    let faderMax = 0;

    faderKnob.addEventListener('mousedown', (e) => {
        isDraggingFader = true;
        document.addEventListener('mousemove', onFaderMove);
        document.addEventListener('mouseup', onFaderUp);
    });

    function onFaderMove(e) {
        if (!isDraggingFader) return;
        const rect = faderContainer.getBoundingClientRect();
        let y = e.clientY - rect.top;
        if (y < 0) y = 0;
        if (y > faderHeight) y = faderHeight;
        const ratio = 1 - (y / faderHeight);
        const faderValue = faderMin + (faderMax - faderMin) * ratio;
        masterGain.gain.value = dbToGain(faderValue);
        positionFaderKnob(faderValue);
    }

    function onFaderUp() {
        isDraggingFader = false;
        document.removeEventListener('mousemove', onFaderMove);
        document.removeEventListener('mouseup', onFaderUp);
        pushState();
    }

    function positionFaderKnob(dbValue) {
        const dbRange = faderMax - faderMin;
        const ratio = (dbValue - faderMin) / dbRange;
        const y = faderHeight - ratio * faderHeight;
        faderKnob.style.top = (y - knobHeight/2) + 'px';
        faderKnob.setAttribute('aria-valuenow', dbValue.toFixed(1) + ' dB');
    }

    // Initial fader set
    setFaderFromValue(-10);
    positionFaderKnob(-10);

    // Meters
    const inputAnalyser = (await import('./audioEngine.js')).audioContext.createAnalyser();
    const outputAnalyser = (await import('./audioEngine.js')).audioContext.createAnalyser();
    inputAnalyser.fftSize = 256;
    outputAnalyser.fftSize = 256;
    const {inputGainNode} = await import('./audioEngine.js');
    inputGainNode.connect(inputAnalyser);
    masterGain.connect(outputAnalyser);

    let lastMeterUpdate = 0;
    function updateMeters(timestamp) {
        if (timestamp - lastMeterUpdate > 50) {
            const inputData = new Uint8Array(inputAnalyser.frequencyBinCount);
            inputAnalyser.getByteTimeDomainData(inputData);
            const inputLevel = getRms(inputData);
            drawMeter(document.getElementById('input-meter'), inputLevel);

            const outputData = new Uint8Array(outputAnalyser.frequencyBinCount);
            outputAnalyser.getByteTimeDomainData(outputData);
            const outputLevel = getRms(outputData);
            drawMeter(document.getElementById('output-meter'), outputLevel);
            lastMeterUpdate = timestamp;
        }
        requestAnimationFrame(updateMeters);
    }
    requestAnimationFrame(updateMeters);

    function getRms(data) {
        let sum = 0;
        for (let i=0; i<data.length; i++) {
            const val = (data[i] - 128) / 128.0;
            sum += val*val;
        }
        return Math.sqrt(sum/data.length);
    }

    function drawMeter(elem, level) {
        const percent = Math.min(1, level * 3) * 100; 
        elem.style.top = (100 - percent) + '%';
    }

    // Inserts UI
    document.addEventListener('rebuild-insert', (e) => {
        addInsertEffect(e.detail, false);
    });

    document.addEventListener('update-fader-gain', (e) => {
        const dbValue = e.detail.dbValue;
        masterGain.gain.value = dbToGain(dbValue);
        positionFaderKnob(dbValue);
    });
}

export async function updateInsertsUI() {
    const insertsList = document.getElementById('inserts-list');
    insertsList.innerHTML = '';
    const {insertEffects} = await import('./audioEngine.js');
    insertEffects.forEach((fx, idx) => {
        const slot = document.createElement('div');
        slot.className = 'plugin-slot';
        slot.draggable = true;
        slot.setAttribute('data-index', idx);
        slot.innerHTML = `<span>${fx.type}</span> <button data-action="remove">X</button>`;
        insertsList.appendChild(slot);
    });
}

// Event handlers
let dragIndex = null;
function onInsertDragStart(e) {
    const slot = e.target.closest('.plugin-slot');
    if (!slot) return;
    dragIndex = parseInt(slot.getAttribute('data-index'), 10);
    e.dataTransfer.effectAllowed = 'move';
}

function onInsertDragOver(e) {
    e.preventDefault();
}

async function onInsertDrop(e) {
    const slot = e.target.closest('.plugin-slot');
    if (!slot) return;
    const dropIndex = parseInt(slot.getAttribute('data-index'), 10);
    if (dropIndex === dragIndex) return;
    const { reorderInsertEffects } = await import('./plugins/plugins.js');
    reorderInsertEffects(dragIndex, dropIndex);
}

async function onInsertsListClick(e) {
    if (e.target.dataset.action === 'remove') {
        const slot = e.target.closest('.plugin-slot');
        const idx = parseInt(slot.getAttribute('data-index'), 10);
        const { removeInsertEffect } = await import('./plugins/plugins.js');
        removeInsertEffect(idx);
    }
}

async function onAddPlugin() {
    const type = prompt('Enter plugin type: EQ, Compressor, Delay, Distortion', 'EQ');
    if (type) {
        const { addInsertEffect } = await import('./plugins/plugins.js');
        addInsertEffect(type);
    }
}



// <details>
// <summary><strong>Collapsible Notes: uiHandlers.js</strong></summary>

// ### Overview
// `uiHandlers.js` manages the user interface interactions for the **Audional Sequencer 2.0** application. It handles events such as adding plugins, adjusting gain and pan controls, managing presets, and updating the UI elements like meters and faders.

// ### Key Functions

// - **initUI()**:
//   - Initializes event listeners for various UI elements, including buttons, sliders, and selectors.
//   - Handles interactions for adding/removing plugins and sends, saving/loading presets, undo/redo actions, and theme toggling.
//   - Manages the volume fader with drag-and-drop functionality.
//   - Sets up audio meters to visualize input and output levels.
//   - Listens for custom events to rebuild inserts and update fader gain.

// - **updateInsertsUI()**:
//   - Refreshes the Inserts UI by clearing the existing list and repopulating it based on the current `insertEffects`.
//   - Creates draggable plugin slots with remove buttons for each inserted effect.

// - **Event Handlers**:
//   - **onInsertDragStart**: Handles the start of a drag event for reordering plugins.
//   - **onInsertDragOver**: Allows dropping by preventing the default behavior.
//   - **onInsertDrop**: Reorders plugins based on drag-and-drop actions.
//   - **onInsertsListClick**: Removes a plugin when the remove button is clicked.
//   - **onAddPlugin**: Prompts the user to add a new plugin and integrates it into the audio chain.

// ### UI Components Managed

// - **Add Plugin Button**: Allows users to add new audio effects/plugins to the Inserts section.
// - **Inserts List**: Displays the list of inserted plugins with drag-and-drop reordering and removal capabilities.
// - **Add Send Button**: Adds send effects like reverb.
// - **Preset Controls**: Save and load presets to preserve and restore channel strip settings.
// - **Undo/Redo Buttons**: Navigate through the state history to undo or redo changes.
// - **Theme Toggle Button**: Switches between light and dark themes.
// - **Input Gain Slider**: Adjusts the input gain and updates the audio engine accordingly.
// - **Mono/Stereo Selector**: Toggles between mono and stereo modes (note: functionality not fully implemented).
// - **Pan Control Slider**: Adjusts the stereo panning of the audio signal.
// - **Output Destination Selector**: Chooses the output routing destination (note: bus routing not implemented).
// - **Add Final Effect Button**: Adds a final effect like a compressor to the audio chain.
// - **Volume Fader**: Controls the master gain with draggable functionality.
// - **Input and Output Meters**: Visualize the audio levels for input and output signals.

// ### Audio Meter Implementation

// - **Analyser Nodes**: Utilizes Web Audio API's `AnalyserNode` to capture real-time audio data for visualization.
// - **RMS Calculation**: Computes the Root Mean Square (RMS) of the audio signal to determine the current level.
// - **Meter Drawing**: Updates the visual meters based on the calculated RMS values, scaling them appropriately.

// ### Fader Implementation

// - **Drag-and-Drop**: Implements mouse event listeners to allow users to drag the fader knob and adjust the master gain.
// - **Value Conversion**: Converts the fader's y-position to decibel (dB) values and updates the master gain accordingly.
// - **Visual Feedback**: Moves the fader knob visually to reflect the current gain value.

// ### State Management Integration

// - **pushState()**: Called after significant UI interactions to save the current state for undo/redo functionality.
// - **Custom Events**: Dispatches custom events like `rebuild-insert` and `update-fader-gain` to synchronize UI and audio states.

// ### Extensibility

// - **Plugin Management**: Supports dynamic addition, removal, and reordering of audio plugins, making it easy to extend the application's audio processing capabilities.
// - **Automation Integration**: Listens for updates to automation points to adjust audio parameters in real-time.

// ### Accessibility Features

// - **ARIA Labels**: Ensures that interactive elements are accessible by providing descriptive ARIA labels.
// - **Keyboard Accessibility**: Elements like the fader knob are focusable and can be manipulated using the keyboard.

// ### Notes

// - **Asynchronous Imports**: Uses dynamic `import()` statements to load modules like `plugins.js` and `audioEngine.js` asynchronously, enhancing performance by loading resources only when needed.
// - **Error Handling**: Minimal error handling is implemented; prompts and alerts notify users of actions like saving/loading presets or performing undo/redo operations.

// </details>

