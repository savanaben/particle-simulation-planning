import { randomUniform } from './rng.js';

// Normalize velocity to given speed
export function normalizeVelocity(rng, vx, vy, speed) {
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    if (magnitude === 0) {
        const angle = randomUniform(rng, 0, 2 * Math.PI);
        return [speed * Math.cos(angle), speed * Math.sin(angle)];
    }
    return [(vx / magnitude) * speed, (vy / magnitude) * speed];
}

// Generate random velocity with given speed
export function randomVelocity(rng, speed) {
    const angle = randomUniform(rng, 0, 2 * Math.PI);
    return [speed * Math.cos(angle), speed * Math.sin(angle)];
}

// Calculate time until particle hits a wall
export function calculateTimeToWall(x, y, vx, vy, width, height) {
    const times = [];
    
    if (vx < 0) times.push({ t: -x / vx, wall: 'left' });
    if (vx > 0) times.push({ t: (width - x) / vx, wall: 'right' });
    if (vy < 0) times.push({ t: -y / vy, wall: 'bottom' });
    if (vy > 0) times.push({ t: (height - y) / vy, wall: 'top' });
    
    const validTimes = times.filter(item => item.t > 1e-10);
    if (validTimes.length === 0) {
        return { t: Infinity, wall: 'none' };
    }
    
    return validTimes.reduce((min, item) => item.t < min.t ? item : min);
}

// Reflect velocity based on wall hit
export function reflectVelocity(vx, vy, wall) {
    if (wall === 'left' || wall === 'right') return [-vx, vy];
    if (wall === 'top' || wall === 'bottom') return [vx, -vy];
    return [vx, vy];
}

// Calculate forward trajectory with wall bounces
export function calculateForwardTrajectory(rng, startX, startY, vx, vy, startTime, endTime, width, height, speed) {
    const keyframes = [{ x: startX, y: startY, time: startTime }];
    
    let currentX = startX, currentY = startY;
    let [currentVx, currentVy] = normalizeVelocity(rng, vx, vy, speed);
    let currentTime = startTime;
    
    while (currentTime < endTime) {
        const { t: timeToWall, wall } = calculateTimeToWall(currentX, currentY, currentVx, currentVy, width, height);
        const remainingTime = endTime - currentTime;
        
        if (timeToWall >= remainingTime) {
            const finalX = currentX + currentVx * remainingTime;
            const finalY = currentY + currentVy * remainingTime;
            keyframes.push({ x: finalX, y: finalY, time: endTime });
            break;
        } else {
            currentX += currentVx * timeToWall;
            currentY += currentVy * timeToWall;
            currentTime += timeToWall;
            
            currentX = Math.max(0, Math.min(width, currentX));
            currentY = Math.max(0, Math.min(height, currentY));
            
            keyframes.push({ x: currentX, y: currentY, time: currentTime });
            [currentVx, currentVy] = reflectVelocity(currentVx, currentVy, wall);
        }
    }
    
    return keyframes;
}

// Calculate backward trajectory (trace where particle came from)
export function calculateBackwardTrajectory(rng, endX, endY, vx, vy, endTime, startTime, width, height, speed) {
    const reverseVx = -vx, reverseVy = -vy;
    const keyframes = [{ x: endX, y: endY, time: endTime }];
    
    let currentX = endX, currentY = endY;
    let [currentVx, currentVy] = normalizeVelocity(rng, reverseVx, reverseVy, speed);
    let currentTime = endTime;
    
    while (currentTime > startTime) {
        const { t: timeToWall, wall } = calculateTimeToWall(currentX, currentY, currentVx, currentVy, width, height);
        const remainingTime = currentTime - startTime;
        
        if (timeToWall >= remainingTime) {
            const initialX = currentX + currentVx * remainingTime;
            const initialY = currentY + currentVy * remainingTime;
            keyframes.push({ x: initialX, y: initialY, time: startTime });
            break;
        } else {
            currentX += currentVx * timeToWall;
            currentY += currentVy * timeToWall;
            currentTime -= timeToWall;
            
            currentX = Math.max(0, Math.min(width, currentX));
            currentY = Math.max(0, Math.min(height, currentY));
            
            keyframes.push({ x: currentX, y: currentY, time: currentTime });
            [currentVx, currentVy] = reflectVelocity(currentVx, currentVy, wall);
        }
    }
    
    keyframes.reverse();
    return keyframes;
}

// Average two velocities
export function averageVelocity(rng, vx1, vy1, vx2, vy2, speed) {
    let avgVx = (vx1 + vx2) / 2;
    let avgVy = (vy1 + vy2) / 2;
    
    if (Math.abs(avgVx) < 1e-10 && Math.abs(avgVy) < 1e-10) {
        return randomVelocity(rng, speed);
    }
    
    return normalizeVelocity(rng, avgVx, avgVy, speed);
}
