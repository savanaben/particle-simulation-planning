import { createAnimationConfig } from './base.js';

// Custom mode: user-controlled parameters
export const customAnimation = createAnimationConfig(
    // Defaults: user-controlled (no fixed values)
    {
        randomSeed: null, // User can set
        animationDuration: 8,
        particleSpeed: 80,
        containerSize: 250,
        startRestPeriod: 0,
        endRestPeriod: 0
    },
    // Config: uses UI inputs
    {
        numParticles: null, // From UI
        numCollisions: null, // From UI
        numSplits: 0,
        secondBatchCollisions: 0
    },
    // Schedule events: standard collision timing
    null // Use default scheduling
);
