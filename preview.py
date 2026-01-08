"""
Matplotlib animation preview for the particle simulation.
Visualizes particles moving, bouncing, and colliding.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Circle, Rectangle
from matplotlib.collections import PatchCollection
from typing import List, Optional, Tuple

from simulation import SimulationResult
from particle import Particle, ParticleType
import config


class SimulationPreview:
    """
    Creates an animated preview of the particle simulation using matplotlib.
    """
    
    def __init__(
        self,
        result: SimulationResult,
        fps: int = 30,
        no2_color: str = '#E74C3C',
        n2o4_color: str = '#3498DB',
        particle_radius: float = 6,
        show_trails: bool = False
    ):
        """
        Initialize the preview.
        
        Args:
            result: SimulationResult from the simulation
            fps: Frames per second for the animation
            no2_color: Color for NO2 particles
            n2o4_color: Color for N2O4 particles
            particle_radius: Visual radius of particles in pixels
            show_trails: Whether to show particle trails
        """
        self.result = result
        self.fps = fps
        self.no2_color = no2_color
        self.n2o4_color = n2o4_color
        self.particle_radius = particle_radius
        self.show_trails = show_trails
        
        # Calculate total frames
        self.total_frames = int(result.animation_duration * fps)
        
        # Setup the figure
        self.fig, self.ax = plt.subplots(figsize=(8, 8))
        self._setup_axes()
        
        # Create particle artists
        self.particle_artists = {}
        self.trail_artists = {} if show_trails else None
        self._create_artists()
        
        # Time display
        self.time_text = self.ax.text(
            0.02, 0.98, '', 
            transform=self.ax.transAxes,
            fontsize=12,
            verticalalignment='top',
            fontfamily='monospace',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8)
        )
        
        # Collision flash markers
        self.collision_markers = []
        
        self.anim = None
    
    def _setup_axes(self) -> None:
        """Setup the matplotlib axes."""
        self.ax.set_xlim(-10, self.result.container_width + 10)
        self.ax.set_ylim(-10, self.result.container_height + 10)
        self.ax.set_aspect('equal')
        self.ax.set_facecolor('#f0f0f0')
        
        # Draw container
        container = Rectangle(
            (0, 0),
            self.result.container_width,
            self.result.container_height,
            linewidth=2,
            edgecolor='#333333',
            facecolor='white'
        )
        self.ax.add_patch(container)
        
        # Labels
        self.ax.set_title('Particle Collision Simulation Preview', fontsize=14, fontweight='bold')
        self.ax.set_xlabel('X (pixels)')
        self.ax.set_ylabel('Y (pixels)')
        
        # Grid
        self.ax.grid(True, alpha=0.3)
    
    def _create_artists(self) -> None:
        """Create matplotlib artists for each particle."""
        for particle in self.result.particles:
            color = self.no2_color if particle.particle_type == ParticleType.NO2 else self.n2o4_color
            
            # Main particle circle
            circle = Circle(
                (0, 0),
                self.particle_radius,
                color=color,
                alpha=0.8,
                visible=False
            )
            self.ax.add_patch(circle)
            self.particle_artists[particle.id] = {
                'circle': circle,
                'particle': particle,
                'type': particle.particle_type
            }
            
            # Trail (if enabled)
            if self.show_trails:
                trail_line, = self.ax.plot([], [], color=color, alpha=0.3, linewidth=1)
                self.trail_artists[particle.id] = {
                    'line': trail_line,
                    'positions': []
                }
    
    def _get_frame_time(self, frame: int) -> float:
        """Convert frame number to simulation time."""
        return frame / self.fps
    
    def _update_frame(self, frame: int) -> List:
        """Update function for animation."""
        current_time = self._get_frame_time(frame)
        
        # Update time display
        self.time_text.set_text(f't = {current_time:.2f}s / {self.result.animation_duration:.1f}s')
        
        artists = [self.time_text]
        
        # Check for collisions at this time (for visual effect)
        for collision in self.result.collisions:
            # Show flash near collision time
            if abs(current_time - collision.time) < 0.1:
                # Create a flash effect
                alpha = 1 - abs(current_time - collision.time) / 0.1
                flash = Circle(
                    (collision.x, collision.y),
                    self.particle_radius * 3,
                    color='yellow',
                    alpha=alpha * 0.5,
                    visible=True
                )
                self.ax.add_patch(flash)
                self.collision_markers.append(flash)
        
        # Clean up old collision markers
        for marker in self.collision_markers[:]:
            if marker.get_alpha() is not None and marker.get_alpha() < 0.05:
                marker.remove()
                self.collision_markers.remove(marker)
        
        # Update each particle
        for particle_id, artist_info in self.particle_artists.items():
            particle = artist_info['particle']
            circle = artist_info['circle']
            
            # Check if particle is active at this time
            if particle.is_active_at_time(current_time):
                pos = particle.get_position_at_time(current_time)
                if pos:
                    circle.center = pos
                    circle.set_visible(True)
                    
                    # Update trail if enabled
                    if self.show_trails and particle_id in self.trail_artists:
                        trail_info = self.trail_artists[particle_id]
                        trail_info['positions'].append(pos)
                        # Keep only last N positions
                        if len(trail_info['positions']) > 30:
                            trail_info['positions'] = trail_info['positions'][-30:]
                        
                        if trail_info['positions']:
                            xs, ys = zip(*trail_info['positions'])
                            trail_info['line'].set_data(xs, ys)
                else:
                    circle.set_visible(False)
            else:
                circle.set_visible(False)
                
                # Clear trail when particle disappears
                if self.show_trails and particle_id in self.trail_artists:
                    if not particle.is_active_at_time(current_time):
                        self.trail_artists[particle_id]['positions'] = []
                        self.trail_artists[particle_id]['line'].set_data([], [])
            
            artists.append(circle)
        
        return artists
    
    def _init_animation(self) -> List:
        """Initialize animation."""
        artists = [self.time_text]
        for artist_info in self.particle_artists.values():
            artist_info['circle'].set_visible(False)
            artists.append(artist_info['circle'])
        return artists
    
    def create_animation(self) -> animation.FuncAnimation:
        """Create and return the animation object."""
        self.anim = animation.FuncAnimation(
            self.fig,
            self._update_frame,
            init_func=self._init_animation,
            frames=self.total_frames,
            interval=1000 / self.fps,
            blit=False  # Set to False for better compatibility
        )
        return self.anim
    
    def show(self) -> None:
        """Display the animation."""
        self.create_animation()
        plt.tight_layout()
        plt.show()
    
    def save(self, filename: str, writer: str = 'pillow', dpi: int = 100) -> None:
        """
        Save the animation to a file.
        
        Args:
            filename: Output filename (e.g., 'animation.gif' or 'animation.mp4')
            writer: Animation writer to use ('pillow' for gif, 'ffmpeg' for mp4)
            dpi: Resolution in dots per inch
        """
        self.create_animation()
        print(f"Saving animation to {filename}...")
        self.anim.save(filename, writer=writer, dpi=dpi)
        print(f"Animation saved!")


def create_static_trajectory_plot(result: SimulationResult) -> plt.Figure:
    """
    Create a static plot showing all particle trajectories.
    
    Args:
        result: SimulationResult from the simulation
    
    Returns:
        matplotlib Figure object
    """
    fig, ax = plt.subplots(figsize=(10, 10))
    
    # Setup axes
    ax.set_xlim(-10, result.container_width + 10)
    ax.set_ylim(-10, result.container_height + 10)
    ax.set_aspect('equal')
    ax.set_facecolor('#f8f8f8')
    
    # Draw container
    container = Rectangle(
        (0, 0),
        result.container_width,
        result.container_height,
        linewidth=2,
        edgecolor='#333333',
        facecolor='white'
    )
    ax.add_patch(container)
    
    # Color maps for particles
    no2_cmap = plt.cm.Reds
    n2o4_cmap = plt.cm.Blues
    
    # Plot trajectories
    for i, particle in enumerate(result.particles):
        if not particle.keyframes:
            continue
        
        xs = [kf.x for kf in particle.keyframes]
        ys = [kf.y for kf in particle.keyframes]
        
        if particle.particle_type == ParticleType.NO2:
            color = no2_cmap(0.3 + 0.5 * (particle.id / result.collisions[-1].particle2_id if result.collisions else 1))
            label = f'NO2 #{particle.id}'
        else:
            color = n2o4_cmap(0.3 + 0.5 * ((particle.id - 15) / len(result.collisions) if result.collisions else 1))
            label = f'N2O4 #{particle.id}'
        
        # Plot trajectory line
        ax.plot(xs, ys, '-', color=color, alpha=0.6, linewidth=1.5, label=label if i < 10 else None)
        
        # Mark start position
        ax.plot(xs[0], ys[0], 'o', color=color, markersize=8)
        
        # Mark end position
        ax.plot(xs[-1], ys[-1], 's', color=color, markersize=6)
    
    # Mark collision points
    for collision in result.collisions:
        ax.plot(collision.x, collision.y, '*', color='gold', markersize=15, 
                markeredgecolor='orange', markeredgewidth=1, zorder=10)
        ax.annotate(f't={collision.time:.1f}s', 
                   (collision.x, collision.y), 
                   xytext=(5, 5), textcoords='offset points',
                   fontsize=8, color='orange')
    
    # Labels and title
    ax.set_title('Particle Trajectories (Full Simulation)', fontsize=14, fontweight='bold')
    ax.set_xlabel('X (pixels)')
    ax.set_ylabel('Y (pixels)')
    ax.grid(True, alpha=0.3)
    
    # Legend
    ax.legend(loc='upper left', fontsize=8, ncol=2)
    
    plt.tight_layout()
    return fig


def preview_from_config(result: SimulationResult) -> SimulationPreview:
    """
    Create a preview using config settings.
    
    Args:
        result: SimulationResult from the simulation
    
    Returns:
        SimulationPreview object
    """
    return SimulationPreview(
        result=result,
        fps=config.PREVIEW_FPS,
        no2_color=config.NO2_COLOR,
        n2o4_color=config.N2O4_COLOR,
        particle_radius=config.PARTICLE_RADIUS
    )


