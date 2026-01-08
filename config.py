"""
Configuration parameters for particle collision simulation.
All values are adjustable to customize the simulation output.
"""

# Container dimensions (pixels)
CONTAINER_WIDTH = 300
CONTAINER_HEIGHT = 300

# Particle settings
NUM_PARTICLES = 15  # Total number of NO2 particles at start
NUM_COLLISIONS = 6  # Number of collisions (each collision uses 2 NO2 particles)

# Animation settings
ANIMATION_DURATION = 8.0  # Total animation duration in seconds
PARTICLE_SPEED = 80.0  # Pixels per second (constant for all particles)

# Random seed for reproducibility (set to None for random results each run)
RANDOM_SEED = 42

# Collision point margin from walls (pixels)
# Ensures collision points aren't too close to container edges
COLLISION_MARGIN = 20

# Output settings
OUTPUT_CSV_PATH = "particle_keyframes.csv"

# Preview settings
PREVIEW_FPS = 30  # Frames per second for animation preview
NO2_COLOR = "#E74C3C"  # Red for NO2 particles
N2O4_COLOR = "#3498DB"  # Blue for N2O4 particles
PARTICLE_RADIUS = 6  # Visual radius for preview (not used in collision detection)


