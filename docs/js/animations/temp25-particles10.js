import { createAnimationConfig } from './base.js';

// Temp25-Particles10: 10 NO2 → 3 collisions → 1 split → End: 6 NO2, 2 N2O4
export const temp25Particles10Animation = createAnimationConfig(
    // Defaults: fixed seed and parameters
    {
        randomSeed: 11111,
        animationDuration: 10,
        particleSpeed: 90,
        containerSize: 250,
        startRestPeriod: 1,
        endRestPeriod: 1
    },
    // Config: fixed animation structure
    {
        numParticles: 10,
        numCollisions: 3,
        numSplits: 1,
        secondBatchCollisions: 0
    },
    // Schedule events: evenly spaced with randomness
    function scheduleEvents({ rng, numCollisions, numSplits, eventStartTime, availableEventDuration }) {
        // Animation: 3 collisions + 1 split = 4 total events
        const totalEvents = numCollisions + numSplits;
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
        // First 3 events are collisions
        for (let i = 0; i < numCollisions; i++) {
            const idealTime = eventStartTime + timeMargin + i * idealSpacing;
            collisionTimes.push(addRandomness(idealTime, idealSpacing));
        }
        
        const splitEventSchedule = [];
        // Event 4 is a split
        const splitIdealTime = eventStartTime + timeMargin + numCollisions * idealSpacing;
        splitEventSchedule.push(addRandomness(splitIdealTime, idealSpacing));
        
        return { collisionTimes, splitEventSchedule };
    }
);
