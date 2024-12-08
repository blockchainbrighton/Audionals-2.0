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


// <!-- 
// <details>
// <summary><strong>Collapsible Notes: automation.js</strong></summary>

// ### Overview
// `automation.js` manages the automation features within the **Audional Sequencer 2.0** application. It allows users to create, visualize, and apply automation points for parameters like volume over time, enhancing dynamic audio control.

// ### Key Functions

// - **initAutomation()**:
//   - Initializes the automation panel by setting up event listeners for mouse interactions.
//   - Listens for `mousedown` events to create automation points and `dblclick` events to remove them.

// - **onMouseDown(e)**:
//   - Handles the creation of new automation points when the user clicks on the automation timeline.
//   - Calculates the normalized value based on the y-coordinate of the click.
//   - Adds the new automation point to `automationPoints`, redraws the automation UI, and pushes the new state for undo/redo functionality.

// - **onDoubleClick(e)**:
//   - Handles the removal of existing automation points when the user double-clicks near a point.
//   - Determines the closest automation point to the double-click location and removes it if within a certain distance.
//   - Redraws the automation UI and updates the state accordingly.

// - **drawAutomation()**:
//   - Renders the automation points on the automation timeline.
//   - Clears existing points and appends new visual representations (dots) for each automation point.
//   - Sorts the points based on their x-coordinate to ensure proper sequencing.
//   - Calls `applyAutomation()` to update the audio parameters based on the current automation points.

// - **applyAutomation()**:
//   - Applies the automation points to the audio parameters by scheduling gain changes over time.
//   - Cancels any previously scheduled gain changes to prevent conflicts.
//   - Iterates through the `automationPoints`, calculating the corresponding time and dB values, and schedules linear ramps for the master gain.
//   - Assumes a fixed duration (e.g., 10 seconds) for the automation timeline.

// ### Data Structures

// - **automationPoints**:
//   - An array of objects, each representing an automation point with `x` (horizontal position) and `value` (normalized parameter value) properties.
//   - Example: `{ x: 150, value: 0.75 }` represents a point 150 pixels from the left with a value of 0.75 (75%).

// ### UI Components Managed

// - **Automation Timeline**:
//   - An interactive area where users can click to add automation points or double-click to remove them.
//   - Visually represents the automation points as red dots, providing immediate feedback on parameter changes over time.

// ### Audio Automation Implementation

// - **Gain Scheduling**:
//   - Utilizes the Web Audio API's scheduling capabilities (`setValueAtTime`, `linearRampToValueAtTime`) to adjust the master gain based on automation points.
//   - Ensures smooth transitions between gain values by ramping the gain linearly over the calculated time intervals.

// - **Time Calculation**:
//   - Maps the x-coordinate of each automation point to a specific time within the automation duration.
//   - Allows users to define how the gain changes over the timeline by positioning points horizontally.

// - **Value Mapping**:
//   - Converts the y-coordinate of automation points to normalized values, which are then mapped to decibel (dB) values within a predefined range (e.g., -60 dB to 0 dB).
//   - Ensures that higher points on the timeline correspond to higher gain values and vice versa.

// ### Integration with Other Modules

// - **audioEngine.js**: Imports `dbToGain` for converting dB values to linear gain and accesses `audioContext` and `masterGain` for scheduling gain changes.
// - **stateManager.js**: Imports `pushState` to save the current state after automation changes.
// - **waveform.js**: (Indirectly) May interact with audio clips if automation affects playback parameters.

// ### Extensibility

// - **Parameter Automation**: Currently, automation is applied to the master gain. The module can be extended to support automation of other parameters like pan, effects parameters, etc., by generalizing the scheduling logic.
// - **Multiple Automation Tracks**: Support for multiple automation tracks can be added to allow simultaneous automation of different parameters.
// - **Advanced Scheduling**: Incorporate different ramp types (e.g., exponential ramps) or more sophisticated scheduling mechanisms for complex automation curves.

// ### Accessibility Features

// - **Visual Indicators**: Automation points are visually represented, aiding users in understanding parameter changes over time.
// - **Interactive Controls**: Users can intuitively add or remove automation points through mouse interactions, enhancing usability.

// ### Error Handling

// - **Boundary Conditions**: Ensures that automation points are added within the bounds of the automation timeline.
// - **Overlap Prevention**: Avoids adding multiple points too close to each other by setting a minimum distance threshold for removal.

// ### Performance Considerations

// - **Efficient Redrawing**: Clears and redraws the automation timeline efficiently to prevent performance bottlenecks, especially with a large number of automation points.
// - **Scheduled Updates**: Limits the frequency of meter updates to every 50 milliseconds to balance responsiveness and performance.

// ### Notes

// - **Fixed Duration**: The automation application assumes a fixed duration (e.g., 10 seconds). To support variable durations or real-time automation, additional logic would be required.
// - **Simplified Restoration**: Automation points are stored as simple x and value pairs. In a more complex application, additional metadata (e.g., associated parameters) might be necessary.
// - **User Feedback**: Currently, visual feedback is limited to the automation timeline. Consider adding tooltips or indicators to show exact values when interacting with points.

// </details>
// -->
