// js/audioEngine.js
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
