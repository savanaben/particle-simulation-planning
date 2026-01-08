"""
Export utilities for generating CSV output for Rive animation.
"""

import pandas as pd
from typing import List, Optional
from simulation import SimulationResult
from particle import Particle, ParticleType


def generate_keyframe_dataframe(result: SimulationResult) -> pd.DataFrame:
    """
    Generate a DataFrame with all keyframe data for Rive animation.
    
    The DataFrame includes:
    - particle_id: Unique identifier for the particle
    - particle_type: NO2 or N2O4
    - keyframe_idx: Index of the keyframe in the particle's trajectory
    - x: X coordinate in pixels
    - y: Y coordinate in pixels
    - time_sec: Time in seconds when particle reaches this position
    - duration_to_next: Duration in seconds to the next keyframe (0 for last keyframe)
    
    Args:
        result: SimulationResult from running the simulation
    
    Returns:
        pandas DataFrame with keyframe data
    """
    rows = []
    
    for particle in result.particles:
        keyframes = particle.keyframes
        
        for i, kf in enumerate(keyframes):
            # Calculate duration to next keyframe
            if i < len(keyframes) - 1:
                duration_to_next = keyframes[i + 1].time - kf.time
            else:
                duration_to_next = 0.0
            
            rows.append({
                'particle_id': particle.id,
                'particle_type': particle.particle_type.value,
                'keyframe_idx': i,
                'x': round(kf.x, 2),
                'y': round(kf.y, 2),
                'time_sec': round(kf.time, 4),
                'duration_to_next': round(duration_to_next, 4),
                'is_start': i == 0,
                'is_end': i == len(keyframes) - 1,
                'collision_id': particle.collision_id
            })
    
    df = pd.DataFrame(rows)
    
    # Sort by particle type, particle id, then keyframe index
    df = df.sort_values(['particle_type', 'particle_id', 'keyframe_idx']).reset_index(drop=True)
    
    return df


def generate_collision_dataframe(result: SimulationResult) -> pd.DataFrame:
    """
    Generate a DataFrame with collision event data.
    
    Args:
        result: SimulationResult from running the simulation
    
    Returns:
        pandas DataFrame with collision data
    """
    rows = []
    
    for collision in result.collisions:
        rows.append({
            'collision_id': collision.id,
            'time_sec': round(collision.time, 4),
            'x': round(collision.x, 2),
            'y': round(collision.y, 2),
            'no2_particle_1': collision.particle1_id,
            'no2_particle_2': collision.particle2_id,
            'n2o4_particle': collision.result_particle_id
        })
    
    return pd.DataFrame(rows)


def generate_particle_summary(result: SimulationResult) -> pd.DataFrame:
    """
    Generate a summary DataFrame with one row per particle.
    
    Args:
        result: SimulationResult from running the simulation
    
    Returns:
        pandas DataFrame with particle summary
    """
    rows = []
    
    for particle in result.particles:
        start_pos = particle.keyframes[0] if particle.keyframes else None
        end_pos = particle.keyframes[-1] if particle.keyframes else None
        
        rows.append({
            'particle_id': particle.id,
            'particle_type': particle.particle_type.value,
            'start_time': round(particle.start_time, 4),
            'end_time': round(particle.end_time, 4) if particle.end_time else None,
            'start_x': round(start_pos.x, 2) if start_pos else None,
            'start_y': round(start_pos.y, 2) if start_pos else None,
            'end_x': round(end_pos.x, 2) if end_pos else None,
            'end_y': round(end_pos.y, 2) if end_pos else None,
            'num_keyframes': len(particle.keyframes),
            'num_bounces': len(particle.keyframes) - 2,  # Subtract start and end
            'collision_id': particle.collision_id
        })
    
    df = pd.DataFrame(rows)
    df = df.sort_values(['particle_type', 'particle_id']).reset_index(drop=True)
    
    return df


def export_to_csv(
    result: SimulationResult,
    keyframes_path: str = 'particle_keyframes.csv',
    collisions_path: Optional[str] = 'collisions.csv',
    summary_path: Optional[str] = 'particle_summary.csv'
) -> None:
    """
    Export simulation results to CSV files.
    
    Args:
        result: SimulationResult from running the simulation
        keyframes_path: Path for the keyframes CSV
        collisions_path: Path for the collisions CSV (None to skip)
        summary_path: Path for the summary CSV (None to skip)
    """
    # Export keyframes
    keyframes_df = generate_keyframe_dataframe(result)
    keyframes_df.to_csv(keyframes_path, index=False)
    print(f"Exported keyframes to: {keyframes_path}")
    print(f"  - Total keyframes: {len(keyframes_df)}")
    print(f"  - NO2 particles: {len([p for p in result.particles if p.particle_type == ParticleType.NO2])}")
    print(f"  - N2O4 particles: {len([p for p in result.particles if p.particle_type == ParticleType.N2O4])}")
    
    # Export collisions
    if collisions_path:
        collisions_df = generate_collision_dataframe(result)
        collisions_df.to_csv(collisions_path, index=False)
        print(f"Exported collisions to: {collisions_path}")
        print(f"  - Total collisions: {len(collisions_df)}")
    
    # Export summary
    if summary_path:
        summary_df = generate_particle_summary(result)
        summary_df.to_csv(summary_path, index=False)
        print(f"Exported summary to: {summary_path}")


def print_keyframes_preview(result: SimulationResult, max_particles: int = 3) -> None:
    """
    Print a preview of keyframes for the first few particles.
    
    Args:
        result: SimulationResult from running the simulation
        max_particles: Maximum number of particles to preview
    """
    print("\n" + "="*60)
    print("KEYFRAMES PREVIEW")
    print("="*60)
    
    shown = 0
    for particle in result.particles:
        if shown >= max_particles:
            break
        
        print(f"\n{particle.particle_type.value} Particle {particle.id}")
        print(f"  Active: {particle.start_time:.2f}s - {particle.end_time:.2f}s" 
              if particle.end_time else f"  Active from: {particle.start_time:.2f}s")
        print(f"  Keyframes ({len(particle.keyframes)}):")
        
        for i, kf in enumerate(particle.keyframes[:5]):  # Show first 5 keyframes
            print(f"    [{i}] t={kf.time:.3f}s: ({kf.x:.1f}, {kf.y:.1f})")
        
        if len(particle.keyframes) > 5:
            print(f"    ... and {len(particle.keyframes) - 5} more keyframes")
        
        shown += 1
    
    if len(result.particles) > max_particles:
        print(f"\n... and {len(result.particles) - max_particles} more particles")

