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

/* 
<details>
<summary><strong>Collapsible Notes: main.js</strong></summary>

### Overview
`main.js` serves as the entry point for the **Audional Sequencer 2.0** application. It imports and initializes various modules that handle different aspects of the application's functionality.

### Imported Modules

- **audioEngine.js (`initAudioEngine`)**: Initializes the audio context and sets up the audio processing nodes and effects.
  
- **uiHandlers.js (`initUI`)**: Manages the user interface interactions and event listeners.
  
- **stateManager.js (`initStateManager`)**: Handles the application's state management, ensuring that the UI and audio states are synchronized.
  
- **automation.js (`initAutomation`)**: Sets up the automation features, allowing users to automate parameters like volume over time.
  
- **timeline.js (`initTimeline`)**: Initializes the multi-track timeline, enabling the management and visualization of multiple audio tracks.

### Execution Flow

1. **Initialization Function**: An Immediately Invoked Function Expression (IIFE) is used to asynchronously initialize the application's modules.
   
2. **Audio Engine Initialization**: `initAudioEngine` is awaited to ensure that the audio context and related nodes are fully set up before proceeding.
   
3. **UI and State Management**: After the audio engine is ready, the UI handlers and state manager are initialized to set up the user interface and manage application states.
   
4. **Automation and Timeline**: Finally, automation features and the multi-track timeline are initialized to provide advanced audio sequencing capabilities.

### Notes

- **Asynchronous Initialization**: Using `async/await` ensures that the audio engine is fully initialized before other modules that depend on it are set up.
  
- **Modular Design**: Each functionality is encapsulated within its own module, promoting maintainability and scalability.

</details>
*/