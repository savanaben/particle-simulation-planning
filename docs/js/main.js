// Main entry point
// Coordinates all modules and initializes the application

import { runSimulation } from './core/simulation.js';
import { customAnimation } from './animations/custom.js';
import { temp25Particles15Animation } from './animations/temp25-particles15.js';
import { temp5Particles15Animation } from './animations/temp5-particles15.js';
import { temp25Particles10Animation } from './animations/temp25-particles10.js';
import { temp5Particles10Animation } from './animations/temp5-particles10.js';
import { temp15Particles15Animation } from './animations/temp15-particles15.js';
import { temp15Particles10Animation } from './animations/temp15-particles10.js';
import { initializeControls } from './ui/controls.js';
import { initializeCanvas } from './ui/canvas.js';
import { populateDataTables } from './ui/data-tables.js';

// Global state
let simulationData = null;
let currentTime = 0;
let isPlaying = false;
let playbackSpeed = 1;
let lastFrameTime = null;
let animationId = null;
let currentMode = 'custom';

// Animation mode registry
const animationModes = {
    custom: customAnimation,
    'temp25-particles15': temp25Particles15Animation,
    'temp5-particles15': temp5Particles15Animation,
    'temp25-particles10': temp25Particles10Animation,
    'temp5-particles10': temp5Particles10Animation,
    'temp15-particles15': temp15Particles15Animation,
    'temp15-particles10': temp15Particles10Animation
};

// Initialize canvas
const canvas = document.getElementById('simulationCanvas');
const canvasModule = initializeCanvas(canvas);

// Set up canvas draw callback
canvasModule.setDrawCallback(() => {
    if (simulationData) {
        canvasModule.draw(simulationData, currentTime);
    }
});

// Initialize controls
const controls = initializeControls({
    onModeChange: (mode) => {
        currentMode = mode;
        const animationConfig = animationModes[mode];
        if (animationConfig && animationConfig.defaults) {
            controls.applyDefaults(animationConfig.defaults);
        }
    },
    onRunSimulation: () => {
        controls.setRunButtonState(true, 'Running...');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.display = 'none';

        try {
            const uiParams = controls.getCurrentParams();
            const animationConfig = animationModes[currentMode];
            
            // Merge animation config with UI params
            let params = {
                containerWidth: uiParams.containerSize,
                containerHeight: uiParams.containerSize,
                particleSpeed: uiParams.particleSpeed,
                animationDuration: uiParams.animationDuration,
                startRestPeriod: uiParams.startRestPeriod,
                endRestPeriod: uiParams.endRestPeriod,
                randomSeed: uiParams.randomSeed,
                mode: currentMode
            };

            // Apply animation config
            if (animationConfig) {
                if (animationConfig.config.numParticles !== null) {
                    params.numParticles = animationConfig.config.numParticles;
                } else {
                    params.numParticles = uiParams.numParticles;
                }
                
                if (animationConfig.config.numCollisions !== null) {
                    params.numCollisions = animationConfig.config.numCollisions;
                } else {
                    params.numCollisions = uiParams.numCollisions;
                }
                
                params.numSplits = animationConfig.config.numSplits || 0;
                params.secondBatchCollisions = animationConfig.config.secondBatchCollisions || 0;
            } else {
                // Fallback to UI params
                params.numParticles = uiParams.numParticles;
                params.numCollisions = uiParams.numCollisions;
                params.numSplits = 0;
                params.secondBatchCollisions = 0;
            }

            // Validate rest periods
            if (params.startRestPeriod + params.endRestPeriod >= params.animationDuration) {
                throw new Error(`Start rest (${params.startRestPeriod}s) + End rest (${params.endRestPeriod}s) must be less than animation duration (${params.animationDuration}s).`);
            }

            // Validate collisions
            if (params.numCollisions * 2 > params.numParticles) {
                throw new Error(`Cannot have ${params.numCollisions} collisions with only ${params.numParticles} particles.`);
            }

            // Run simulation
            simulationData = runSimulation(params, animationConfig);
            currentTime = 0;
            
            const totalTimeDisplay = document.getElementById('totalTime');
            totalTimeDisplay.textContent = simulationData.params.animation_duration.toFixed(2);
            
            // Clear previous rotations
            canvasModule.clearRotations();
            
            // Update canvas size
            canvasModule.setCanvasSize(params.containerWidth, params.containerHeight);
            
            isPlaying = false;
            controls.setPlayPauseButtonState(false);

            canvasModule.draw(simulationData, currentTime);
            updateTimeDisplay();
            populateDataTables(simulationData);

        } catch (err) {
            const errorMessage = document.getElementById('errorMessage');
            errorMessage.textContent = err.message;
            errorMessage.style.display = 'block';
        } finally {
            controls.setRunButtonState(false, 'Run Simulation');
        }
    },
    onPlayPause: () => {
        if (!simulationData) return;
        isPlaying = !isPlaying;
        controls.setPlayPauseButtonState(isPlaying);
        
        if (isPlaying) {
            lastFrameTime = performance.now();
            animate();
        }
    },
    onRestart: () => {
        currentTime = 0;
        canvasModule.draw(simulationData, currentTime);
        updateTimeDisplay();
    },
    onStep: () => {
        if (!simulationData) return;
        currentTime = Math.min(currentTime + 0.1, simulationData.params.animation_duration);
        canvasModule.draw(simulationData, currentTime);
        updateTimeDisplay();
    },
    onProgressClick: (ratio) => {
        if (!simulationData) return;
        currentTime = ratio * simulationData.params.animation_duration;
        canvasModule.draw(simulationData, currentTime);
        updateTimeDisplay();
    },
    onPlaybackSpeedChange: (speed) => {
        playbackSpeed = speed;
    },
    onUpdateDisplay: () => {
        const uiParams = controls.getCurrentParams();
        canvasModule.setCanvasSize(uiParams.containerSize, uiParams.containerSize);
        if (simulationData) {
            canvasModule.draw(simulationData, currentTime);
        }
    }
});

function animate() {
    if (!isPlaying || !simulationData) return;

    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    currentTime += delta * playbackSpeed;

    if (currentTime >= simulationData.params.animation_duration) {
        currentTime = simulationData.params.animation_duration;
        isPlaying = false;
        controls.setPlayPauseButtonState(false);
    }

    canvasModule.draw(simulationData, currentTime);
    updateTimeDisplay();

    if (isPlaying) {
        animationId = requestAnimationFrame(animate);
    }
}

function updateTimeDisplay() {
    if (!simulationData) return;
    const currentTimeDisplay = document.getElementById('currentTime');
    currentTimeDisplay.textContent = currentTime.toFixed(2);
    const progressFill = document.getElementById('progressFill');
    const progress = (currentTime / simulationData.params.animation_duration) * 100;
    progressFill.style.width = `${progress}%`;
}

// Initialize on page load
controls.setMode('custom');
canvasModule.draw(null, 0);
