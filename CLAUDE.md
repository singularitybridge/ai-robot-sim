# AI Robot Simulator - Claude Code Instructions

## Project Overview
Interactive 3D robot simulation built with Next.js 15 and Three.js. Features a customizable robot with LCD face expressions, physics-based movement, collision detection, and robot POV camera.

## Process Management with PM2
This project uses PM2 for process orchestration.

**Checking if app is running:**
```bash
pm2 list
```

**Starting the app:**
```bash
pm2 start ai-robot-sim
```

**Restarting:**
```bash
pm2 restart ai-robot-sim
```

**Viewing logs:**
```bash
pm2 logs ai-robot-sim --lines 50
```

**Stopping:**
```bash
pm2 stop ai-robot-sim
```

**Port:** http://localhost:4091

## Tech Stack
- Next.js 15.1.0 with App Router
- React 19
- Three.js 0.170.0 for 3D rendering
- TypeScript
- Tailwind CSS
- Lucide React icons

## Key Features
- 12 facial expressions (neutral, happy, thinking, surprised, love, loading, sad, angry, wink, excited, sleepy, confused)
- LCD display with customizable colors (green, blue, red, yellow, purple)
- Body color customization (8 colors)
- Physics-based movement with acceleration/deceleration
- Collision detection (warehouse environment with shelves, boxes)
- Robot POV camera view
- Keyboard controls (WASD/Arrows for movement, Q/E for head rotation)
- Idle animations (breathing, subtle movements)
- Dust particles when moving

## Project Structure
```
/app
  /page.tsx          - Main page with full UI layout
  /layout.tsx        - Root layout
  /globals.css       - Global styles
/components
  /RobotScene.tsx    - Three.js 3D scene component (~1400 lines)
  /ControlPanel.tsx  - Legacy control panel (unused)
/public              - Static assets
```

## UI Layout
- **Header:** Logo, status indicators
- **Left Panel (280px):** Voice control, Quick commands, Keyboard help
- **Center:** 3D robot scene
- **Right Panel (320px):** Robot POV camera, Robot response
- **Bottom Bar (120px):** Movement pad, Head controls, Expressions, LCD color, Body color, Speed indicator

## Development Notes
- Three.js component uses dynamic import to avoid SSR issues
- Face expressions drawn on HTML canvas, rendered as Three.js texture
- Robot POV uses WebGLRenderTarget for off-screen rendering
- Movement physics: acceleration, friction, collision response
- Idle animations run continuously for lifelike appearance

## Important Files
- `ecosystem.config.js` - PM2 configuration
- `components/RobotScene.tsx` - All 3D logic and robot rendering
- `app/page.tsx` - UI layout and state management
