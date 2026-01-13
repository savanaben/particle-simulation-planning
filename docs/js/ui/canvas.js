// Canvas drawing module
// Handles particle rendering and canvas drawing

const NO2_COLOR = '#e94560';
const N2O4_COLOR = '#4ecdc4';
const PARTICLE_RADIUS = 6;
const IMAGE_HEIGHT = 24;
const NO2_ASPECT = 21.06 / 22.39;
const N2O4_ASPECT = 41.12 / 22.39;
const NO2_WIDTH = IMAGE_HEIGHT * NO2_ASPECT;
const N2O4_WIDTH = IMAGE_HEIGHT * N2O4_ASPECT;

export function initializeCanvas(canvasElement) {
    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');
    
    // SVG images for particles
    const no2Image = new Image();
    const n2o4Image = new Image();
    let imagesLoaded = 0;
    
    // Store random starting rotations per particle
    const particleRotations = new Map();
    
    // Offscreen canvas for applying brightness effects
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    
    // Load SVG images
    no2Image.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === 2 && onDrawCallback) {
            onDrawCallback();
        }
    };
    n2o4Image.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === 2 && onDrawCallback) {
            onDrawCallback();
        }
    };
    no2Image.src = 'no2.svg';
    n2o4Image.src = 'n2o4.svg';
    
    let onDrawCallback = null;
    
    function getParticlePosition(particle, time) {
        if (time < particle.start_time || time > particle.end_time) {
            return null;
        }
        
        const keyframes = particle.keyframes;
        
        for (let i = 0; i < keyframes.length - 1; i++) {
            const kf1 = keyframes[i];
            const kf2 = keyframes[i + 1];
            
            if (time >= kf1.time && time <= kf2.time) {
                const t = (time - kf1.time) / (kf2.time - kf1.time);
                return {
                    x: kf1.x + t * (kf2.x - kf1.x),
                    y: kf1.y + t * (kf2.y - kf1.y)
                };
            }
        }
        
        if (keyframes.length > 0) {
            const last = keyframes[keyframes.length - 1];
            if (Math.abs(time - last.time) < 0.01) {
                return { x: last.x, y: last.y };
            }
        }
        
        return null;
    }
    
    function draw(simulationData, currentTime) {
        ctx.fillStyle = '#E8E8E8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!simulationData) {
            ctx.fillStyle = '#333';
            ctx.font = '14px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('Click "Run Simulation" to start', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const particles = simulationData.particles;
        let activeNo2 = 0;
        let activeN2o4 = 0;
        let collisionsSoFar = 0;
        
        for (const collision of simulationData.collisions) {
            if (currentTime >= collision.time) {
                collisionsSoFar++;
            }
        }
        
        // Count splits that have occurred
        if (simulationData.splits) {
            for (const split of simulationData.splits) {
                if (currentTime >= split.time) {
                    collisionsSoFar++;
                }
            }
        }
        
        // Draw collision flash effects
        for (const collision of simulationData.collisions) {
            const timeSinceCollision = currentTime - collision.time;
            if (timeSinceCollision >= 0 && timeSinceCollision < 0.4) {
                const alpha = 1 - (timeSinceCollision / 0.4);
                const radius = PARTICLE_RADIUS * 2 + timeSinceCollision * 50;
                
                ctx.save();
                ctx.filter = 'blur(1px)';
                
                ctx.beginPath();
                ctx.arc(collision.x, collision.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.75})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(255, 140, 0, ${alpha * 0.9})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.restore();
            }
        }
        
        // Draw split flash effects
        if (simulationData.splits) {
            for (const split of simulationData.splits) {
                const timeSinceSplit = currentTime - split.time;
                if (timeSinceSplit >= 0 && timeSinceSplit < 0.4) {
                    const alpha = 1 - (timeSinceSplit / 0.4);
                    const radius = PARTICLE_RADIUS * 2 + timeSinceSplit * 50;
                    
                    ctx.save();
                    ctx.filter = 'blur(1px)';
                    
                    ctx.beginPath();
                    ctx.arc(split.x, split.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.75})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(255, 140, 0, ${alpha * 0.9})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    ctx.restore();
                }
            }
        }
        
        // Draw particles
        for (const particle of particles) {
            const pos = getParticlePosition(particle, currentTime);
            if (!pos) continue;
            
            const isNo2 = particle.type === 'NO2';
            const image = isNo2 ? no2Image : n2o4Image;
            const width = isNo2 ? NO2_WIDTH : N2O4_WIDTH;
            const height = IMAGE_HEIGHT;
            
            if (isNo2) activeNo2++;
            else activeN2o4++;
            
            // Fallback to colored circle while loading
            if (imagesLoaded < 2) {
                const color = isNo2 ? NO2_COLOR : N2O4_COLOR;
                const radius = isNo2 ? PARTICLE_RADIUS : PARTICLE_RADIUS * 1.3;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                continue;
            }
            
            // Get or initialize random starting rotation
            if (!particleRotations.has(particle.id)) {
                particleRotations.set(particle.id, Math.random() * 2 * Math.PI);
            }
            const startRotation = particleRotations.get(particle.id);
            
            // Calculate rotation angle (360 degrees every 3 seconds)
            // DISABLED: Set to 0 to disable rotation
            const rotationSpeed = 2 * Math.PI / 3;
            // const angle = 0; 
            const angle = startRotation + currentTime * rotationSpeed;
            
            // Draw rotated SVG with optional brightening effect
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(angle);
            
            // Check if we need brightening effect for N2O4
            let needsBrightening = false;
            let brightenAmount = 0;
            if (!isNo2) {
                const timeSinceCreation = currentTime - particle.start_time;
                if (timeSinceCreation >= 0 && timeSinceCreation < 0.3) {
                    needsBrightening = true;
                    const fadeProgress = 1 - (timeSinceCreation / 0.3);
                    brightenAmount = fadeProgress * 0.7;
                }
            }
            
            if (needsBrightening) {
                offscreenCanvas.width = width;
                offscreenCanvas.height = height;
                offscreenCtx.clearRect(0, 0, width, height);
                offscreenCtx.drawImage(image, 0, 0, width, height);
                
                const imageData = offscreenCtx.getImageData(0, 0, width, height);
                const data = imageData.data;
                
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 0) {
                        data[i] = Math.min(255, data[i] + brightenAmount * (255 - data[i]));
                        data[i + 1] = Math.min(255, data[i + 1] + brightenAmount * (255 - data[i + 1]));
                        data[i + 2] = Math.min(255, data[i + 2] + brightenAmount * (255 - data[i + 2]));
                    }
                }
                
                offscreenCtx.putImageData(imageData, 0, 0);
                ctx.drawImage(offscreenCanvas, -width / 2, -height / 2);
            } else {
                ctx.drawImage(image, -width / 2, -height / 2, width, height);
            }
            
            ctx.restore();
        }
        
        // Update stats display
        document.getElementById('activeNo2').textContent = activeNo2;
        document.getElementById('activeN2o4').textContent = activeN2o4;
        document.getElementById('collisionCount').textContent = collisionsSoFar;
    }
    
    function setCanvasSize(width, height) {
        canvas.width = width;
        canvas.height = height;
    }
    
    function clearRotations() {
        particleRotations.clear();
    }
    
    function setDrawCallback(callback) {
        onDrawCallback = callback;
    }
    
    return {
        draw,
        setCanvasSize,
        clearRotations,
        setDrawCallback
    };
}
