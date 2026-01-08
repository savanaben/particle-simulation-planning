"""
Collision scheduling module.
Handles evenly distributing collisions across animation duration
and computing backward trajectories for colliding particles.
"""

import numpy as np
from typing import List, Tuple
from dataclasses import dataclass

from particle import Particle, ParticleType, Collision
from trajectory import (
    calculate_backward_trajectory,
    calculate_forward_trajectory,
    random_velocity,
    average_velocity,
    normalize_velocity
)


@dataclass
class CollisionSchedule:
    """Contains all scheduled collisions and particle assignments."""
    collisions: List[Collision]
    colliding_particle_ids: List[int]  # IDs of particles that will collide
    non_colliding_particle_ids: List[int]  # IDs of particles that won't collide


def schedule_collisions(
    num_particles: int,
    num_collisions: int,
    animation_duration: float,
    container_width: float,
    container_height: float,
    collision_margin: float
) -> CollisionSchedule:
    """
    Schedule collisions evenly across the animation duration.
    
    Args:
        num_particles: Total number of NO2 particles
        num_collisions: Number of collisions to schedule
        animation_duration: Total animation time in seconds
        container_width: Container width in pixels
        container_height: Container height in pixels
        collision_margin: Minimum distance from walls for collision points
    
    Returns:
        CollisionSchedule with collision details and particle assignments
    """
    # Validate inputs
    particles_needed = num_collisions * 2
    if particles_needed > num_particles:
        raise ValueError(
            f"Not enough particles for {num_collisions} collisions. "
            f"Need {particles_needed}, have {num_particles}."
        )
    
    # Calculate evenly spaced collision times
    # Leave some margin at start and end for visual clarity
    time_margin = animation_duration * 0.1
    available_duration = animation_duration - (2 * time_margin)
    
    if num_collisions == 1:
        collision_times = [animation_duration / 2]
    else:
        time_step = available_duration / (num_collisions - 1) if num_collisions > 1 else 0
        collision_times = [
            time_margin + i * time_step 
            for i in range(num_collisions)
        ]
    
    # Randomly assign particles to collisions
    particle_ids = list(range(1, num_particles + 1))
    np.random.shuffle(particle_ids)
    
    colliding_ids = particle_ids[:particles_needed]
    non_colliding_ids = particle_ids[particles_needed:]
    
    # Create collision objects
    collisions = []
    for i in range(num_collisions):
        # Random collision point within margins
        x = np.random.uniform(collision_margin, container_width - collision_margin)
        y = np.random.uniform(collision_margin, container_height - collision_margin)
        
        collision = Collision(
            id=i + 1,
            time=collision_times[i],
            x=x,
            y=y,
            particle1_id=colliding_ids[i * 2],
            particle2_id=colliding_ids[i * 2 + 1],
            result_particle_id=None  # Will be assigned during simulation
        )
        collisions.append(collision)
    
    return CollisionSchedule(
        collisions=collisions,
        colliding_particle_ids=colliding_ids,
        non_colliding_particle_ids=non_colliding_ids
    )


def create_colliding_particles(
    collision: Collision,
    speed: float,
    container_width: float,
    container_height: float,
    next_n2o4_id: int,
    animation_duration: float
) -> Tuple[Particle, Particle, Particle]:
    """
    Create two NO2 particles that will collide and the resulting N2O4 particle.
    
    Uses backward trajectory calculation to determine where particles start,
    then forward trajectory for the N2O4 particle.
    
    Args:
        collision: The collision specification
        speed: Particle speed in pixels/second
        container_width: Container width
        container_height: Container height
        next_n2o4_id: ID to assign to the N2O4 particle
        animation_duration: Total animation duration for N2O4 trajectory
    
    Returns:
        Tuple of (particle1, particle2, n2o4_particle)
    """
    # Generate random incoming velocities for the two particles
    # They should be coming from different directions for visual interest
    angle1 = np.random.uniform(0, 2 * np.pi)
    angle2 = angle1 + np.pi + np.random.uniform(-np.pi/3, np.pi/3)  # Roughly opposite
    
    vx1, vy1 = speed * np.cos(angle1), speed * np.sin(angle1)
    vx2, vy2 = speed * np.cos(angle2), speed * np.sin(angle2)
    
    # Calculate backward trajectories for both particles
    keyframes1 = calculate_backward_trajectory(
        end_x=collision.x,
        end_y=collision.y,
        vx=vx1,
        vy=vy1,
        end_time=collision.time,
        start_time=0.0,
        width=container_width,
        height=container_height,
        speed=speed
    )
    
    keyframes2 = calculate_backward_trajectory(
        end_x=collision.x,
        end_y=collision.y,
        vx=vx2,
        vy=vy2,
        end_time=collision.time,
        start_time=0.0,
        width=container_width,
        height=container_height,
        speed=speed
    )
    
    # Create NO2 particles
    particle1 = Particle(
        id=collision.particle1_id,
        particle_type=ParticleType.NO2,
        keyframes=keyframes1,
        start_time=0.0,
        end_time=collision.time,
        collision_id=collision.id,
        velocity=(vx1, vy1)
    )
    
    particle2 = Particle(
        id=collision.particle2_id,
        particle_type=ParticleType.NO2,
        keyframes=keyframes2,
        start_time=0.0,
        end_time=collision.time,
        collision_id=collision.id,
        velocity=(vx2, vy2)
    )
    
    # Calculate N2O4 velocity (average of incoming velocities)
    n2o4_vx, n2o4_vy = average_velocity(vx1, vy1, vx2, vy2, speed)
    
    # Calculate forward trajectory for N2O4 from collision to animation end
    n2o4_keyframes = calculate_forward_trajectory(
        start_x=collision.x,
        start_y=collision.y,
        vx=n2o4_vx,
        vy=n2o4_vy,
        start_time=collision.time,
        end_time=animation_duration,
        width=container_width,
        height=container_height,
        speed=speed
    )
    
    n2o4_particle = Particle(
        id=next_n2o4_id,
        particle_type=ParticleType.N2O4,
        keyframes=n2o4_keyframes,
        start_time=collision.time,
        end_time=animation_duration,
        collision_id=collision.id,
        velocity=(n2o4_vx, n2o4_vy)
    )
    
    return particle1, particle2, n2o4_particle


def create_non_colliding_particle(
    particle_id: int,
    speed: float,
    animation_duration: float,
    container_width: float,
    container_height: float
) -> Particle:
    """
    Create an NO2 particle that doesn't collide with anything.
    Starts at a random position with random velocity.
    
    Args:
        particle_id: ID for the particle
        speed: Particle speed in pixels/second
        animation_duration: Total animation duration
        container_width: Container width
        container_height: Container height
    
    Returns:
        Particle with full trajectory from start to end
    """
    # Random starting position
    margin = 10  # Small margin from edges
    start_x = np.random.uniform(margin, container_width - margin)
    start_y = np.random.uniform(margin, container_height - margin)
    
    # Random velocity
    vx, vy = random_velocity(speed)
    
    # Calculate full trajectory
    keyframes = calculate_forward_trajectory(
        start_x=start_x,
        start_y=start_y,
        vx=vx,
        vy=vy,
        start_time=0.0,
        end_time=animation_duration,
        width=container_width,
        height=container_height,
        speed=speed
    )
    
    return Particle(
        id=particle_id,
        particle_type=ParticleType.NO2,
        keyframes=keyframes,
        start_time=0.0,
        end_time=animation_duration,
        collision_id=None,
        velocity=(vx, vy)
    )

