// js/stateManager.js
import { inputGainNode, panNode, insertEffects } from './audioEngine.js';
import { automationPoints, drawAutomation } from './automation.js';
import { audioClips } from './waveform.js';
import { updateInsertsUI } from './uiHandlers.js';

let stateStack = [];
let redoStack = [];

export function initStateManager() {
    pushState();
}

export function pushState() {
    const state = {
        inputGain: document.getElementById('input-gain').value,
        mode: document.getElementById('mono-stereo').value,
        inserts: insertEffects.map(fx => fx.type),
        sends: [
            { type: 'reverb', sendLevel: document.querySelector('.send-slot input[type="range"]')?.value || 0 }
        ],
        fader: getCurrentFaderValue(),
        pan: document.getElementById('pan').value,
        output: document.getElementById('output-dest').value,
        automationPoints: automationPoints.slice(),
        // Clips cannot be fully serialized due to AudioBuffer
        // In a real scenario, store references or partial data
        clips: audioClips.map(c => ({
            startTime: c.startTime,
            x: c.x,
            width: c.width,
            duration: c.duration
        }))
    };
    stateStack.push(JSON.stringify(state));
    redoStack = [];
}

export function undo() {
    if (stateStack.length > 1) {
        const current = stateStack.pop();
        redoStack.push(current);
        const prev = stateStack[stateStack.length - 1];
        restoreState(JSON.parse(prev));
        alert('Undo performed.');
    }
}

export function redo() {
    if (redoStack.length > 0) {
        const next = redoStack.pop();
        stateStack.push(next);
        restoreState(JSON.parse(next));
        alert('Redo performed.');
    }
}

export function restoreState(stateObj) {
    const inputGainSlider = document.getElementById('input-gain');
    const monoStereoSelect = document.getElementById('mono-stereo');
    const panControl = document.getElementById('pan');
    const outputDest = document.getElementById('output-dest');

    inputGainSlider.value = stateObj.inputGain;
    inputGainNode.gain.value = parseFloat(stateObj.inputGain);
    monoStereoSelect.value = stateObj.mode;
    // SetMonoStereo not fully implemented

    insertEffects.splice(0, insertEffects.length);
    updateInsertsUI(); // clear UI
    stateObj.inserts.forEach(fxType => {
        // Rebuild inserts (Assumes addInsertEffect available globally or re-initialize)
        // This is a simplified restore. In a fully modular scenario, you'd import addInsertEffect.
        // For brevity, we emulate the logic:
        const event = new CustomEvent('rebuild-insert', {detail: fxType});
        document.dispatchEvent(event);
    });

    // Reverb send
    const sendSlider = document.querySelector('.send-slot input[type="range"]');
    if (sendSlider) sendSlider.value = stateObj.sends[0].sendLevel;

    setFaderFromValue(stateObj.fader);
    panControl.value = stateObj.pan;
    panNode.pan.value = parseFloat(stateObj.pan);

    outputDest.value = stateObj.output;

    // Automation
    automationPoints.splice(0, automationPoints.length, ...stateObj.automationPoints);
    drawAutomation();
    // Clips restoration would require reloading files or handling references.
}

export function savePreset() {
    const state = JSON.parse(stateStack[stateStack.length-1]);
    localStorage.setItem('channelStripPreset', JSON.stringify(state));
    alert('Preset saved!');
}

export function loadPreset() {
    const presetString = localStorage.getItem('channelStripPreset');
    if (!presetString) {
        alert('No preset found.');
        return;
    }
    const preset = JSON.parse(presetString);
    restoreState(preset);
    alert('Preset loaded!');
    pushState();
}

let faderValue = -10; // default
export function setFaderFromValue(dbValue) {
    faderValue = dbValue;
    document.dispatchEvent(new CustomEvent('update-fader-gain', {detail: {dbValue}}));
}

export function getCurrentFaderValue() {
    return faderValue;
}


// <!-- 
// <details>
// <summary><strong>Collapsible Notes: stateManager.js</strong></summary>

// ### Overview
// `stateManager.js` handles the state management for the **Audional Sequencer 2.0** application. It provides functionalities for saving, restoring, undoing, and redoing the application's state, ensuring that user interactions can be reversed or reapplied as needed.

// ### Key Functions

// - **initStateManager()**:
//   - Initializes the state manager by pushing the initial state onto the state stack.

// - **pushState()**:
//   - Captures the current state of various UI elements and audio settings.
//   - Serializes the state as a JSON string and pushes it onto the `stateStack`.
//   - Clears the `redoStack` to ensure a linear undo/redo history.

// - **undo()**:
//   - Reverts the application to the previous state by popping the current state from the `stateStack` and restoring the preceding state.
//   - Pushes the current state onto the `redoStack` to allow for redo operations.
//   - Alerts the user that an undo has been performed.

// - **redo()**:
//   - Reapplies a previously undone state by popping from the `redoStack` and restoring it.
//   - Pushes the reapplied state back onto the `stateStack`.
//   - Alerts the user that a redo has been performed.

// - **restoreState(stateObj)**:
//   - Applies a given state object to the application by updating UI elements and audio nodes.
//   - Updates input gain, mode (Mono/Stereo), inserts, sends, fader value, pan control, and output destination based on the provided state.
//   - Rebuilds the inserts UI by dispatching custom events for each inserted effect type.
//   - Restores automation points and updates the automation timeline.
//   - Note: Restoration of audio clips requires handling references or reloading files, which is not fully implemented.

// - **savePreset()**:
//   - Saves the current state to the browser's `localStorage` under the key `'channelStripPreset'`.
//   - Alerts the user that the preset has been saved.

// - **loadPreset()**:
//   - Loads a preset from `localStorage` if available.
//   - Restores the loaded state and alerts the user.
//   - Pushes the loaded state onto the `stateStack` for continuity.

// - **setFaderFromValue(dbValue)** and **getCurrentFaderValue()**:
//   - Manage the master fader's value, allowing it to be set programmatically and retrieved as needed.

// ### State Components Captured

// - **Input Gain**: The current value of the input gain slider.
// - **Mode**: The selected mode (Mono/Stereo).
// - **Inserts**: An array of inserted audio effect types.
// - **Sends**: An array of send effects with their respective levels.
// - **Fader**: The current master fader value in decibels.
// - **Pan**: The current pan control value.
// - **Output Destination**: The selected output routing destination.
// - **Automation Points**: An array of automation points for volume changes over time.
// - **Clips**: Partial data of audio clips, including start time, position, width, and duration.

// ### Integration with Other Modules

// - **audioEngine.js**: Imports audio nodes like `inputGainNode` and `panNode` to manipulate audio properties based on the state.
// - **automation.js**: Imports `automationPoints` and `drawAutomation` to manage and visualize automation.
// - **waveform.js**: Imports `audioClips` to handle audio clip data (note: full restoration requires more comprehensive handling).
// - **uiHandlers.js**: Imports `updateInsertsUI` to refresh the Inserts UI based on the current state.

// ### Undo/Redo Mechanism

// - **State Stack (`stateStack`)**: Stores the history of states, allowing traversal backward (undo).
// - **Redo Stack (`redoStack`)**: Temporarily holds states that have been undone, allowing them to be reapplied.
// - **State Serialization**: States are serialized as JSON strings to ensure they can be stored and retrieved accurately.
// - **Limitations**:
//   - The mechanism does not handle complex objects like `AudioBuffer` directly and instead stores partial data.
//   - Restoration of audio clips requires additional handling beyond simple serialization.

// ### Preset Management

// - **Saving Presets**: Serializes the current state and stores it in `localStorage` for persistence across sessions.
// - **Loading Presets**: Retrieves and applies the saved state from `localStorage`, allowing users to quickly switch between predefined configurations.

// ### Fader Management

// - **setFaderFromValue(dbValue)**:
//   - Sets the master fader's value and dispatches a custom event to update the UI accordingly.
// - **getCurrentFaderValue()**:
//   - Retrieves the current value of the master fader for state capturing.

// ### Error Handling

// - **Undo/Redo Limits**: Prevents undoing beyond the initial state and redoing beyond the latest state.
// - **Preset Loading**: Alerts the user if no preset is found when attempting to load.

// ### Extensibility

// - **State Components**: Additional state components can be easily integrated by extending the state object in `pushState()` and updating `restoreState()` accordingly.
// - **Modular Restoration**: The restoration process can be enhanced by modularizing the handling of different state components, facilitating easier maintenance and scalability.

// ### Notes

// - **Serialization Limitations**: Complex audio data like `AudioBuffer` objects cannot be fully serialized. The current implementation stores partial data, which may not be sufficient for complete restoration.
// - **User Feedback**: Utilizes browser alerts to notify users of actions like undo, redo, save, and load operations. For a better user experience, consider implementing more subtle notification mechanisms.
// - **State Consistency**: Ensures that the UI and audio engine remain synchronized by meticulously capturing and restoring relevant state components.

// </details>
// -->
