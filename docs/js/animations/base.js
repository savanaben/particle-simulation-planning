// Base animation configuration interface
// Each animation should export an object with:
// - defaults: Parameter defaults (seed, duration, speed, containerSize, etc.)
// - config: Animation-specific config (numParticles, numCollisions, numSplits, etc.)
// - scheduleEvents: Optional function for custom event timing logic

export function createAnimationConfig(defaults, config, scheduleEvents) {
    return {
        defaults,
        config,
        scheduleEvents
    };
}
