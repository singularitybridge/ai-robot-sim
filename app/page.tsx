'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { RobotCommands } from '@/components/RobotScene';

// Dynamic imports to avoid SSR issues
const RobotScene = dynamic(() => import('@/components/RobotScene'), {
  ssr: false,
  loading: () => null,
});

const VoiceControl = dynamic(() => import('@/components/VoiceControl'), {
  ssr: false,
  loading: () => null,
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
  const [isLoading, setIsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'pending' | 'ready'>('pending');
  const [robotStatus, setRobotStatus] = useState<'pending' | 'ready'>('pending');
  const [cameraStatus, setCameraStatus] = useState<'pending' | 'ready'>('pending');
  const [robotResponse, setRobotResponse] = useState(
    'Robot systems online!<br><br><span style="color:#00ffff">Phase 1 Complete!</span><br>All systems operational ✓<br><br><span style="color:rgba(255,255,255,0.5)">Try the Quick Commands on the left panel!</span>'
  );
  const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [visionResponse, setVisionResponse] = useState<{
    command: string | null;
    param: number | null;
    thoughts: string;
  } | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  // Funny loading messages for the vision AI
  const funnyLoadingMessages = [
    "Adjusting my robot glasses...",
    "Squinting really hard at the pixels...",
    "Consulting my inner robot wisdom...",
    "Running advanced potato-vision algorithms...",
    "Asking my AI friends what they think...",
    "Downloading more RAM to see better...",
    "Cleaning my camera lens with binary soap...",
    "Activating maximum zoom and enhance mode...",
    "Buffering reality... please wait...",
    "Converting coffee to visual analysis..."
  ];

  // Auto-update LED color based on expression
  const expressionColors: Record<string, string> = {
    angry: '#ff4444',      // Red
    sad: '#4488ff',        // Blue
    happy: '#00ff88',      // Green
    love: '#ff66b2',       // Pink
    excited: '#ffdd00',    // Yellow
    thinking: '#aa66ff',   // Purple
    surprised: '#ff8800',  // Orange
    sleepy: '#6688aa',     // Dim blue
    confused: '#ff9944',   // Orange
    wink: '#ff88cc',       // Pink
    loading: '#00ffff',    // Cyan
    neutral: '#00ffff',    // Cyan
  };

  useEffect(() => {
    const color = expressionColors[expression] || '#00ffff';
    setFaceColor(color);
  }, [expression]);

  const robotRef = useRef<RobotCommands>(null);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Text-to-speech function using ElevenLabs
  const speak = useCallback(async (text: string) => {
    if (!text || isSpeaking) return;

    try {
      setIsSpeaking(true);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        console.error('TTS request failed');
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  // Simulate loading sequence like index.html
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setSystemStatus('ready');
    }, 500);

    const timer2 = setTimeout(() => {
      setRobotStatus('ready');
    }, 800);

    const timer3 = setTimeout(() => {
      setCameraStatus('ready');
      setIsLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number, newState: string) => {
    setSpeed(newSpeed);
    setRobotState(newState);
  }, []);

  const setRobotAction = useCallback((action: string, value: boolean) => {
    const robotActions = (window as unknown as { robotActions?: (action: string, value: boolean) => void }).robotActions;
    console.log('setRobotAction:', action, value, 'robotActions exists:', !!robotActions);
    if (robotActions) {
      robotActions(action, value);
    } else {
      console.warn('robotActions not available on window');
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

  // Voice command handler - executes movement for a duration then stops
  const handleVoiceCommand = useCallback((command: string, duration?: number) => {
    console.log('handleVoiceCommand called:', command, duration);
    // Clear any existing timeout
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      // Stop all actions first
      setRobotAction('forward', false);
      setRobotAction('backward', false);
      setRobotAction('turnLeft', false);
      setRobotAction('turnRight', false);
    }

    if (command === 'stop') {
      // Just stop everything
      setRobotAction('forward', false);
      setRobotAction('backward', false);
      setRobotAction('turnLeft', false);
      setRobotAction('turnRight', false);
      return;
    }

    // Start the action
    setRobotAction(command, true);

    // Stop after duration
    const stopDuration = duration || (command.includes('turn') ? 500 : 1000);
    commandTimeoutRef.current = setTimeout(() => {
      setRobotAction(command, false);
    }, stopDuration);
  }, [setRobotAction]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };
  }, []);

  // Handle "What do you see?" button click
  const handleWhatDoYouSee = useCallback(async () => {
    const canvas = document.getElementById('robot-pov-canvas') as HTMLCanvasElement;
    if (!canvas) {
      setVisionResponse({ command: null, param: null, thoughts: 'Error: Robot camera not available' });
      return;
    }

    setVisionLoading(true);
    setLoadingMessage(funnyLoadingMessages[Math.floor(Math.random() * funnyLoadingMessages.length)]);

    try {
      // Get base64 image from canvas
      const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

      const response = await fetch('/api/robot-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });

      const data = await response.json();

      if (data.error) {
        setVisionResponse({ command: null, param: null, thoughts: `Error: ${data.error}` });
      } else {
        const thoughts = data.thoughts || 'No response from vision AI';
        setVisionResponse({
          command: data.command,
          param: data.param,
          thoughts
        });

        // Speak the robot's thoughts
        if (thoughts) {
          speak(thoughts);
        }

        // Execute the robot command
        if (data.command && robotRef.current) {
          const duration = data.param ? data.param * 100 : 500; // Convert param to duration in ms
          switch (data.command) {
            case 'forward':
              await robotRef.current.moveForward(duration);
              break;
            case 'backward':
              await robotRef.current.moveBackward(duration);
              break;
            case 'left':
              await robotRef.current.turnLeft(duration);
              break;
            case 'right':
              await robotRef.current.turnRight(duration);
              break;
            case 'stop':
              robotRef.current.stop();
              break;
          }
        }
      }
    } catch (error) {
      console.error('Vision request failed:', error);
      setVisionResponse({ command: null, param: null, thoughts: 'Failed to analyze image. Please try again.' });
    } finally {
      setVisionLoading(false);
      setLoadingMessage(null);
    }
  }, [funnyLoadingMessages, speak]);

  return (
    <main className="w-screen h-screen bg-[#0a0a12] overflow-hidden font-[Inter,sans-serif]">
      {/* Loading Overlay */}
      <div className={`loading-overlay ${!isLoading ? 'hidden' : ''}`}>
        <div className="loading-spinner" />
        <div className="loading-text">Initializing Robot Systems...</div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[rgba(10,10,18,0.9)] backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3 font-semibold text-lg text-white">
          <div className="w-8 h-8 bg-gradient-to-br from-[#4a9eff] to-[#00d4ff] rounded-lg flex items-center justify-center text-lg">
            🤖
          </div>
          AI Robot Control
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className={`w-2 h-2 rounded-full ${systemStatus === 'ready' ? 'bg-[#22c55e] status-dot-online' : 'status-dot-warning'}`} />
            {systemStatus === 'ready' ? 'Scene Ready' : 'Scene Loading'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className={`w-2 h-2 rounded-full ${robotStatus === 'ready' ? 'bg-[#22c55e] status-dot-online' : 'status-dot-warning'}`} />
            {robotStatus === 'ready' ? 'Robot Ready' : 'Robot Pending'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className={`w-2 h-2 rounded-full ${cameraStatus === 'ready' ? 'bg-[#22c55e] status-dot-online' : 'status-dot-offline'}`} />
            {cameraStatus === 'ready' ? 'Camera Live' : 'Camera Pending'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className={`w-2 h-2 rounded-full ${voiceStatus === 'connected' ? 'bg-[#22c55e] status-dot-online' : voiceStatus === 'error' ? 'bg-[#ef4444]' : 'bg-white/30'}`} />
            {voiceStatus === 'connected' ? 'Voice Active' : voiceStatus === 'error' ? 'Voice Error' : 'Voice Ready'}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-screen pt-14">
        {/* Left Panel */}
        <aside className="w-[280px] bg-[rgba(20,20,30,0.8)] border-r border-white/10 p-5 flex flex-col gap-5">
          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">Voice Control</div>
              {voiceStatus === 'connected' && (
                <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
              )}
            </div>
            <VoiceControl
              onCommand={handleVoiceCommand}
              onStatusChange={setVoiceStatus}
            />
          </div>

          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Quick Commands</div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => robotRef.current?.doWave()}
                className="py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium text-left hover:bg-[rgba(74,158,255,0.25)] transition-all"
              >
                👋 Wave Hello
              </button>
              <button
                onClick={() => robotRef.current?.doSpin()}
                className="py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium text-left hover:bg-[rgba(74,158,255,0.25)] transition-all"
              >
                🔄 Spin Around
              </button>
              <button
                onClick={() => robotRef.current?.doTakePhoto()}
                className="py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium text-left hover:bg-[rgba(74,158,255,0.25)] transition-all"
              >
                📷 Take Photo
              </button>
              <button
                onClick={() => robotRef.current?.doSayHello()}
                className="py-2.5 px-4 rounded-lg bg-[rgba(74,158,255,0.15)] text-[#4a9eff] text-sm font-medium text-left hover:bg-[rgba(74,158,255,0.25)] transition-all"
              >
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
        <div className="flex-1 relative pb-[100px]">
          <RobotScene
            ref={robotRef}
            expression={expression}
            faceColor={faceColor}
            bodyColor={bodyColor}
            onSpeedChange={handleSpeedChange}
            onExpressionChange={setExpression}
            onResponseUpdate={setRobotResponse}
          />
        </div>

        {/* Right Panel */}
        <aside className="w-[320px] bg-[rgba(20,20,30,0.8)] border-l border-white/10 p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">Robot Camera</div>
              <button
                onClick={handleWhatDoYouSee}
                disabled={visionLoading}
                className="text-[10px] font-medium px-2 py-1 rounded bg-[rgba(74,158,255,0.2)] text-[#4a9eff] hover:bg-[rgba(74,158,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                {visionLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span>👁️</span>
                    What do you see?
                  </>
                )}
              </button>
            </div>
            <div className="bg-black rounded-xl overflow-hidden aspect-video relative border-2 border-[rgba(74,158,255,0.3)]">
              <span className="absolute top-2 left-2 text-[10px] font-semibold text-[#4a9eff] bg-black/60 px-2 py-1 rounded z-10">
                ROBOT POV
              </span>
              <span className="absolute top-2 right-2 text-[10px] font-semibold text-[#ef4444] bg-black/60 px-2 py-1 rounded z-10 animate-blink">
                ● REC
              </span>
              <canvas id="robot-pov-canvas" width={640} height={360} className="w-full h-full object-cover" />
            </div>
            {visionLoading && loadingMessage && (
              <div className="mt-3 text-xs leading-relaxed p-2 rounded-lg text-[#ffdd00] bg-[rgba(255,221,0,0.1)] italic">
                {loadingMessage}
              </div>
            )}
            {visionResponse && !visionLoading && (
              <div className="mt-3 text-xs leading-relaxed p-3 rounded-lg bg-[rgba(74,158,255,0.1)] border border-[rgba(74,158,255,0.2)]">
                {visionResponse.command && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded bg-[#4a9eff] text-white font-bold uppercase text-[10px]">
                      {visionResponse.command}
                    </span>
                    {visionResponse.param !== null && visionResponse.param !== 0 && (
                      <span className="px-2 py-1 rounded bg-[rgba(255,255,255,0.1)] text-white/80 font-mono text-[10px]">
                        {visionResponse.param}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-white/80 italic flex items-start gap-2">
                  {isSpeaking && (
                    <span className="text-[#4a9eff] animate-pulse flex-shrink-0">🔊</span>
                  )}
                  <span>&ldquo;{visionResponse.thoughts}&rdquo;</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Security Camera</div>
            <div className="bg-black rounded-xl overflow-hidden aspect-video relative border-2 border-[rgba(255,200,0,0.3)]">
              <span className="absolute top-2 left-2 text-[10px] font-semibold text-[#ffc800] bg-black/60 px-2 py-1 rounded z-10">
                CAM-01
              </span>
              <span className="absolute top-2 right-2 text-[10px] font-semibold text-[#ef4444] bg-black/60 px-2 py-1 rounded z-10 animate-blink">
                ● REC
              </span>
              <canvas id="security-cam-canvas" width={640} height={360} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="bg-[rgba(30,30,45,0.6)] rounded-xl p-4 flex-1 overflow-y-auto min-h-[100px]">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Robot Response</div>
            <div
              className="text-sm leading-relaxed text-white/80"
              dangerouslySetInnerHTML={{ __html: robotResponse }}
            />
          </div>
        </aside>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-[280px] right-[320px] h-[100px] bg-[rgba(20,20,30,0.95)] backdrop-blur-lg border-t border-white/10 flex items-center justify-center gap-4 px-4">
        {/* Movement Pad */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1">Move</div>
          <div className="grid grid-cols-3 gap-0.5">
            <div />
            <button
              {...setupButtonHold('forward')}
              className="w-7 h-7 border-none rounded bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-sm cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ↑
            </button>
            <div />
            <button
              {...setupButtonHold('turnLeft')}
              className="w-7 h-7 border-none rounded bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-sm cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ←
            </button>
            <div />
            <button
              {...setupButtonHold('turnRight')}
              className="w-7 h-7 border-none rounded bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-sm cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              →
            </button>
            <div />
            <button
              {...setupButtonHold('backward')}
              className="w-7 h-7 border-none rounded bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-sm cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ↓
            </button>
            <div />
          </div>
        </div>

        {/* Head Controls */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1">Head</div>
          <div className="flex gap-1">
            <button
              {...setupButtonHold('headLeft')}
              className="w-7 h-7 border-none rounded bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-sm cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ↺
            </button>
            <button
              {...setupButtonHold('headRight')}
              className="w-7 h-7 border-none rounded bg-[rgba(74,158,255,0.2)] text-[#4a9eff] text-sm cursor-pointer flex items-center justify-center hover:bg-[rgba(74,158,255,0.3)] active:bg-[rgba(74,158,255,0.5)] active:scale-95 transition-all"
            >
              ↻
            </button>
          </div>
        </div>

        <div className="w-px h-12 bg-white/10" />

        {/* Expression Buttons */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1">Expression</div>
          <div className="grid grid-cols-6 gap-1">
            {expressions.map((expr) => (
              <button
                key={expr.id}
                onClick={() => setExpression(expr.id)}
                title={expr.title}
                className={`w-7 h-7 border-none rounded text-sm cursor-pointer transition-all hover:bg-white/20 hover:-translate-y-0.5 ${
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

        <div className="w-px h-12 bg-white/10" />

        {/* LCD Color */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1">LCD</div>
          <div className="flex gap-1.5">
            {faceColors.map((color) => (
              <button
                key={color.id}
                onClick={() => setFaceColor(color.id)}
                style={{ backgroundColor: color.id }}
                className={`w-5 h-5 rounded-full cursor-pointer border-2 transition-all hover:scale-110 ${
                  faceColor === color.id
                    ? 'border-white shadow-[0_0_8px_currentColor]'
                    : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body Color */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1">Body</div>
          <div className="grid grid-cols-4 gap-1">
            {bodyColors.map((color) => (
              <button
                key={color.id}
                onClick={() => setBodyColor(color.id)}
                title={color.title}
                style={{ backgroundColor: color.id }}
                className={`w-5 h-5 rounded cursor-pointer border-2 transition-all hover:scale-110 ${
                  bodyColor === color.id
                    ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                    : 'border-white/20 hover:border-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="w-px h-12 bg-white/10" />

        {/* Speed Indicator */}
        <div className="flex flex-col items-center min-w-[80px]">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1">Speed</div>
          <div className="flex items-center gap-2">
            <div className="w-14 h-1.5 bg-white/10 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-100 ${
                  speed > 70 ? 'bg-gradient-to-r from-[#ffdd00] to-[#ff8844]' : 'bg-gradient-to-r from-[#00ff88] to-[#00d4ff]'
                }`}
                style={{ width: `${speed}%` }}
              />
            </div>
            <div className="text-xs font-semibold text-[#00d4ff] min-w-[32px] text-right">{Math.round(speed)}%</div>
          </div>
          <div className="mt-1">
            <span className={`text-[10px] font-medium ${
              robotState === 'Idle' ? 'text-[#00ff88]' :
              robotState.includes('Turn') ? 'text-[#ffdd00]' : 'text-[#00d4ff]'
            }`}>
              {robotState}
            </span>
          </div>
        </div>
      </div>

      {/* Phase Badge */}
      <div className="fixed bottom-[110px] right-[340px] bg-[rgba(34,197,94,0.2)] text-[#22c55e] text-[10px] font-semibold px-2 py-1 rounded-full">
        PHASE 2 ✓
      </div>
    </main>
  );
}
