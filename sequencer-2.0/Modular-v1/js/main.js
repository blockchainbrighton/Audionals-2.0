// js/main.js
import { initAudioEngine } from './audioEngine.js';
import { initUI } from './uiHandlers.js';
import { initStateManager } from './stateManager.js';
import { initAutomation } from './automation.js';
import { initTimeline } from './timeline.js';

(async function() {
    await initAudioEngine();
    initUI();
    initStateManager();
    initAutomation();
    initTimeline(); // Initialize the new multi-track timeline
})();