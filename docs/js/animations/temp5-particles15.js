import { createAnimationConfig } from './base.js';

// Temp5-Particles15: 15 NO2 → 4 collisions → 1 split → 4 collisions
export const temp5Particles15Animation = createAnimationConfig(
    // Defaults: different fixed seed and parameters
    {
        randomSeed: 67926,
        animationDuration: 12,
        particleSpeed: 40,
        containerSize: 250,
        startRestPeriod: 1,
        endRestPeriod: 1
    },
    // Config: two-batch collision pattern
    {
        numParticles: 15,
        numCollisions: 4, // First batch
        numSplits: 1,
        secondBatchCollisions: 4 // Second batch
    },
    // Schedule events: two batches with split in between
    function scheduleEvents({ rng, numCollisions, numSplits, secondBatchCollisions, eventStartTime, availableEventDuration }) {
        // Animation: 4 collisions + 1 split + 4 collisions = 9 total events
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
        // First 4 events are collisions (batch 1)
        for (let i = 0; i < numCollisions; i++) {
            const idealTime = eventStartTime + timeMargin + i * idealSpacing;
            collisionTimes.push(addRandomness(idealTime, idealSpacing));
        }
        
        const splitEventSchedule = [];
        // Event 4 is a split
        const splitIdealTime = eventStartTime + timeMargin + numCollisions * idealSpacing;
        splitEventSchedule.push(addRandomness(splitIdealTime, idealSpacing));
        
        // Events 5-8 are collisions (batch 2)
        for (let i = numCollisions + numSplits; i < totalEvents; i++) {
            const idealTime = eventStartTime + timeMargin + i * idealSpacing;
            collisionTimes.push(addRandomness(idealTime, idealSpacing));
        }
        
        return { collisionTimes, splitEventSchedule };
    }
);
