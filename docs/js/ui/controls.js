// UI Controls module
// Handles input controls, mode switching, and parameter management

export function initializeControls(callbacks) {
    const {
        onModeChange,
        onRunSimulation,
        onPlayPause,
        onRestart,
        onStep,
        onProgressClick,
        onPlaybackSpeedChange,
        onUpdateDisplay
    } = callbacks;

    // Get DOM elements
    const containerSizeInput = document.getElementById('containerSize');
    const numParticlesInput = document.getElementById('numParticles');
    const numCollisionsInput = document.getElementById('numCollisions');
    const particleSpeedInput = document.getElementById('particleSpeed');
    const animationDurationInput = document.getElementById('animationDuration');
    const startRestInput = document.getElementById('startRest');
    const endRestInput = document.getElementById('endRest');
    const randomSeedInput = document.getElementById('randomSeed');
    const runBtn = document.getElementById('runBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const restartBtn = document.getElementById('restartBtn');
    const stepBtn = document.getElementById('stepBtn');
    const playbackSpeedInput = document.getElementById('playbackSpeed');
    const progressBar = document.getElementById('progressBar');

    // Set up event listeners
    [containerSizeInput, numParticlesInput, numCollisionsInput, particleSpeedInput, animationDurationInput, startRestInput, endRestInput].forEach(input => {
        input.addEventListener('input', () => {
            updateDisplayValues();
            if (onUpdateDisplay) onUpdateDisplay();
        });
    });

    playbackSpeedInput.addEventListener('input', () => {
        const speed = parseFloat(playbackSpeedInput.value);
        document.getElementById('playbackSpeedValue').textContent = speed;
        if (onPlaybackSpeedChange) onPlaybackSpeedChange(speed);
    });

    progressBar.addEventListener('click', (e) => {
        if (onProgressClick) {
            const rect = progressBar.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            onProgressClick(ratio);
        }
    });

    runBtn.addEventListener('click', () => {
        if (onRunSimulation) onRunSimulation();
    });

    playPauseBtn.addEventListener('click', () => {
        if (onPlayPause) onPlayPause();
    });

    restartBtn.addEventListener('click', () => {
        if (onRestart) onRestart();
    });

    stepBtn.addEventListener('click', () => {
        if (onStep) onStep();
    });

    // Mode buttons
    document.getElementById('modeCustom').addEventListener('click', () => setMode('custom'));
    document.getElementById('modeTemp25Particles15').addEventListener('click', () => setMode('temp25-particles15'));
    document.getElementById('modeTemp5Particles15').addEventListener('click', () => setMode('temp5-particles15'));
    document.getElementById('modeTemp25Particles10').addEventListener('click', () => setMode('temp25-particles10'));
    document.getElementById('modeTemp5Particles10').addEventListener('click', () => setMode('temp5-particles10'));
    document.getElementById('modeTemp15Particles15').addEventListener('click', () => setMode('temp15-particles15'));
    document.getElementById('modeTemp15Particles10').addEventListener('click', () => setMode('temp15-particles10'));

    function updateDisplayValues() {
        document.getElementById('containerSizeValue').textContent = containerSizeInput.value;
        document.getElementById('containerSizeValue2').textContent = containerSizeInput.value;
        document.getElementById('numParticlesValue').textContent = numParticlesInput.value;
        document.getElementById('numCollisionsValue').textContent = numCollisionsInput.value;
        document.getElementById('particleSpeedValue').textContent = particleSpeedInput.value;
        document.getElementById('animationDurationValue').textContent = animationDurationInput.value;
        document.getElementById('startRestValue').textContent = startRestInput.value;
        document.getElementById('endRestValue').textContent = endRestInput.value;
        document.getElementById('playbackSpeedValue').textContent = playbackSpeedInput.value;

        const maxCollisions = Math.floor(numParticlesInput.value / 2);
        numCollisionsInput.max = maxCollisions;
        if (parseInt(numCollisionsInput.value) > maxCollisions) {
            numCollisionsInput.value = maxCollisions;
            document.getElementById('numCollisionsValue').textContent = maxCollisions;
        }
    }

    function setMode(mode) {
        // Update button states
        document.getElementById('modeCustom').classList.toggle('active-mode', mode === 'custom');
        document.getElementById('modeTemp25Particles15').classList.toggle('active-mode', mode === 'temp25-particles15');
        document.getElementById('modeTemp5Particles15').classList.toggle('active-mode', mode === 'temp5-particles15');
        document.getElementById('modeTemp25Particles10').classList.toggle('active-mode', mode === 'temp25-particles10');
        document.getElementById('modeTemp5Particles10').classList.toggle('active-mode', mode === 'temp5-particles10');
        document.getElementById('modeTemp15Particles15').classList.toggle('active-mode', mode === 'temp15-particles15');
        document.getElementById('modeTemp15Particles10').classList.toggle('active-mode', mode === 'temp15-particles10');
        
        // Lock/unlock parameters based on mode
        const numParticlesGroup = document.getElementById('numParticlesGroup');
        const numCollisionsGroup = document.getElementById('numCollisionsGroup');
        const numParticlesInput = document.getElementById('numParticles');
        const numCollisionsInput = document.getElementById('numCollisions');
        
        if (mode === 'custom') {
            numParticlesGroup.style.display = 'block';
            numCollisionsGroup.style.display = 'block';
            numParticlesInput.disabled = false;
            numCollisionsInput.disabled = false;
        } else {
            numParticlesGroup.style.display = 'none';
            numCollisionsGroup.style.display = 'none';
            numParticlesInput.disabled = true;
            numCollisionsInput.disabled = true;
        }

        if (onModeChange) onModeChange(mode);
    }

    function getCurrentParams() {
        return {
            containerSize: parseInt(containerSizeInput.value),
            numParticles: parseInt(numParticlesInput.value),
            numCollisions: parseInt(numCollisionsInput.value),
            particleSpeed: parseInt(particleSpeedInput.value),
            animationDuration: parseInt(animationDurationInput.value),
            startRestPeriod: parseFloat(startRestInput.value),
            endRestPeriod: parseFloat(endRestInput.value),
            randomSeed: randomSeedInput.value ? parseInt(randomSeedInput.value) : null
        };
    }

    function applyDefaults(defaults) {
        if (defaults.containerSize !== undefined) {
            containerSizeInput.value = defaults.containerSize;
        }
        if (defaults.particleSpeed !== undefined) {
            particleSpeedInput.value = defaults.particleSpeed;
        }
        if (defaults.animationDuration !== undefined) {
            animationDurationInput.value = defaults.animationDuration;
        }
        if (defaults.startRestPeriod !== undefined) {
            startRestInput.value = defaults.startRestPeriod;
        }
        if (defaults.endRestPeriod !== undefined) {
            endRestInput.value = defaults.endRestPeriod;
        }
        if (defaults.randomSeed !== undefined) {
            if (defaults.randomSeed === null) {
                randomSeedInput.value = '';
            } else {
                randomSeedInput.value = defaults.randomSeed;
            }
        }
        updateDisplayValues();
    }

    function setRunButtonState(disabled, text) {
        runBtn.disabled = disabled;
        runBtn.textContent = text;
    }

    function setPlayPauseButtonState(isPlaying) {
        playPauseBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
        playPauseBtn.classList.toggle('active', isPlaying);
    }

    // Initialize display values
    updateDisplayValues();

    return {
        setMode,
        getCurrentParams,
        applyDefaults,
        updateDisplayValues,
        setRunButtonState,
        setPlayPauseButtonState
    };
}
