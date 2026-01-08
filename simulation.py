"""
Main simulation orchestrator.
Coordinates collision scheduling and trajectory generation for all particles.
"""

import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass

from particle import Particle, ParticleType, Collision
from collision_scheduler import (
    schedule_collisions,
    create_colliding_particles,
    create_non_colliding_particle,
    CollisionSchedule
)


@dataclass
class SimulationResult:
    """Contains all simulation outputs."""
    particles: List[Particle]
    collisions: List[Collision]
    animation_duration: float
    container_width: float
    container_height: float
    
    def get_particle_by_id(self, particle_id: int) -> Optional[Particle]:
        """Get a particle by its ID."""
        for p in self.particles:
            if p.id == particle_id:
                return p
        return None
    
    def get_no2_particles(self) -> List[Particle]:
        """Get all NO2 particles."""
        return [p for p in self.particles if p.particle_type == ParticleType.NO2]
    
    def get_n2o4_particles(self) -> List[Particle]:
        """Get all N2O4 particles."""
        return [p for p in self.particles if p.particle_type == ParticleType.N2O4]
    
    def get_active_particles_at_time(self, time: float) -> List[Particle]:
        """Get all particles that are active at the given time."""
        return [p for p in self.particles if p.is_active_at_time(time)]


class Simulation:
    """
    Main simulation class that orchestrates the entire particle simulation.
    """
    
    def __init__(
        self,
        container_width: float = 300,
        container_height: float = 300,
        num_particles: int = 15,
        num_collisions: int = 6,
        particle_speed: float = 80.0,
        animation_duration: float = 8.0,
        collision_margin: float = 20,
        random_seed: Optional[int] = None
    ):
        """
        Initialize the simulation with parameters.
        
        Args:
            container_width: Width of the container in pixels
            container_height: Height of the container in pixels
            num_particles: Total number of NO2 particles at start
            num_collisions: Number of collisions to occur
            particle_speed: Speed of all particles in pixels/second
            animation_duration: Total animation duration in seconds
            collision_margin: Minimum distance from walls for collision points
            random_seed: Seed for reproducibility (None for random)
        """
        self.container_width = container_width
        self.container_height = container_height
        self.num_particles = num_particles
        self.num_collisions = num_collisions
        self.particle_speed = particle_speed
        self.animation_duration = animation_duration
        self.collision_margin = collision_margin
        self.random_seed = random_seed
        
        # Validation
        if num_collisions * 2 > num_particles:
            raise ValueError(
                f"Cannot have {num_collisions} collisions with only {num_particles} particles. "
                f"Need at least {num_collisions * 2} particles."
            )
    
    def run(self) -> SimulationResult:
        """
        Run the simulation and generate all particle trajectories.
        
        Returns:
            SimulationResult containing all particles and collisions
        """
        # Set random seed if provided
        if self.random_seed is not None:
            np.random.seed(self.random_seed)
        
        # Schedule collisions
        schedule = schedule_collisions(
            num_particles=self.num_particles,
            num_collisions=self.num_collisions,
            animation_duration=self.animation_duration,
            container_width=self.container_width,
            container_height=self.container_height,
            collision_margin=self.collision_margin
        )
        
        particles: List[Particle] = []
        collisions: List[Collision] = []
        
        # N2O4 particles get IDs starting after the last NO2 particle
        next_n2o4_id = self.num_particles + 1
        
        # Create particles for each collision
        for collision in schedule.collisions:
            p1, p2, n2o4 = create_colliding_particles(
                collision=collision,
                speed=self.particle_speed,
                container_width=self.container_width,
                container_height=self.container_height,
                next_n2o4_id=next_n2o4_id,
                animation_duration=self.animation_duration
            )
            
            # Update collision with N2O4 particle ID
            collision.result_particle_id = next_n2o4_id
            
            particles.extend([p1, p2, n2o4])
            collisions.append(collision)
            next_n2o4_id += 1
        
        # Create non-colliding particles
        for particle_id in schedule.non_colliding_particle_ids:
            particle = create_non_colliding_particle(
                particle_id=particle_id,
                speed=self.particle_speed,
                animation_duration=self.animation_duration,
                container_width=self.container_width,
                container_height=self.container_height
            )
            particles.append(particle)
        
        # Sort particles by ID for consistent output
        particles.sort(key=lambda p: (p.particle_type.value, p.id))
        
        return SimulationResult(
            particles=particles,
            collisions=collisions,
            animation_duration=self.animation_duration,
            container_width=self.container_width,
            container_height=self.container_height
        )


def run_simulation_from_config() -> SimulationResult:
    """
    Run simulation using parameters from config.py
    
    Returns:
        SimulationResult from the simulation
    """
    import config
    
    sim = Simulation(
        container_width=config.CONTAINER_WIDTH,
        container_height=config.CONTAINER_HEIGHT,
        num_particles=config.NUM_PARTICLES,
        num_collisions=config.NUM_COLLISIONS,
        particle_speed=config.PARTICLE_SPEED,
        animation_duration=config.ANIMATION_DURATION,
        collision_margin=config.COLLISION_MARGIN,
        random_seed=config.RANDOM_SEED
    )
    
    return sim.run()

