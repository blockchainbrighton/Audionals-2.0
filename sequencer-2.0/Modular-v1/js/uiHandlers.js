// js/uiHandlers.js
import { insertEffects } from './audioEngine.js';
import { addInsertEffect, removeInsertEffect, reorderInsertEffects, addSend } from './plugins.js';
import { undo, redo, savePreset, loadPreset, setFaderFromValue, getCurrentFaderValue, pushState } from './stateManager.js';
import { panNode, masterGain, dbToGain } from './audioEngine.js';
import { drawAutomation } from './automation.js';
import { inputGainNode } from './audioEngine.js'; // Import at top


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
    const { reorderInsertEffects } = await import('./plugins.js');
    reorderInsertEffects(dragIndex, dropIndex);
}

async function onInsertsListClick(e) {
    if (e.target.dataset.action === 'remove') {
        const slot = e.target.closest('.plugin-slot');
        const idx = parseInt(slot.getAttribute('data-index'), 10);
        const { removeInsertEffect } = await import('./plugins.js');
        removeInsertEffect(idx);
    }
}

async function onAddPlugin() {
    const type = prompt('Enter plugin type: EQ, Compressor, Delay, Distortion', 'EQ');
    if (type) {
        const { addInsertEffect } = await import('./plugins.js');
        addInsertEffect(type);
    }
}