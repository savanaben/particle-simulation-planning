import { createAnimationConfig } from './base.js';

// Temp25-Particles15: 15 NO2 → 6 collisions → 2 splits
export const temp25Particles15Animation = createAnimationConfig(
    // Defaults: fixed seed and parameters
    {
        randomSeed: 12345,
        animationDuration: 12,
        particleSpeed: 100,
        containerSize: 250,
        startRestPeriod: 1,
        endRestPeriod: 1
    },
    // Config: fixed animation structure
    {
        numParticles: 15,
        numCollisions: 6,
        numSplits: 2,
        secondBatchCollisions: 0
    },
    // Schedule events: evenly spaced with randomness
    function scheduleEvents({ rng, numCollisions, numSplits, eventStartTime, availableEventDuration }) {
        // Animation: 6 collisions + 2 splits = 8 total events
        const totalEvents = 6 + numSplits;
        const timeMargin = availableEventDuration * 0.1;
        const schedulingDuration = availableEventDuration - (2 * timeMargin);
        const idealSpacing = schedulingDuration / (totalEvents - 1);
        
        // Helper function to add randomness to event timing (±15% of ideal spacing)
        function addRandomness(time, idealSpacing) {
            const variation = idealSpacing * 0.15;
            const randomOffset = (rng() * 2 - 1) * variation;
            return time + randomOffset;
        }
        
        const collisionTimes = [];
        // First 6 events are collisions
        for (let i = 0; i < 6; i++) {
            const idealTime = eventStartTime + timeMargin + i * idealSpacing;
            collisionTimes.push(addRandomness(idealTime, idealSpacing));
        }
        
        const splitEventSchedule = [];
        // Events 6-7 are split times
        for (let i = 6; i < totalEvents; i++) {
            const idealTime = eventStartTime + timeMargin + i * idealSpacing;
            splitEventSchedule.push(addRandomness(idealTime, idealSpacing));
        }
        
        return { collisionTimes, splitEventSchedule };
    }
);
