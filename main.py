"""
Main entry point for the particle collision pre-calculator.
Runs the simulation and generates outputs for Rive animation.
"""

import argparse
import sys

import config
from simulation import Simulation, run_simulation_from_config
from export import export_to_csv, print_keyframes_preview
from preview import SimulationPreview, create_static_trajectory_plot, preview_from_config


def main():
    """Main function to run the particle simulation."""
    parser = argparse.ArgumentParser(
        description='Pre-calculate particle trajectories with evenly-spaced collisions for Rive animation.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                    # Run with default config settings
  python main.py --preview          # Run and show animated preview
  python main.py --static           # Show static trajectory plot
  python main.py -p 15 -c 6 -d 8    # 15 particles, 6 collisions, 8s duration
  python main.py --save-gif out.gif # Save animation as GIF
        """
    )
    
    # Simulation parameters
    parser.add_argument('-p', '--particles', type=int, default=None,
                        help=f'Number of NO2 particles (default: {config.NUM_PARTICLES})')
    parser.add_argument('-c', '--collisions', type=int, default=None,
                        help=f'Number of collisions (default: {config.NUM_COLLISIONS})')
    parser.add_argument('-d', '--duration', type=float, default=None,
                        help=f'Animation duration in seconds (default: {config.ANIMATION_DURATION})')
    parser.add_argument('-s', '--speed', type=float, default=None,
                        help=f'Particle speed in px/sec (default: {config.PARTICLE_SPEED})')
    parser.add_argument('-W', '--width', type=float, default=None,
                        help=f'Container width in px (default: {config.CONTAINER_WIDTH})')
    parser.add_argument('-H', '--height', type=float, default=None,
                        help=f'Container height in px (default: {config.CONTAINER_HEIGHT})')
    parser.add_argument('--seed', type=int, default=None,
                        help=f'Random seed for reproducibility (default: {config.RANDOM_SEED})')
    
    # Output options
    parser.add_argument('-o', '--output', type=str, default=None,
                        help=f'Output CSV path (default: {config.OUTPUT_CSV_PATH})')
    parser.add_argument('--preview', action='store_true',
                        help='Show animated preview')
    parser.add_argument('--static', action='store_true',
                        help='Show static trajectory plot')
    parser.add_argument('--save-gif', type=str, metavar='FILE',
                        help='Save animation as GIF')
    parser.add_argument('--no-csv', action='store_true',
                        help='Skip CSV export')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Print detailed keyframe preview')
    
    args = parser.parse_args()
    
    # Build simulation parameters
    sim_params = {
        'container_width': args.width or config.CONTAINER_WIDTH,
        'container_height': args.height or config.CONTAINER_HEIGHT,
        'num_particles': args.particles or config.NUM_PARTICLES,
        'num_collisions': args.collisions or config.NUM_COLLISIONS,
        'particle_speed': args.speed or config.PARTICLE_SPEED,
        'animation_duration': args.duration or config.ANIMATION_DURATION,
        'collision_margin': config.COLLISION_MARGIN,
        'random_seed': args.seed if args.seed is not None else config.RANDOM_SEED
    }
    
    # Validate parameters
    if sim_params['num_collisions'] * 2 > sim_params['num_particles']:
        print(f"Error: Cannot have {sim_params['num_collisions']} collisions with only "
              f"{sim_params['num_particles']} particles. Need at least "
              f"{sim_params['num_collisions'] * 2} particles.")
        sys.exit(1)
    
    # Print configuration
    print("=" * 60)
    print("PARTICLE COLLISION PRE-CALCULATOR")
    print("=" * 60)
    print(f"\nConfiguration:")
    print(f"  Container:    {sim_params['container_width']} x {sim_params['container_height']} px")
    print(f"  Particles:    {sim_params['num_particles']} NO2")
    print(f"  Collisions:   {sim_params['num_collisions']} (creates {sim_params['num_collisions']} N2O4)")
    print(f"  Duration:     {sim_params['animation_duration']}s")
    print(f"  Speed:        {sim_params['particle_speed']} px/s")
    print(f"  Random seed:  {sim_params['random_seed']}")
    
    # Run simulation
    print(f"\nRunning simulation...")
    sim = Simulation(**sim_params)
    result = sim.run()
    
    # Print summary
    print(f"\nSimulation complete!")
    print(f"  Total particles: {len(result.particles)}")
    print(f"    - NO2: {len(result.get_no2_particles())}")
    print(f"    - N2O4: {len(result.get_n2o4_particles())}")
    print(f"  Total collisions: {len(result.collisions)}")
    
    # Print collision times
    print(f"\nCollision schedule:")
    for collision in result.collisions:
        print(f"  t={collision.time:.2f}s: NO2 #{collision.particle1_id} + NO2 #{collision.particle2_id} "
              f"-> N2O4 #{collision.result_particle_id} at ({collision.x:.1f}, {collision.y:.1f})")
    
    # Export CSV
    if not args.no_csv:
        output_path = args.output or config.OUTPUT_CSV_PATH
        print(f"\nExporting data...")
        export_to_csv(
            result,
            keyframes_path=output_path,
            collisions_path='collisions.csv',
            summary_path='particle_summary.csv'
        )
    
    # Print verbose preview
    if args.verbose:
        print_keyframes_preview(result, max_particles=5)
    
    # Show static plot
    if args.static:
        print("\nGenerating static trajectory plot...")
        fig = create_static_trajectory_plot(result)
        import matplotlib.pyplot as plt
        plt.show()
    
    # Save GIF
    if args.save_gif:
        print(f"\nGenerating animation GIF: {args.save_gif}")
        preview = preview_from_config(result)
        preview.save(args.save_gif, writer='pillow', dpi=100)
    
    # Show animated preview
    if args.preview:
        print("\nStarting animated preview...")
        print("  (Close the window to exit)")
        preview = preview_from_config(result)
        preview.show()
    
    print("\nDone!")
    return result


if __name__ == '__main__':
    main()

