'use client';

import { useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, RotateCw } from 'lucide-react';

interface ControlPanelProps {
  expression: string;
  setExpression: (expr: string) => void;
  faceColor: string;
  setFaceColor: (color: string) => void;
  bodyColor: string;
  setBodyColor: (color: string) => void;
  speed: number;
  robotState: string;
}

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
  { id: '#00ff88', className: 'bg-[#00ff88]' },
  { id: '#00d4ff', className: 'bg-[#00d4ff]' },
  { id: '#ff4444', className: 'bg-[#ff4444]' },
  { id: '#ffdd00', className: 'bg-[#ffdd00]' },
  { id: '#aa44ff', className: 'bg-[#aa44ff]' },
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

export default function ControlPanel({
  expression,
  setExpression,
  faceColor,
  setFaceColor,
  bodyColor,
  setBodyColor,
  speed,
  robotState,
}: ControlPanelProps) {
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
    <div className="flex flex-col gap-4 p-4 bg-black/50 backdrop-blur-md rounded-2xl text-white">
      {/* Movement Controls */}
      <div>
        <div className="text-xs text-gray-400 text-center mb-2 font-medium">Movement</div>
        <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
          <div />
          <button
            {...setupButtonHold('forward')}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 active:bg-blue-500/50 rounded-xl flex items-center justify-center transition-all"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <div />
          <button
            {...setupButtonHold('turnLeft')}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 active:bg-blue-500/50 rounded-xl flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            {...setupButtonHold('backward')}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 active:bg-blue-500/50 rounded-xl flex items-center justify-center transition-all"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          <button
            {...setupButtonHold('turnRight')}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 active:bg-blue-500/50 rounded-xl flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Head Controls */}
      <div>
        <div className="text-xs text-gray-400 text-center mb-2 font-medium">Head</div>
        <div className="flex gap-2 justify-center">
          <button
            {...setupButtonHold('headLeft')}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 active:bg-blue-500/50 rounded-xl flex items-center justify-center transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            {...setupButtonHold('headRight')}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 active:bg-blue-500/50 rounded-xl flex items-center justify-center transition-all"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expressions */}
      <div>
        <div className="text-xs text-gray-400 text-center mb-2 font-medium">Expression</div>
        <div className="grid grid-cols-6 gap-1.5">
          {expressions.map((expr) => (
            <button
              key={expr.id}
              onClick={() => setExpression(expr.id)}
              title={expr.title}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                expression === expr.id
                  ? 'bg-blue-500/40 shadow-[0_0_12px_rgba(74,158,255,0.4)]'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {expr.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* LCD Color */}
      <div>
        <div className="text-xs text-gray-400 text-center mb-2 font-medium">LCD Color</div>
        <div className="flex gap-2 justify-center">
          {faceColors.map((color) => (
            <button
              key={color.id}
              onClick={() => setFaceColor(color.id)}
              className={`w-8 h-8 rounded-full transition-all ${color.className} ${
                faceColor === color.id
                  ? 'ring-2 ring-white shadow-[0_0_12px_currentColor]'
                  : 'ring-2 ring-transparent hover:scale-110'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Body Color */}
      <div>
        <div className="text-xs text-gray-400 text-center mb-2 font-medium">Body Color</div>
        <div className="grid grid-cols-4 gap-1.5">
          {bodyColors.map((color) => (
            <button
              key={color.id}
              onClick={() => setBodyColor(color.id)}
              title={color.title}
              style={{ backgroundColor: color.id }}
              className={`w-8 h-8 rounded-lg transition-all ${
                bodyColor === color.id
                  ? 'ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.5)]'
                  : 'ring-2 ring-white/20 hover:scale-110 hover:ring-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Speed Indicator */}
      <div>
        <div className="text-xs text-gray-400 text-center mb-2 font-medium">Speed</div>
        <div className="bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              speed > 70 ? 'bg-orange-500' : 'bg-cyan-400'
            }`}
            style={{ width: `${speed}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{Math.round(speed)}%</span>
          <span className={`text-xs ${
            robotState === 'Idle' ? 'text-gray-400' : 'text-cyan-400'
          }`}>
            {robotState}
          </span>
        </div>
      </div>

      {/* Keyboard Help */}
      <div className="text-[10px] text-gray-500 text-center leading-relaxed">
        WASD/Arrows: Move | Q/E: Head
      </div>
    </div>
  );
}
