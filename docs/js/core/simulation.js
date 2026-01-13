import { createRng, randomUniform, shuffleArray } from './rng.js';
import {
    normalizeVelocity,
    randomVelocity,
    calculateForwardTrajectory,
    calculateBackwardTrajectory,
    averageVelocity
} from './physics.js';

// Run the full simulation
export function runSimulation(params, animationConfig) {
    const {
        containerWidth,
        containerHeight,
        numParticles,
        numCollisions,
        numSplits = 0,
        particleSpeed,
        animationDuration,
        startRestPeriod = 0,
        endRestPeriod = 0,
        randomSeed,
        collisionMargin = 20,
        mode = 'custom',
        secondBatchCollisions = 0
    } = params;
    
    // Initialize RNG
    const rng = createRng(randomSeed);
    
    // Calculate available time for events (excluding rest periods)
    const eventStartTime = startRestPeriod;
    const eventEndTime = animationDuration - endRestPeriod;
    const availableEventDuration = eventEndTime - eventStartTime;
    
    if (availableEventDuration <= 0) {
        throw new Error('Rest periods are too long for the animation duration.');
    }
    
    // Schedule events using animation config if provided, otherwise use default logic
    let collisionTimes;
    let splitEventSchedule = [];
    
    if (animationConfig && animationConfig.scheduleEvents) {
        const scheduled = animationConfig.scheduleEvents({
            rng,
            numCollisions,
            numSplits,
            secondBatchCollisions,
            eventStartTime,
            eventEndTime,
            availableEventDuration
        });
        collisionTimes = scheduled.collisionTimes;
        splitEventSchedule = scheduled.splitEventSchedule || [];
    } else {
        // Default scheduling logic
        // Helper function to add randomness to event timing (±15% of ideal spacing)
        function addRandomness(time, idealSpacing) {
            const variation = idealSpacing * 0.15;
            const randomOffset = (rng() * 2 - 1) * variation;
            return time + randomOffset;
        }
        
        if (mode === 'unique1') {
            const totalEvents = 6 + numSplits;
            const timeMargin = availableEventDuration * 0.1;
            const schedulingDuration = availableEventDuration - (2 * timeMargin);
            const idealSpacing = schedulingDuration / (totalEvents - 1);
            
            collisionTimes = [];
            for (let i = 0; i < 6; i++) {
                const idealTime = eventStartTime + timeMargin + i * idealSpacing;
                collisionTimes.push(addRandomness(idealTime, idealSpacing));
            }
            
            for (let i = 6; i < totalEvents; i++) {
                const idealTime = eventStartTime + timeMargin + i * idealSpacing;
                splitEventSchedule.push(addRandomness(idealTime, idealSpacing));
            }
        } else if (secondBatchCollisions > 0) {
            const totalEvents = numCollisions + numSplits + secondBatchCollisions;
            const timeMargin = availableEventDuration * 0.1;
            const schedulingDuration = availableEventDuration - (2 * timeMargin);
            const idealSpacing = schedulingDuration / (totalEvents - 1);
            
            collisionTimes = [];
            for (let i = 0; i < numCollisions; i++) {
                const idealTime = eventStartTime + timeMargin + i * idealSpacing;
                collisionTimes.push(addRandomness(idealTime, idealSpacing));
            }
            
            const splitIdealTime = eventStartTime + timeMargin + numCollisions * idealSpacing;
            splitEventSchedule.push(addRandomness(splitIdealTime, idealSpacing));
            
            for (let i = numCollisions + numSplits; i < totalEvents; i++) {
                const idealTime = eventStartTime + timeMargin + i * idealSpacing;
                collisionTimes.push(addRandomness(idealTime, idealSpacing));
            }
        } else {
            const timeMargin = availableEventDuration * 0.1;
            const schedulingDuration = availableEventDuration - (2 * timeMargin);
            
            if (numCollisions === 1) {
                collisionTimes = [eventStartTime + availableEventDuration / 2];
            } else {
                const idealSpacing = schedulingDuration / (numCollisions - 1);
                collisionTimes = [];
                for (let i = 0; i < numCollisions; i++) {
                    const idealTime = eventStartTime + timeMargin + i * idealSpacing;
                    collisionTimes.push(addRandomness(idealTime, idealSpacing));
                }
            }
        }
    }
    
    // Assign particles to collisions
    const particleIds = [];
    for (let i = 1; i <= numParticles; i++) {
        particleIds.push(i);
    }
    shuffleArray(rng, particleIds);
    
    // For modes with second batch collisions, only assign particles for the first batch initially
    let collidingIds, nonCollidingIds;
    if (secondBatchCollisions > 0) {
        collidingIds = particleIds.slice(0, numCollisions * 2);
        nonCollidingIds = particleIds.slice(numCollisions * 2);
    } else {
        const totalCollisions = numCollisions;
        collidingIds = particleIds.slice(0, totalCollisions * 2);
        nonCollidingIds = particleIds.slice(totalCollisions * 2);
    }
    
    // Create collisions (first batch only for modes with second batch)
    const collisions = [];
    const firstBatchCount = secondBatchCollisions > 0 ? numCollisions : collisionTimes.length;
    for (let i = 0; i < firstBatchCount; i++) {
        collisions.push({
            id: i + 1,
            time: collisionTimes[i],
            x: randomUniform(rng, collisionMargin, containerWidth - collisionMargin),
            y: randomUniform(rng, collisionMargin, containerHeight - collisionMargin),
            particle1_id: collidingIds[i * 2],
            particle2_id: collidingIds[i * 2 + 1],
            result_particle_id: null
        });
    }
    
    // Create particles
    const particles = [];
    let nextN2O4Id = numParticles + 1;
    
    // Create colliding particles
    for (const collision of collisions) {
        const angle1 = randomUniform(rng, 0, 2 * Math.PI);
        const angle2 = angle1 + Math.PI + randomUniform(rng, -Math.PI / 3, Math.PI / 3);
        
        const vx1 = particleSpeed * Math.cos(angle1);
        const vy1 = particleSpeed * Math.sin(angle1);
        const vx2 = particleSpeed * Math.cos(angle2);
        const vy2 = particleSpeed * Math.sin(angle2);
        
        // Backward trajectories for NO2 particles
        const keyframes1 = calculateBackwardTrajectory(
            rng, collision.x, collision.y, vx1, vy1,
            collision.time, 0.0,
            containerWidth, containerHeight, particleSpeed
        );
        
        const keyframes2 = calculateBackwardTrajectory(
            rng, collision.x, collision.y, vx2, vy2,
            collision.time, 0.0,
            containerWidth, containerHeight, particleSpeed
        );
        
        particles.push({
            id: collision.particle1_id,
            type: 'NO2',
            keyframes: keyframes1,
            start_time: 0.0,
            end_time: collision.time,
            collision_id: collision.id,
            velocity: [vx1, vy1]
        });
        
        particles.push({
            id: collision.particle2_id,
            type: 'NO2',
            keyframes: keyframes2,
            start_time: 0.0,
            end_time: collision.time,
            collision_id: collision.id,
            velocity: [vx2, vy2]
        });
        
        // Forward trajectory for N2O4
        const [n2o4Vx, n2o4Vy] = averageVelocity(rng, vx1, vy1, vx2, vy2, particleSpeed);
        const n2o4Keyframes = calculateForwardTrajectory(
            rng, collision.x, collision.y, n2o4Vx, n2o4Vy,
            collision.time, animationDuration,
            containerWidth, containerHeight, particleSpeed
        );
        
        collision.result_particle_id = nextN2O4Id;
        
        particles.push({
            id: nextN2O4Id,
            type: 'N2O4',
            keyframes: n2o4Keyframes,
            start_time: collision.time,
            end_time: animationDuration,
            collision_id: collision.id,
            velocity: [n2o4Vx, n2o4Vy]
        });
        
        nextN2O4Id++;
    }
    
    // Create non-colliding particles
    for (const particleId of nonCollidingIds) {
        const margin = 10;
        const startX = randomUniform(rng, margin, containerWidth - margin);
        const startY = randomUniform(rng, margin, containerHeight - margin);
        const [vx, vy] = randomVelocity(rng, particleSpeed);
        
        const keyframes = calculateForwardTrajectory(
            rng, startX, startY, vx, vy,
            0.0, animationDuration,
            containerWidth, containerHeight, particleSpeed
        );
        
        particles.push({
            id: particleId,
            type: 'NO2',
            keyframes: keyframes,
            start_time: 0.0,
            end_time: animationDuration,
            collision_id: null,
            velocity: [vx, vy]
        });
    }
    
    // Create splits if needed
    const splits = [];
    if (splitEventSchedule.length > 0 && mode !== 'custom') {
        const splitTimes = splitEventSchedule;
        
        for (let i = 0; i < splitTimes.length; i++) {
            const splitTime = splitTimes[i];
            
            // Find N2O4 particles that exist at this split time
            const availableN2o4 = particles.filter(p => 
                p.type === 'N2O4' && 
                p.start_time < splitTime &&
                p.end_time >= splitTime &&
                !p.split_id
            );
            
            if (availableN2o4.length === 0) {
                console.warn(`No N2O4 particles available at split time ${splitTime}`);
                continue;
            }
            
            // Pick a random N2O4 particle to split
            const n2o4Particle = availableN2o4[Math.floor(rng() * availableN2o4.length)];
            
            // Find the position of the N2O4 at split time
            let splitPos = null;
            for (let j = 0; j < n2o4Particle.keyframes.length - 1; j++) {
                const kf1 = n2o4Particle.keyframes[j];
                const kf2 = n2o4Particle.keyframes[j + 1];
                if (splitTime >= kf1.time && splitTime <= kf2.time) {
                    const t = (splitTime - kf1.time) / (kf2.time - kf1.time);
                    splitPos = {
                        x: kf1.x + t * (kf2.x - kf1.x),
                        y: kf1.y + t * (kf2.y - kf1.y)
                    };
                    break;
                }
            }
            
            if (!splitPos) continue;
            
            // Truncate the N2O4 particle's trajectory at split time
            n2o4Particle.end_time = splitTime;
            const truncatedKeyframes = [];
            for (const kf of n2o4Particle.keyframes) {
                if (kf.time <= splitTime) {
                    truncatedKeyframes.push(kf);
                }
            }
            if (truncatedKeyframes.length === 0 || truncatedKeyframes[truncatedKeyframes.length - 1].time < splitTime) {
                truncatedKeyframes.push({ x: splitPos.x, y: splitPos.y, time: splitTime });
            }
            n2o4Particle.keyframes = truncatedKeyframes;
            n2o4Particle.split_id = i + 1;
            
            // Create two new NO2 particles from the split
            const angle1 = randomUniform(rng, 0, 2 * Math.PI);
            const angle2 = angle1 + Math.PI + randomUniform(rng, -Math.PI / 3, Math.PI / 3);
            
            const vx1 = particleSpeed * Math.cos(angle1);
            const vy1 = particleSpeed * Math.sin(angle1);
            const vx2 = particleSpeed * Math.cos(angle2);
            const vy2 = particleSpeed * Math.sin(angle2);
            
            const no2_1_keyframes = calculateForwardTrajectory(
                rng, splitPos.x, splitPos.y, vx1, vy1,
                splitTime, animationDuration,
                containerWidth, containerHeight, particleSpeed
            );
            
            const no2_2_keyframes = calculateForwardTrajectory(
                rng, splitPos.x, splitPos.y, vx2, vy2,
                splitTime, animationDuration,
                containerWidth, containerHeight, particleSpeed
            );
            
            const newNo2Id1 = particles.length + 1;
            const newNo2Id2 = particles.length + 2;
            
            particles.push({
                id: newNo2Id1,
                type: 'NO2',
                keyframes: no2_1_keyframes,
                start_time: splitTime,
                end_time: animationDuration,
                split_id: i + 1,
                velocity: [vx1, vy1]
            });
            
            particles.push({
                id: newNo2Id2,
                type: 'NO2',
                keyframes: no2_2_keyframes,
                start_time: splitTime,
                end_time: animationDuration,
                split_id: i + 1,
                velocity: [vx2, vy2]
            });
            
            splits.push({
                id: i + 1,
                time: splitTime,
                x: splitPos.x,
                y: splitPos.y,
                source_particle_id: n2o4Particle.id,
                result_particle1_id: newNo2Id1,
                result_particle2_id: newNo2Id2
            });
        }
    }
    
    // For modes with second batch: Create second batch of collisions after splits
    if (secondBatchCollisions > 0) {
        const availableNo2Particles = particles.filter(p => {
            if (p.type !== 'NO2') return false;
            const hasCollided = collisions.some(c => 
                c.particle1_id === p.id || c.particle2_id === p.id
            );
            return !hasCollided;
        });
        
        const originalParticles = availableNo2Particles.filter(p => p.start_time === 0);
        const splitParticles = availableNo2Particles.filter(p => p.start_time > 0);
        
        shuffleArray(rng, originalParticles);
        shuffleArray(rng, splitParticles);
        
        const secondBatchParticles = [...originalParticles, ...splitParticles].slice(0, secondBatchCollisions * 2);
        
        // Create second batch collisions
        for (let i = 0; i < secondBatchCollisions && (i * 2 + 1) < secondBatchParticles.length; i++) {
            const collisionIndex = numCollisions + i;
            const collisionTime = collisionTimes[collisionIndex];
            const particle1 = secondBatchParticles[i * 2];
            const particle2 = secondBatchParticles[i * 2 + 1];
            
            const isSplit1 = particle1.start_time > 0;
            const isSplit2 = particle2.start_time > 0;
            
            let collisionX, collisionY;
            let vx1, vy1, vx2, vy2;
            
            // If both are split particles, find where they'll naturally be
            if (isSplit1 && isSplit2) {
                const p1Start = particle1.keyframes[0];
                const traj1 = calculateForwardTrajectory(
                    rng, p1Start.x, p1Start.y, particle1.velocity[0], particle1.velocity[1],
                    particle1.start_time, collisionTime,
                    containerWidth, containerHeight, particleSpeed
                );
                const pos1 = traj1[traj1.length - 1];
                
                const p2Start = particle2.keyframes[0];
                const traj2 = calculateForwardTrajectory(
                    rng, p2Start.x, p2Start.y, particle2.velocity[0], particle2.velocity[1],
                    particle2.start_time, collisionTime,
                    containerWidth, containerHeight, particleSpeed
                );
                const pos2 = traj2[traj2.length - 1];
                
                collisionX = (pos1.x + pos2.x) / 2;
                collisionY = (pos1.y + pos2.y) / 2;
                
                [vx1, vy1] = particle1.velocity;
                [vx2, vy2] = particle2.velocity;
                
                particle1.keyframes = calculateForwardTrajectory(
                    rng, p1Start.x, p1Start.y, vx1, vy1,
                    particle1.start_time, collisionTime,
                    containerWidth, containerHeight, particleSpeed
                );
                particle2.keyframes = calculateForwardTrajectory(
                    rng, p2Start.x, p2Start.y, vx2, vy2,
                    particle2.start_time, collisionTime,
                    containerWidth, containerHeight, particleSpeed
                );
            } 
            else if (isSplit1 || isSplit2) {
                const splitParticle = isSplit1 ? particle1 : particle2;
                const originalParticle = isSplit1 ? particle2 : particle1;
                
                const splitStart = splitParticle.keyframes[0];
                const splitTraj = calculateForwardTrajectory(
                    rng, splitStart.x, splitStart.y, splitParticle.velocity[0], splitParticle.velocity[1],
                    splitParticle.start_time, collisionTime,
                    containerWidth, containerHeight, particleSpeed
                );
                const splitPos = splitTraj[splitTraj.length - 1];
                
                collisionX = splitPos.x + randomUniform(rng, -20, 20);
                collisionY = splitPos.y + randomUniform(rng, -20, 20);
                collisionX = Math.max(collisionMargin, Math.min(containerWidth - collisionMargin, collisionX));
                collisionY = Math.max(collisionMargin, Math.min(containerHeight - collisionMargin, collisionY));
                
                const angle = randomUniform(rng, 0, 2 * Math.PI);
                const vxOrig = particleSpeed * Math.cos(angle);
                const vyOrig = particleSpeed * Math.sin(angle);
                
                if (isSplit1) {
                    [vx1, vy1] = splitParticle.velocity;
                    [vx2, vy2] = [vxOrig, vyOrig];
                    particle1.keyframes = splitTraj;
                    particle2.keyframes = calculateBackwardTrajectory(
                        rng, collisionX, collisionY, vx2, vy2,
                        collisionTime, particle2.start_time,
                        containerWidth, containerHeight, particleSpeed
                    );
                } else {
                    [vx1, vy1] = [vxOrig, vyOrig];
                    [vx2, vy2] = splitParticle.velocity;
                    particle1.keyframes = calculateBackwardTrajectory(
                        rng, collisionX, collisionY, vx1, vy1,
                        collisionTime, particle1.start_time,
                        containerWidth, containerHeight, particleSpeed
                    );
                    particle2.keyframes = splitTraj;
                }
            }
            else {
                collisionX = randomUniform(rng, collisionMargin, containerWidth - collisionMargin);
                collisionY = randomUniform(rng, collisionMargin, containerHeight - collisionMargin);
                
                const angle1 = randomUniform(rng, 0, 2 * Math.PI);
                const angle2 = angle1 + Math.PI + randomUniform(rng, -Math.PI / 3, Math.PI / 3);
                vx1 = particleSpeed * Math.cos(angle1);
                vy1 = particleSpeed * Math.sin(angle1);
                vx2 = particleSpeed * Math.cos(angle2);
                vy2 = particleSpeed * Math.sin(angle2);
                
                particle1.keyframes = calculateBackwardTrajectory(
                    rng, collisionX, collisionY, vx1, vy1,
                    collisionTime, particle1.start_time,
                    containerWidth, containerHeight, particleSpeed
                );
                particle2.keyframes = calculateBackwardTrajectory(
                    rng, collisionX, collisionY, vx2, vy2,
                    collisionTime, particle2.start_time,
                    containerWidth, containerHeight, particleSpeed
                );
            }
            
            // Create collision
            const collision = {
                id: collisions.length + 1,
                time: collisionTime,
                x: collisionX,
                y: collisionY,
                particle1_id: particle1.id,
                particle2_id: particle2.id,
                result_particle_id: null
            };
            collisions.push(collision);
            
            particle1.end_time = collisionTime;
            particle1.collision_id = collision.id;
            particle1.velocity = [vx1, vy1];
            
            particle2.end_time = collisionTime;
            particle2.collision_id = collision.id;
            particle2.velocity = [vx2, vy2];
            
            const [n2o4Vx, n2o4Vy] = averageVelocity(rng, vx1, vy1, vx2, vy2, particleSpeed);
            const n2o4Keyframes = calculateForwardTrajectory(
                rng, collision.x, collision.y, n2o4Vx, n2o4Vy,
                collision.time, animationDuration,
                containerWidth, containerHeight, particleSpeed
            );
            
            collision.result_particle_id = nextN2O4Id;
            
            particles.push({
                id: nextN2O4Id,
                type: 'N2O4',
                keyframes: n2o4Keyframes,
                start_time: collision.time,
                end_time: animationDuration,
                collision_id: collision.id,
                velocity: [n2o4Vx, n2o4Vy]
            });
            
            nextN2O4Id++;
        }
    }
    
    // Sort particles
    particles.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'NO2' ? -1 : 1;
        return a.id - b.id;
    });
    
    return {
        success: true,
        params: {
            container_width: containerWidth,
            container_height: containerHeight,
            animation_duration: animationDuration
        },
        particles: particles,
        collisions: collisions,
        splits: splits,
        summary: {
            total_particles: particles.length,
            no2_count: particles.filter(p => p.type === 'NO2').length,
            n2o4_count: particles.filter(p => p.type === 'N2O4').length,
            collision_count: collisions.length,
            split_count: splits.length
        }
    };
}
