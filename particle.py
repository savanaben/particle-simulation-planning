"""
Particle class to track state and keyframes for NO2 and N2O4 particles.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum

from trajectory import Keyframe


class ParticleType(Enum):
    NO2 = "NO2"
    N2O4 = "N2O4"


@dataclass
class Particle:
    """
    Represents a particle in the simulation.
    
    Attributes:
        id: Unique identifier for the particle
        particle_type: Either NO2 or N2O4
        keyframes: List of keyframes defining the particle's trajectory
        start_time: Time when the particle appears (0 for initial NO2 particles)
        end_time: Time when the particle disappears (collision time for NO2, animation end for others)
        collision_id: ID of the collision this particle is involved in (None if no collision)
        velocity: Current velocity tuple (vx, vy) - used during trajectory calculation
    """
    id: int
    particle_type: ParticleType
    keyframes: List[Keyframe] = field(default_factory=list)
    start_time: float = 0.0
    end_time: Optional[float] = None
    collision_id: Optional[int] = None
    velocity: tuple = (0.0, 0.0)
    
    def add_keyframe(self, x: float, y: float, time: float) -> None:
        """Add a keyframe to the particle's trajectory."""
        self.keyframes.append(Keyframe(x=x, y=y, time=time))
    
    def set_keyframes(self, keyframes: List[Keyframe]) -> None:
        """Set the complete list of keyframes."""
        self.keyframes = keyframes
    
    def get_position_at_time(self, time: float) -> Optional[tuple]:
        """
        Get interpolated position at a specific time.
        Returns None if time is outside the particle's lifespan.
        """
        if not self.keyframes:
            return None
        
        if time < self.start_time or (self.end_time is not None and time > self.end_time):
            return None
        
        # Find the keyframes surrounding this time
        for i in range(len(self.keyframes) - 1):
            kf1 = self.keyframes[i]
            kf2 = self.keyframes[i + 1]
            
            if kf1.time <= time <= kf2.time:
                # Linear interpolation
                if kf2.time == kf1.time:
                    return (kf1.x, kf1.y)
                
                t = (time - kf1.time) / (kf2.time - kf1.time)
                x = kf1.x + t * (kf2.x - kf1.x)
                y = kf1.y + t * (kf2.y - kf1.y)
                return (x, y)
        
        # Return last position if at end
        if self.keyframes:
            last = self.keyframes[-1]
            if abs(time - last.time) < 1e-6:
                return (last.x, last.y)
        
        return None
    
    def is_active_at_time(self, time: float) -> bool:
        """Check if the particle exists at the given time."""
        if time < self.start_time:
            return False
        if self.end_time is not None and time > self.end_time:
            return False
        return True
    
    def get_final_velocity(self) -> tuple:
        """Get the velocity at the end of the trajectory (for N2O4 creation)."""
        return self.velocity
    
    def __repr__(self) -> str:
        return f"Particle({self.id}, {self.particle_type.value}, keyframes={len(self.keyframes)})"


@dataclass 
class Collision:
    """
    Represents a collision between two NO2 particles.
    
    Attributes:
        id: Unique collision identifier
        time: When the collision occurs
        x: X coordinate of collision point
        y: Y coordinate of collision point
        particle1_id: ID of first NO2 particle
        particle2_id: ID of second NO2 particle
        result_particle_id: ID of the N2O4 particle created
    """
    id: int
    time: float
    x: float
    y: float
    particle1_id: int
    particle2_id: int
    result_particle_id: Optional[int] = None

