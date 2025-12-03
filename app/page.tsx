'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Three.js
const RobotScene = dynamic(() => import('@/components/RobotScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
      <div className="text-white text-lg">Loading 3D Scene...</div>
    </div>
  ),
});

const expressions = [
  { id: 'neutral', emoji: '😐', title: 'Neutral' },
  { id: 'happy', emoji: '😊', title: 'Happy' },
  { id: 'thinking', emoji: '🤔', title: 'Thinking' },
  { id: 'surprised', emoji: '😮', title: 'Surprised' },
  { id: 'love', emoji: '😍', title: 'Love' },
  { id: 'loading', emoji: '⏳', title: 'Loading' },
  { id: 'sad', emoji: '😢', title: 'Sad' },
  { id: 'angry', emoji: '😠', title: 'Angry' },
  { id: 'wink', emoji: '😉', title: 'Wink' },
  { id: 'excited', emoji: '🤩', title: 'Excited' },
  { id: 'sleepy', emoji: '😴', title: 'Sleepy' },
  { id: 'confused', emoji: '😕', title: 'Confused' },
];

const faceColors = [
  { id: '#00ffff', name: 'cyan' },
  { id: '#00ff88', name: 'green' },
  { id: '#00d4ff', name: 'blue' },
  { id: '#ff4444', name: 'red' },
  { id: '#ffdd00', name: 'yellow' },
  { id: '#aa44ff', name: 'purple' },
];

const bodyColors = [
  { id: '#fafaf5', title: 'White' },
  { id: '#2a2a2a', title: 'Black' },
  { id: '#e63946', title: 'Red' },
  { id: '#457b9d', title: 'Blue' },
  { id: '#2d6a4f', title: 'Green' },
  { id: '#f4a261', title: 'Orange' },
  { id: '#9d4edd', title: 'Purple' },
  { id: '#ffd700', title: 'Gold' },
];

export default function Home() {
  const [expression, setExpression] = useState('neutral');
  const [faceColor, setFaceColor] = useState('#00ffff');
  const [bodyColor, setBodyColor] = useState('#fafaf5');
  const [speed, setSpeed] = useState(0);
  const [robotState, setRobotState] = useState('Idle');

  const handleSpeedChange = useCallback((newSpeed: number, newState: string) => {
    setSpeed(newSpeed);
    setRobotState(newState);
  }, []);

  const setRobotAction = useCallback((action: string, value: boolean) => {
    const robotActions = (window as unknown as { robotActions?: (action: string, value: boolean) => void }).robotActions;
    if (robotActions) {
      robotActions(action, value);
    }
  }, []);

  const setupButtonHold = useCallback((action: string) => {
    return {
      onMouseDown: () => setRobotAction(action, true),
      onMouseUp: () => setRobotAction(action, false),
      onMouseLeave: () => setRobotAction(action, false),
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        setRobotAction(action, true);
      },
      onTouchEnd: () => setRobotAction(action, false),
    };
  }, [setRobotAction]);

  return (
    <main className="w-screen h-screen bg-[#0a0a12] overflow-hidden font-[Inter,sans-serif]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[rgba(10,10,18,0.9)] backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3 font-semibold text-lg text-white">
          <div className="w-8 h-8 bg-gradient-to-br from-[#4a9eff] to-[#00d4ff] rounded-lg flex items-center justify-center text-lg">
            🤖
          </div>
          AI Robot Simulation
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
            System Online
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
            Motors Active
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-screen pt-14">
        {/* Left Panel */}
        <aside className="w-[280px] bg-[rgba(20,20,30,0.8)] border-r border-white/10 p-5 flex flex-col gap-5">
          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Voice Control</div>
            <button className="w-full py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium hover:bg-[rgba(74,158,255,0.25)] transition-all">
              🎤 Start Listening
            </button>
            <p className="text-xs text-white/40 mt-2 text-center">Coming in Phase 2</p>
          </div>

          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Quick Commands</div>
            <div className="flex flex-col gap-2">
              <button className="py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium text-left hover:bg-[rgba(74,158,255,0.25)] transition-all">
                👋 Wave Hello
              </button>
              <button className="py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium text-left hover:bg-[rgba(74,158,255,0.25)] transition-all">
                🔄 Spin Around
              </button>
              <button className="py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium text-left hover:bg-[rgba(74,158,255,0.25)] transition-all">
                📷 Take Photo
              </button>
              <button className="py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium text-left hover:bg-[rgba(74,158,255,0.25)] transition-all">
                💬 Say Hello
              </button>
            </div>
          </div>

          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4 mt-auto">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Keyboard Controls</div>
            <div className="text-xs text-white/50 leading-7">
              <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded">W</kbd> Forward</div>
              <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded">S</kbd> Backward</div>
              <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded">A</kbd> Turn Left</div>
              <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded">D</kbd> Turn Right</div>
              <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded">Q</kbd> Head Left</div>
              <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded">E</kbd> Head Right</div>
            </div>
          </div>
        </aside>

        {/* 3D Scene */}
        <div className="flex-1 relative pb-[120px]">
          <RobotScene
            expression={expression}
            faceColor={faceColor}
            bodyColor={bodyColor}
            onSpeedChange={handleSpeedChange}
          />
        </div>

        {/* Right Panel */}
        <aside className="w-[320px] bg-[rgba(20,20,30,0.8)] border-l border-white/10 p-5 flex flex-col gap-5">
          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Robot Camera</div>
            <div className="bg-black rounded-xl overflow-hidden aspect-video relative border-2 border-[rgba(74,158,255,0.3)]">
              <span className="absolute top-2 left-2 text-[10px] font-semibold text-[#4a9eff] bg-black/60 px-2 py-1 rounded z-10">
                ROBOT POV
              </span>
              <span className="absolute top-2 right-2 text-[10px] font-semibold text-[#ef4444] bg-black/60 px-2 py-1 rounded z-10 animate-pulse">
                ● REC
              </span>
              <canvas id="robot-pov-canvas" width={640} height={360} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4 flex-1 overflow-y-auto">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Robot Response</div>
            <div className="text-sm leading-relaxed text-white/80">
              Robot systems online!<br /><br />
              <span className="text-[#00ffff]">Phase 1 Complete!</span><br />
              All systems operational ✓<br /><br />
              <span className="text-white/50">Try the Quick Commands on the left panel!</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-[280px] right-[320px] h-[120px] bg-[rgba(20,20,30,0.95)] backdrop-blur-lg border-t border-white/10 flex items-center justify-center gap-10 px-10">
        {/* Movement Pad */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/50 text-center mb-2">Movement</div>
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              {...setupButtonHold('forward')}
              className="w-12 h-12 border-none rounded-lg bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-xl cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ↑
            </button>
            <div />
            <button
              {...setupButtonHold('turnLeft')}
              className="w-12 h-12 border-none rounded-lg bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-xl cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ←
            </button>
            <div />
            <button
              {...setupButtonHold('turnRight')}
              className="w-12 h-12 border-none rounded-lg bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-xl cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              →
            </button>
            <div />
            <button
              {...setupButtonHold('backward')}
              className="w-12 h-12 border-none rounded-lg bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-xl cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ↓
            </button>
            <div />
          </div>
        </div>

        {/* Head Controls */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/50 text-center mb-2">Head</div>
          <div className="flex gap-2">
            <button
              {...setupButtonHold('headLeft')}
              className="w-12 h-12 border-none rounded-lg bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-xl cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ↺
            </button>
            <button
              {...setupButtonHold('headRight')}
              className="w-12 h-12 border-none rounded-lg bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-xl cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Expression Buttons */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/50 text-center mb-2">Expression</div>
          <div className="grid grid-cols-6 gap-1.5">
            {expressions.map((expr) => (
              <button
                key={expr.id}
                onClick={() => setExpression(expr.id)}
                title={expr.title}
                className={`w-10 h-10 border-none rounded-lg text-xl cursor-pointer transition-all hover:bg-white/20 hover:-translate-y-0.5 ${
                  expression === expr.id
                    ? 'bg-[rgba(74,158,255,0.3)] shadow-[0_0_12px_rgba(74,158,255,0.4)]'
                    : 'bg-white/10'
                }`}
              >
                {expr.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* LCD Color */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/50 text-center mb-2">LCD Color</div>
          <div className="flex gap-2">
            {faceColors.map((color) => (
              <button
                key={color.id}
                onClick={() => setFaceColor(color.id)}
                style={{ backgroundColor: color.id }}
                className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-all hover:scale-110 ${
                  faceColor === color.id
                    ? 'border-white shadow-[0_0_12px_currentColor]'
                    : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body Color */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/50 text-center mb-2">Body Color</div>
          <div className="grid grid-cols-4 gap-1.5">
            {bodyColors.map((color) => (
              <button
                key={color.id}
                onClick={() => setBodyColor(color.id)}
                title={color.title}
                style={{ backgroundColor: color.id }}
                className={`w-8 h-8 rounded-lg cursor-pointer border-2 transition-all hover:scale-110 ${
                  bodyColor === color.id
                    ? 'border-white shadow-[0_0_12px_rgba(255,255,255,0.5)]'
                    : 'border-white/20 hover:border-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Speed Indicator */}
        <div className="min-w-[100px]">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/50 text-center mb-2">Speed</div>
          <div className="flex items-center gap-2.5">
            <div className="w-20 h-2 bg-white/10 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-100 ${
                  speed > 70 ? 'bg-gradient-to-r from-[#ffdd00] to-[#ff8844]' : 'bg-gradient-to-r from-[#00ff88] to-[#00d4ff]'
                }`}
                style={{ width: `${speed}%` }}
              />
            </div>
            <div className="text-sm font-semibold text-[#00d4ff] min-w-[36px] text-right">{Math.round(speed)}%</div>
          </div>
          <div className="mt-2">
            <div className="flex gap-1.5 text-[11px]">
              <span className="text-white/50">State:</span>
              <span className={`font-medium ${
                robotState === 'Idle' ? 'text-[#00ff88]' :
                robotState.includes('Turn') ? 'text-[#ffdd00]' : 'text-[#00d4ff]'
              }`}>
                {robotState}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Badge */}
      <div className="fixed bottom-[140px] right-[340px] bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-xs font-semibold px-3 py-1.5 rounded-full">
        PHASE 1: Visual Polish ✓
      </div>
    </main>
  );
}
