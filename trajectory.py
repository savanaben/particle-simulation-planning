"""
Trajectory calculation module with wall bounce logic.
Handles both forward and backward trajectory computation.
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class Keyframe:
    """Represents a single keyframe in a particle's trajectory."""
    x: float
    y: float
    time: float


def normalize_velocity(vx: float, vy: float, speed: float) -> Tuple[float, float]:
    """Normalize velocity vector to have the specified speed magnitude."""
    magnitude = np.sqrt(vx**2 + vy**2)
    if magnitude == 0:
        # Default to diagonal direction if zero velocity
        angle = np.random.uniform(0, 2 * np.pi)
        return speed * np.cos(angle), speed * np.sin(angle)
    return (vx / magnitude) * speed, (vy / magnitude) * speed


def random_velocity(speed: float) -> Tuple[float, float]:
    """Generate a random velocity vector with the given speed magnitude."""
    angle = np.random.uniform(0, 2 * np.pi)
    return speed * np.cos(angle), speed * np.sin(angle)


def calculate_time_to_wall(
    x: float, y: float,
    vx: float, vy: float,
    width: float, height: float
) -> Tuple[float, str]:
    """
    Calculate time until the particle hits a wall.
    
    Returns:
        Tuple of (time_to_wall, wall_hit) where wall_hit is 'left', 'right', 'top', or 'bottom'
    """
    times = []
    
    # Time to hit left wall (x = 0)
    if vx < 0:
        t = -x / vx
        times.append((t, 'left'))
    
    # Time to hit right wall (x = width)
    if vx > 0:
        t = (width - x) / vx
        times.append((t, 'right'))
    
    # Time to hit bottom wall (y = 0)
    if vy < 0:
        t = -y / vy
        times.append((t, 'bottom'))
    
    # Time to hit top wall (y = height)
    if vy > 0:
        t = (height - y) / vy
        times.append((t, 'top'))
    
    # Return the smallest positive time
    valid_times = [(t, wall) for t, wall in times if t > 1e-10]
    if not valid_times:
        # Particle is stationary or at corner, return large time
        return float('inf'), 'none'
    
    return min(valid_times, key=lambda x: x[0])


def reflect_velocity(vx: float, vy: float, wall: str) -> Tuple[float, float]:
    """Reflect velocity based on which wall was hit."""
    if wall in ('left', 'right'):
        return -vx, vy
    elif wall in ('top', 'bottom'):
        return vx, -vy
    return vx, vy


def calculate_forward_trajectory(
    start_x: float, start_y: float,
    vx: float, vy: float,
    start_time: float, end_time: float,
    width: float, height: float,
    speed: float
) -> List[Keyframe]:
    """
    Calculate forward trajectory from start position to end time.
    
    Returns list of keyframes including start position and all wall bounces.
    """
    keyframes = [Keyframe(x=start_x, y=start_y, time=start_time)]
    
    current_x, current_y = start_x, start_y
    current_vx, current_vy = normalize_velocity(vx, vy, speed)
    current_time = start_time
    
    while current_time < end_time:
        time_to_wall, wall = calculate_time_to_wall(
            current_x, current_y,
            current_vx, current_vy,
            width, height
        )
        
        # Check if we reach end_time before hitting a wall
        remaining_time = end_time - current_time
        
        if time_to_wall >= remaining_time:
            # Move to final position
            final_x = current_x + current_vx * remaining_time
            final_y = current_y + current_vy * remaining_time
            keyframes.append(Keyframe(x=final_x, y=final_y, time=end_time))
            break
        else:
            # Move to wall and bounce
            current_x += current_vx * time_to_wall
            current_y += current_vy * time_to_wall
            current_time += time_to_wall
            
            # Clamp to wall boundaries to avoid floating point drift
            current_x = max(0, min(width, current_x))
            current_y = max(0, min(height, current_y))
            
            keyframes.append(Keyframe(x=current_x, y=current_y, time=current_time))
            
            # Reflect velocity
            current_vx, current_vy = reflect_velocity(current_vx, current_vy, wall)
    
    return keyframes


def calculate_backward_trajectory(
    end_x: float, end_y: float,
    vx: float, vy: float,
    end_time: float, start_time: float,
    width: float, height: float,
    speed: float
) -> List[Keyframe]:
    """
    Calculate backward trajectory from end position to start time.
    This traces where the particle came from.
    
    Returns list of keyframes in chronological order (start to end).
    """
    # Reverse the velocity to trace backwards
    reverse_vx, reverse_vy = -vx, -vy
    
    keyframes = [Keyframe(x=end_x, y=end_y, time=end_time)]
    
    current_x, current_y = end_x, end_y
    current_vx, current_vy = normalize_velocity(reverse_vx, reverse_vy, speed)
    current_time = end_time
    
    while current_time > start_time:
        time_to_wall, wall = calculate_time_to_wall(
            current_x, current_y,
            current_vx, current_vy,
            width, height
        )
        
        # Time remaining to trace back
        remaining_time = current_time - start_time
        
        if time_to_wall >= remaining_time:
            # Move to initial position
            initial_x = current_x + current_vx * remaining_time
            initial_y = current_y + current_vy * remaining_time
            keyframes.append(Keyframe(x=initial_x, y=initial_y, time=start_time))
            break
        else:
            # Move to wall and bounce
            current_x += current_vx * time_to_wall
            current_y += current_vy * time_to_wall
            current_time -= time_to_wall
            
            # Clamp to boundaries
            current_x = max(0, min(width, current_x))
            current_y = max(0, min(height, current_y))
            
            keyframes.append(Keyframe(x=current_x, y=current_y, time=current_time))
            
            # Reflect velocity for the bounce
            current_vx, current_vy = reflect_velocity(current_vx, current_vy, wall)
    
    # Reverse to get chronological order
    keyframes.reverse()
    return keyframes


def average_velocity(vx1: float, vy1: float, vx2: float, vy2: float, speed: float) -> Tuple[float, float]:
    """
    Calculate averaged velocity from two incoming velocities.
    Result is normalized to the given speed.
    """
    avg_vx = (vx1 + vx2) / 2
    avg_vy = (vy1 + vy2) / 2
    
    # Handle case where velocities cancel out
    if abs(avg_vx) < 1e-10 and abs(avg_vy) < 1e-10:
        return random_velocity(speed)
    
    return normalize_velocity(avg_vx, avg_vy, speed)


