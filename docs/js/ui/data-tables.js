// Data tables module
// Handles collision/split tables and trajectory tables

// Convert seconds to 60fps notation (e.g., 1.5s -> "1:30")
export function toFrameTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '—';
    const wholeSecs = Math.floor(seconds);
    const frames = Math.round((seconds % 1) * 60);
    return `${wholeSecs}:${frames.toString().padStart(2, '0')}`;
}

// Copy value to clipboard with visual feedback
export function copyCell(element) {
    const value = element.getAttribute('data-value') || element.textContent;
    navigator.clipboard.writeText(value).then(() => {
        element.classList.add('copied');
        setTimeout(() => element.classList.remove('copied'), 600);
    });
}

// Make toggleParticle available globally for onclick handlers
window.toggleParticle = function(header) {
    header.classList.toggle('expanded');
    const keyframes = header.nextElementSibling;
    keyframes.classList.toggle('expanded');
};

// Make copyCell available globally for onclick handlers
window.copyCell = copyCell;

export function populateDataTables(simulationData) {
    if (!simulationData) return;

    document.getElementById('dataSection').classList.add('visible');

    const collisionBody = document.getElementById('collisionTableBody');
    collisionBody.innerHTML = '';

    // Combine collisions and splits into a single sorted events array
    const events = [];
    
    for (const collision of simulationData.collisions) {
        events.push({
            type: 'collision',
            time: collision.time,
            x: collision.x,
            y: collision.y,
            data: collision
        });
    }
    
    if (simulationData.splits && simulationData.splits.length > 0) {
        for (const split of simulationData.splits) {
            events.push({
                type: 'split',
                time: split.time,
                x: split.x,
                y: split.y,
                data: split
            });
        }
    }
    
    // Sort events by time
    events.sort((a, b) => a.time - b.time);
    
    // Render sorted events
    for (const event of events) {
        const row = document.createElement('tr');
        if (event.type === 'collision') {
            const collision = event.data;
            row.innerHTML = `
                <td class="copyable" onclick="copyCell(this)" data-value="${toFrameTime(collision.time)}">${toFrameTime(collision.time)}</td>
                <td>(${collision.x.toFixed(1)}, ${collision.y.toFixed(1)})</td>
                <td>
                    <span class="particle-badge no2">NO₂ #${collision.particle1_id}</span>
                    <span class="particle-badge no2">NO₂ #${collision.particle2_id}</span>
                </td>
                <td class="arrow">→</td>
                <td>
                    <span class="particle-badge n2o4">N₂O₄ #${collision.result_particle_id}</span>
                </td>
            `;
        } else { // split
            const split = event.data;
            row.innerHTML = `
                <td class="copyable" onclick="copyCell(this)" data-value="${toFrameTime(split.time)}">${toFrameTime(split.time)}</td>
                <td>(${split.x.toFixed(1)}, ${split.y.toFixed(1)})</td>
                <td>
                    <span class="particle-badge n2o4">N₂O₄ #${split.source_particle_id}</span>
                </td>
                <td class="arrow">→</td>
                <td>
                    <span class="particle-badge no2">NO₂ #${split.result_particle1_id}</span>
                    <span class="particle-badge no2">NO₂ #${split.result_particle2_id}</span>
                </td>
            `;
        }
        collisionBody.appendChild(row);
    }

    const trajContainer = document.getElementById('particleTrajectories');
    trajContainer.innerHTML = '';

    const sortedParticles = [...simulationData.particles].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'NO2' ? -1 : 1;
        return a.id - b.id;
    });

    for (const particle of sortedParticles) {
        const isNo2 = particle.type === 'NO2';
        const typeClass = isNo2 ? 'no2' : 'n2o4';
        const typeName = isNo2 ? 'NO₂' : 'N₂O₄';
        
        let collisionInfo = '';
        if (isNo2) {
            const collision = simulationData.collisions.find(
                c => c.particle1_id === particle.id || c.particle2_id === particle.id
            );
            const split = simulationData.splits ? simulationData.splits.find(
                s => s.result_particle1_id === particle.id || s.result_particle2_id === particle.id
            ) : null;
            
            if (collision && split) {
                collisionInfo = `Created from split at ${toFrameTime(split.time)}, collides at ${toFrameTime(collision.time)}`;
            } else if (collision) {
                collisionInfo = `Collides at ${toFrameTime(collision.time)} → N₂O₄ #${collision.result_particle_id}`;
            } else if (split) {
                collisionInfo = `Created from N₂O₄ #${split.source_particle_id} split at ${toFrameTime(split.time)}`;
            } else {
                collisionInfo = 'No collision';
            }
        } else {
            const collision = simulationData.collisions.find(c => c.result_particle_id === particle.id);
            const split = simulationData.splits ? simulationData.splits.find(s => s.source_particle_id === particle.id) : null;
            
            if (collision && split) {
                collisionInfo = `Created from NO₂ #${collision.particle1_id} + #${collision.particle2_id}, splits at ${toFrameTime(split.time)}`;
            } else if (collision) {
                collisionInfo = `Created from NO₂ #${collision.particle1_id} + #${collision.particle2_id}`;
            } else if (split) {
                collisionInfo = `Splits at ${toFrameTime(split.time)} → NO₂ #${split.result_particle1_id} + #${split.result_particle2_id}`;
            }
        }

        const group = document.createElement('div');
        group.className = 'particle-group';
        group.innerHTML = `
            <div class="particle-header" onclick="toggleParticle(this)">
                <div class="particle-info">
                    <span class="particle-id ${typeClass}">${typeName} #${particle.id}</span>
                    <span class="particle-meta">${particle.keyframes.length} keyframes • ${toFrameTime(particle.start_time)} - ${toFrameTime(particle.end_time)}</span>
                </div>
                <div class="particle-meta">${collisionInfo}</div>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="particle-keyframes">
                <p class="time-format-note">Time format: seconds:frames (60fps). Click any cell to copy.</p>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Time (s:f)</th>
                            <th>X (px)</th>
                            <th>Y (px)</th>
                            <th>Duration (s:f)</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${particle.keyframes.map((kf, idx) => {
                            const durationSec = idx < particle.keyframes.length - 1 
                                ? particle.keyframes[idx + 1].time - kf.time
                                : null;
                            const durationStr = durationSec !== null ? toFrameTime(durationSec) : '—';
                            const xVal = kf.x.toFixed(1);
                            const yVal = kf.y.toFixed(1);
                            
                            let note = '';
                            let highlightClass = '';
                            if (idx === 0) {
                                if (isNo2) {
                                    const fromSplit = simulationData.splits ? simulationData.splits.find(
                                        s => s.result_particle1_id === particle.id || s.result_particle2_id === particle.id
                                    ) : null;
                                    note = fromSplit ? 'Created (split)' : 'Start';
                                } else {
                                    note = 'Created (collision)';
                                }
                                highlightClass = 'keyframe-highlight';
                            } else if (idx === particle.keyframes.length - 1) {
                                if (isNo2 && particle.end_time < simulationData.params.animation_duration) {
                                    note = 'Destroyed (collision)';
                                    highlightClass = 'keyframe-highlight';
                                } else if (!isNo2 && particle.end_time < simulationData.params.animation_duration) {
                                    note = 'Destroyed (split)';
                                    highlightClass = 'keyframe-highlight';
                                } else {
                                    note = 'End';
                                }
                            } else {
                                const atLeftWall = kf.x <= 1;
                                const atRightWall = kf.x >= simulationData.params.container_width - 1;
                                const atTopWall = kf.y >= simulationData.params.container_height - 1;
                                const atBottomWall = kf.y <= 1;
                                if (atLeftWall || atRightWall || atTopWall || atBottomWall) {
                                    note = 'Wall bounce';
                                }
                            }
                            
                            return `
                                <tr class="${highlightClass}">
                                    <td>${idx}</td>
                                    <td class="copyable" onclick="copyCell(this)" data-value="${toFrameTime(kf.time)}">${toFrameTime(kf.time)}</td>
                                    <td class="copyable" onclick="copyCell(this)" data-value="${xVal}">${xVal}</td>
                                    <td class="copyable" onclick="copyCell(this)" data-value="${yVal}">${yVal}</td>
                                    <td class="copyable" onclick="copyCell(this)" data-value="${durationStr}">${durationStr}</td>
                                    <td><span class="collision-note">${note}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        trajContainer.appendChild(group);
    }

    // Set up CSV export button
    const copyAllBtn = document.getElementById('copyAllBtn');
    copyAllBtn.onclick = () => {
        if (!simulationData) return;

        let csv = 'particle_id,particle_type,keyframe_idx,x,y,time_frames,duration_frames\n';
        
        for (const particle of simulationData.particles) {
            for (let i = 0; i < particle.keyframes.length; i++) {
                const kf = particle.keyframes[i];
                const durationSec = i < particle.keyframes.length - 1 
                    ? particle.keyframes[i + 1].time - kf.time
                    : 0;
                csv += `${particle.id},${particle.type},${i},${kf.x.toFixed(1)},${kf.y.toFixed(1)},${toFrameTime(kf.time)},${toFrameTime(durationSec)}\n`;
            }
        }

        navigator.clipboard.writeText(csv).then(() => {
            copyAllBtn.textContent = '✓ Copied!';
            copyAllBtn.classList.add('copied');
            setTimeout(() => {
                copyAllBtn.textContent = 'Copy All Data as CSV';
                copyAllBtn.classList.remove('copied');
            }, 2000);
        });
    };
}
