export let audioContext;
export let inputNode;
export let inputGainNode;
export let panNode;
export let masterGain;
export let insertEffects = [];
export let reverbSend;
export let reverbConvolver;
export let reverbGain;

// Initialization of audio context and nodes
export async function initAudioEngine() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let mediaStream;
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        console.warn("Microphone access denied. Using silent input node.");
    }

    inputNode = mediaStream ? audioContext.createMediaStreamSource(mediaStream) : audioContext.createGain();
    if (!mediaStream) inputNode.gain = { value: 0 };

    inputGainNode = audioContext.createGain();
    panNode = audioContext.createStereoPanner();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 1.0;

    reverbSend = audioContext.createGain();
    reverbSend.gain.value = 0.0;
    reverbConvolver = audioContext.createConvolver();
    reverbConvolver.normalize = true;
    reverbGain = audioContext.createGain();
    reverbGain.gain.value = 0.5;
    reverbSend.connect(reverbConvolver).connect(reverbGain).connect(audioContext.destination);

    if (mediaStream) {
        inputNode.connect(inputGainNode);
    }

    connectChain();
}

export function connectChain() {
    inputGainNode.disconnect();
    let lastNode = inputGainNode;
    insertEffects.forEach(fx => {
        lastNode.connect(fx.node);
        lastNode = fx.node;
    });
    lastNode.connect(panNode);
    panNode.connect(masterGain);
    masterGain.connect(audioContext.destination);
}

export function createEffectNode(type) {
    let node;
    if (type === 'EQ') {
        node = audioContext.createBiquadFilter();
        node.type = 'peaking';
        node.frequency.value = 1000;
        node.gain.value = 0;
    } else if (type === 'Compressor') {
        node = audioContext.createDynamicsCompressor();
        node.threshold.value = -30;
        node.ratio.value = 3;
    } else if (type === 'Delay') {
        node = audioContext.createDelay();
        node.delayTime.value = 0.5;
    } else if (type === 'Distortion') {
        node = audioContext.createWaveShaper();
        node.curve = makeDistortionCurve(50);
    } else {
        node = audioContext.createGain();
    }
    return { node };
}

function makeDistortionCurve(amount) {
    const n_samples = 256, curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i ) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + amount) * x * 20 * Math.PI / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

export function dbToGain(db) {
    return Math.pow(10, db / 20);
}

export function gainToDb(g) {
    return 20 * Math.log10(g);
}

/* 
<details>
<summary><strong>Collapsible Notes: audioEngine.js</strong></summary>

### Overview
`audioEngine.js` is responsible for setting up and managing the Web Audio API's audio context and various audio nodes. It handles audio input, processing effects, and output routing.

### Exported Variables

- **audioContext**: The primary interface to the Web Audio API.
- **inputNode**: Source node for audio input (either from the microphone or a silent input).
- **inputGainNode**: Controls the gain (volume) of the input signal.
- **panNode**: Handles stereo panning of the audio signal.
- **masterGain**: Controls the overall output gain.
- **insertEffects**: Array to store inserted audio effects/plugins.
- **reverbSend, reverbConvolver, reverbGain**: Nodes related to the reverb effect.

### Key Functions

- **initAudioEngine()**: 
  - Initializes the audio context.
  - Attempts to access the user's microphone. If denied, it uses a silent input node.
  - Sets up gain nodes, panning, and master output.
  - Configures a reverb effect chain.
  - Connects the initial audio processing chain.

- **connectChain()**:
  - Disconnects existing connections and reconnects the audio processing chain.
  - Iterates through `insertEffects` to connect each effect node in sequence.
  - Ensures the final signal is routed through panning and master gain to the destination.

- **createEffectNode(type)**:
  - Creates and configures different types of audio effect nodes based on the provided `type` (e.g., EQ, Compressor, Delay, Distortion).
  - Returns the created node for further integration into the audio chain.

- **makeDistortionCurve(amount)**:
  - Generates a distortion curve for the wave shaper node based on the specified `amount`.

- **dbToGain(db)** and **gainToDb(g)**:
  - Utility functions to convert decibel values to linear gain and vice versa.

### Audio Processing Flow

1. **Input Handling**:
   - If microphone access is granted, the audio stream is captured via `MediaStreamSource`.
   - If denied, a silent `GainNode` is used to prevent errors in the audio chain.

2. **Gain and Panning**:
   - The input signal is first passed through `inputGainNode` for volume control.
   - After any inserted effects, the signal is panned using `panNode`.

3. **Master Output**:
   - The panned signal is sent to `masterGain`, which controls the final output volume before routing to `audioContext.destination`.

4. **Reverb Effect**:
   - A reverb effect chain is set up, allowing the signal to be sent through a convolution reverb for added depth.

### Extensibility

- **Insert Effects**: The `insertEffects` array allows dynamic addition of audio effects, which can be managed (added, removed, reordered) through the application's UI.
  
- **Effect Creation**: The `createEffectNode` function supports easy creation and integration of various audio effects, facilitating a modular approach to audio processing.

### Error Handling

- **Microphone Access**: Properly handles scenarios where the user denies microphone access by falling back to a silent input node and logging a warning.

### Notes

- **Normalization**: The reverb convolver node is set to normalize to ensure consistent audio levels.
  
- **Gain Values**: Default gain values are set to ensure that effects like reverb don't overpower the original signal unless adjusted by the user.

</details>
*/