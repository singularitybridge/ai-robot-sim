# AI Robot Simulator

Interactive 3D robot simulation with customizable expressions, colors, and physics-based movement.

## Features

- 12 facial expressions on LCD display
- Customizable LCD and body colors
- Physics-based movement with collision detection
- Robot POV camera view
- Keyboard and button controls
- Warehouse environment with obstacles

## Quick Start

```bash
# Install dependencies
npm install

# Start with PM2 (recommended)
pm2 start ecosystem.config.js

# Or start directly
npm run dev
```

**URL:** http://localhost:4091

## Controls

| Key | Action |
|-----|--------|
| W / Arrow Up | Move Forward |
| S / Arrow Down | Move Backward |
| A / Arrow Left | Turn Left |
| D / Arrow Right | Turn Right |
| Q | Rotate Head Left |
| E | Rotate Head Right |

## Tech Stack

- Next.js 15.1.0
- React 19
- Three.js 0.170.0
- TypeScript
- Tailwind CSS

## PM2 Commands

```bash
pm2 start ai-robot-sim    # Start
pm2 stop ai-robot-sim     # Stop
pm2 restart ai-robot-sim  # Restart
pm2 logs ai-robot-sim     # View logs
pm2 list                  # List all processes
```

## Project Structure

```
ai-robot-sim/
├── app/
│   ├── page.tsx         # Main UI
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Styles
├── components/
│   └── RobotScene.tsx   # 3D scene
├── ecosystem.config.js  # PM2 config
└── package.json
```

## License

MIT
