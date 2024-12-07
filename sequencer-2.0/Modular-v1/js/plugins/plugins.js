// js/plugins.js
import { insertEffects, connectChain, createEffectNode, reverbSend } from '../audioEngine.js';
import { pushState } from '../stateManager.js';
import { updateInsertsUI } from '../uiHandlers.js';

export function addInsertEffect(type = 'EQ', pushHistory = true) {
    const { node } = createEffectNode(type);
    const fx = { type, node };
    insertEffects.push(fx);
    updateInsertsUI();
    connectChain();
    if (pushHistory) pushState();
}

export function removeInsertEffect(idx) {
    insertEffects.splice(idx, 1);
    updateInsertsUI();
    connectChain();
    pushState();
}

export function reorderInsertEffects(dragIndex, dropIndex) {
    const draggedFx = insertEffects.splice(dragIndex, 1)[0];
    insertEffects.splice(dropIndex, 0, draggedFx);
    updateInsertsUI();
    connectChain();
    pushState();
}

export function addSend(type = 'reverb') {
    // For now we have only one reverb send
    const div = document.createElement('div');
    div.className = 'send-slot';
    div.innerHTML = `
        <label>${type} Send:</label>
        <input type="range" min="0" max="1" step="0.01" value="${reverbSend.gain.value}" />
        <select>
            <option value="post">Post-Fader</option>
            <option value="pre">Pre-Fader</option>
        </select>
    `;
    const sendsList = document.getElementById('sends-list');
    sendsList.appendChild(div);

    const slider = div.querySelector('input[type="range"]');
    slider.addEventListener('input', () => {
        reverbSend.gain.value = parseFloat(slider.value);
        pushState();
    });

    const modeSelect = div.querySelector('select');
    modeSelect.addEventListener('change', () => {
        // Not fully implemented
        pushState();
    });
    pushState();
}
