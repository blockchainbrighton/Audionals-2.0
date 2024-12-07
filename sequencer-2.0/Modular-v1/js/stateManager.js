// js/stateManager.js
import { inputGainNode, panNode, masterGain, insertEffects } from './audioEngine.js';
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
