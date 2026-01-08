"""
Flask web application for interactive particle simulation.
No database - simulation runs in memory and returns JSON.
"""

from flask import Flask, render_template, jsonify, request
from simulation import Simulation
from particle import ParticleType

app = Flask(__name__)


@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


@app.route('/api/simulate', methods=['POST'])
def simulate():
    """
    Run simulation with provided parameters and return keyframe data.
    
    Expected JSON payload:
    {
        "container_width": 300,
        "container_height": 300,
        "num_particles": 15,
        "num_collisions": 6,
        "particle_speed": 80,
        "animation_duration": 8,
        "random_seed": null  // null for random
    }
    """
    try:
        data = request.get_json()
        
        # Extract parameters with defaults
        params = {
            'container_width': float(data.get('container_width', 300)),
            'container_height': float(data.get('container_height', 300)),
            'num_particles': int(data.get('num_particles', 15)),
            'num_collisions': int(data.get('num_collisions', 6)),
            'particle_speed': float(data.get('particle_speed', 80)),
            'animation_duration': float(data.get('animation_duration', 8)),
            'collision_margin': 20,
            'random_seed': data.get('random_seed')
        }
        
        # Validate
        if params['num_collisions'] * 2 > params['num_particles']:
            return jsonify({
                'error': f"Cannot have {params['num_collisions']} collisions with only {params['num_particles']} particles. Need at least {params['num_collisions'] * 2}."
            }), 400
        
        # Run simulation
        sim = Simulation(**params)
        result = sim.run()
        
        # Convert to JSON-friendly format
        particles_data = []
        for particle in result.particles:
            keyframes = [
                {
                    'x': round(kf.x, 2),
                    'y': round(kf.y, 2),
                    'time': round(kf.time, 4)
                }
                for kf in particle.keyframes
            ]
            
            particles_data.append({
                'id': particle.id,
                'type': particle.particle_type.value,
                'start_time': round(particle.start_time, 4),
                'end_time': round(particle.end_time, 4) if particle.end_time else params['animation_duration'],
                'keyframes': keyframes
            })
        
        collisions_data = [
            {
                'id': c.id,
                'time': round(c.time, 4),
                'x': round(c.x, 2),
                'y': round(c.y, 2),
                'particle1_id': c.particle1_id,
                'particle2_id': c.particle2_id,
                'result_particle_id': c.result_particle_id
            }
            for c in result.collisions
        ]
        
        return jsonify({
            'success': True,
            'params': {
                'container_width': params['container_width'],
                'container_height': params['container_height'],
                'animation_duration': params['animation_duration']
            },
            'particles': particles_data,
            'collisions': collisions_data,
            'summary': {
                'total_particles': len(particles_data),
                'no2_count': len([p for p in particles_data if p['type'] == 'NO2']),
                'n2o4_count': len([p for p in particles_data if p['type'] == 'N2O4']),
                'collision_count': len(collisions_data)
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("Starting Particle Simulation Server...")
    print("Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)

