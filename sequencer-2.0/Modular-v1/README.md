# Web Channel Strip Application (Modularized Version)

This project is a web-based, standalone application that simulates a Logic Pro-style channel strip using the Web Audio API. It has been refactored into a modular codebase for easier maintenance and scalability. The application allows you to process real-time audio (or imported audio files) with inserts, sends, automation, and more.

## Features

1. **Signal Path Simulation**:  
   - Real-time audio input via `getUserMedia` (microphone).  
   - Mono/stereo modes.  
   - Flexible routing through inserts, sends, and main output.

2. **Core Components**:  
   - **Input**: Gain control, metering.  
   - **Inserts**: Up to 15 plugin slots with support for EQ, Compression, Delay, Distortion. Drag-and-drop reordering, bypass, and parameter adjustments possible.  
   - **Sends**: Create auxiliary sends (e.g., Reverb send) with adjustable levels.  
   - **Fader**: A volume fader with dB markers and a stereo pan control.  
   - **Output**: Output routing (main or bus) and final effects (e.g., limiter).

3. **Effects Integration**:  
   - Built-in effects (EQ, Compressor, Delay, Distortion).  
   - Modular architecture for adding more effects in the future.

4. **Automation**:  
   - Volume automation timeline: Add and remove points to shape volume over time.  
   - Visual automation timeline with simple point-based editing.

5. **Presets and Settings**:  
   - Save and load presets via `localStorage`.  
   - Undo/Redo system for user actions.

6. **Audio File Import and Timeline**:  
   - Drag and drop or browse audio files.  
   - Display waveforms and position audio clips along a timeline.  
   - Play/pause timeline for arranged clips through the channel strip.

7. **Accessibility & Theming**:  
   - Light/Dark mode toggle.  
   - ARIA labels and keyboard navigation focus. More improvements possible.

## File Structure

project/ ├─ index.html ├─ css/ │ └─ style.css ├─ js/ │ ├─ main.js # Entry point, initializes all modules │ ├─ audioEngine.js # Core audio routing, node creation, and audio context │ ├─ uiHandlers.js # Manages UI initialization, event listeners, and meters │ ├─ plugins.js # Insert effects and send management │ ├─ automation.js # Automation timeline logic │ ├─ waveform.js # Audio file loading, waveform drawing, and clip handling │ ├─ stateManager.js # Undo/redo, presets, state saving/loading ├─ assets/ │ └─ ... # Any additional assets like IR files for reverb └─ README.md

## How to Run

1. Host the project locally with a development server (e.g., `npx http-server` or `python3 -m http.server`).  
   **Note:** Loading via `file://` may cause module import issues. A local server ensures proper ES module handling.

2. Open `http://localhost:8080` (or whichever port your dev server is on) in your browser.

3. Grant microphone access if prompted (for live input). If not granted, the channel will still work but with silent input unless you load audio files.

## Working with the Modular Framework

### Adding New Effects

- Create a new effect node in `audioEngine.js` in the `createEffectNode` function. Assign parameters and connect it similarly to existing effects.
- The UI for the effect is currently basic. For more complex UIs, integrate UI logic in `uiHandlers.js` or create a dedicated module.

### Modifying the Signal Path

- The signal flow is defined in `audioEngine.js` in `connectChain()`. Insert effects are stored in `insertEffects`, and you can alter how nodes connect there.

### Improving Automation

- The `automation.js` module currently applies automation over a fixed 10-second duration as a demo.  
- For a production-quality system, integrate timeline/time-based playback logic and schedule parameter automation with `setValueAtTime`.

### Undo/Redo and State Management

- `stateManager.js` stores and restores essential parameters.  
- Extend `restoreState()` and `pushState()` as you add features to ensure all relevant state is captured.  
- For complex serialization (like `AudioBuffer`), store references or implement an asset management system.

### Timeline and Waveforms

- `waveform.js` handles loading audio files, drawing their waveforms on a canvas, and managing clip positions.  
- For more advanced features (zooming, snapping, multiple tracks), further modularization and data structures would be needed.

### Styling and Theming

- The CSS is in `css/style.css`. Toggle `light-mode` class on `body` to switch themes.  
- Add more theming variables and conditions as needed.

## Future Development

- **Multi-Track Support**: Add multiple channel strips, buses, or a mixer panel.
- **Parameter Controls**: Create dedicated UI for each plugin parameter with real-time updates.
- **Offline Rendering**: Use `OfflineAudioContext` for export functionality.
- **Automation Enhancements**: Implement time-based automation curves tied to actual playback time.
- **Improved Accessibility**: Test with screen readers and ensure all functionalities are keyboard-accessible.

## Contributing

- Follow modular patterns: Add new functionalities in their own modules or integrate them clearly into existing ones.
- Keep UI and logic separated where possible.
- Write clear comments and update the README as new features are added.

---

This modularized structure should make the codebase easier to navigate, maintain, and expand, providing a clear framework for future development.
