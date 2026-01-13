import { createAnimationConfig } from './base.js';

// Temp5-Particles10: 10 NO2 → 3 collisions → 1 split → 2 collisions → End: 2 NO2, 4 N2O4
export const temp5Particles10Animation = createAnimationConfig(
    // Defaults: fixed seed and parameters
    {
        randomSeed: 22222,
        animationDuration: 12,
        particleSpeed: 50,
        containerSize: 250,
        startRestPeriod: 1,
        endRestPeriod: 1
    },
    // Config: two-batch collision pattern
    {
        numParticles: 10,
        numCollisions: 3, // First batch
        numSplits: 1,
        secondBatchCollisions: 2 // Second batch
    },
    // Schedule events: two batches with split in between
    function scheduleEvents({ rng, numCollisions, numSplits, secondBatchCollisions, eventStartTime, availableEventDuration }) {
        // Animation: 3 collisions + 1 split + 2 collisions = 6 total events
        const totalEvents = numCollisions + numSplits + secondBatchCollisions;
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
        // First 3 events are collisions (batch 1)
        for (let i = 0; i < numCollisions; i++) {
            const idealTime = eventStartTime + timeMargin + i * idealSpacing;
            collisionTimes.push(addRandomness(idealTime, idealSpacing));
        }
        
        const splitEventSchedule = [];
        // Event 4 is a split
        const splitIdealTime = eventStartTime + timeMargin + numCollisions * idealSpacing;
        splitEventSchedule.push(addRandomness(splitIdealTime, idealSpacing));
        
        // Events 5-6 are collisions (batch 2)
        for (let i = numCollisions + numSplits; i < totalEvents; i++) {
            const idealTime = eventStartTime + timeMargin + i * idealSpacing;
            collisionTimes.push(addRandomness(idealTime, idealSpacing));
        }
        
        return { collisionTimes, splitEventSchedule };
    }
);
