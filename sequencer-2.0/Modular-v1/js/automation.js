// js/automation.js
import { dbToGain } from './audioEngine.js';
import { audioContext, masterGain } from './audioEngine.js';
import { pushState } from './stateManager.js';

export let automationPoints = [];

export function initAutomation() {
    const automationTimeline = document.getElementById('automation-timeline');
    automationTimeline.addEventListener('mousedown', onMouseDown);
    automationTimeline.addEventListener('dblclick', onDoubleClick);
}

function onMouseDown(e) {
    if (e.button !== 0) return;
    const automationTimeline = e.currentTarget;
    const rect = automationTimeline.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const value = 1 - (y / rect.height); 
    automationPoints.push({ x, value });
    drawAutomation();
    pushState();
}

function onDoubleClick(e) {
    const automationTimeline = e.currentTarget;
    const rect = automationTimeline.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (automationPoints.length > 0) {
        let closest = -1;
        let closestDist = Infinity;
        for (let i=0; i<automationPoints.length; i++) {
            const dx = automationPoints[i].x - x;
            const dy = (1-automationPoints[i].value)*rect.height - y;
            const dist = dx*dx+dy*dy;
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        }
        if (closest !== -1 && closestDist < 1000) {
            automationPoints.splice(closest,1);
            drawAutomation();
            pushState();
        }
    }
}

export function drawAutomation() {
    const automationTimeline = document.getElementById('automation-timeline');
    automationTimeline.innerHTML = '';
    const rect = automationTimeline.getBoundingClientRect();
    automationPoints.sort((a,b) => a.x - b.x);

    automationPoints.forEach(p => {
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.width = '8px';
        dot.style.height = '8px';
        dot.style.background = '#f00';
        dot.style.borderRadius = '50%';
        dot.style.left = (p.x - 4) + 'px';
        dot.style.top = ((1-p.value)*rect.height - 4) + 'px';
        automationTimeline.appendChild(dot);
    });

    applyAutomation();
}

function applyAutomation() {
    if (automationPoints.length >= 2) {
        masterGain.gain.cancelScheduledValues(0);
        const now = audioContext.currentTime;
        const duration = 10; 
        masterGain.gain.setValueAtTime(dbToGain(-10), now);
        const totalWidth = document.getElementById('automation-timeline').clientWidth;
        for (let i=0; i<automationPoints.length; i++) {
            const p = automationPoints[i];
            const ratio = p.x / totalWidth;
            const time = now + ratio * duration;
            const faderMin = -60, faderMax = 0;
            const dBVal = faderMin + p.value*(faderMax-faderMin);
            masterGain.gain.linearRampToValueAtTime(dbToGain(dBVal), time);
        }
    }
}
