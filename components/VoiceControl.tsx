'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceControlProps {
  onCommand: (command: string, duration?: number) => void;
  onStatusChange?: (status: string) => void;
}

export default function VoiceControl({ onCommand, onStatusChange }: VoiceControlProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to avoid stale closures in clientTools callbacks
  const onCommandRef = useRef(onCommand);
  const onStatusChangeRef = useRef(onStatusChange);

  // Keep refs updated
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  // ElevenLabs conversation with client tools for robot control
  const conversation = useConversation({
    clientTools: {
      robot_move_forward: async (parameters: { duration?: number }) => {
        console.log('Robot: move forward', parameters);
        onCommandRef.current('forward', parameters.duration || 1000);
        setLastCommand('Moving forward');
        clearCommandDisplay();
        return 'Moving forward';
      },
      robot_move_backward: async (parameters: { duration?: number }) => {
        console.log('Robot: move backward', parameters);
        onCommandRef.current('backward', parameters.duration || 1000);
        setLastCommand('Moving backward');
        clearCommandDisplay();
        return 'Moving backward';
      },
      robot_turn_left: async (parameters: { duration?: number }) => {
        console.log('Robot: turn left', parameters);
        onCommandRef.current('turnLeft', parameters.duration || 500);
        setLastCommand('Turning left');
        clearCommandDisplay();
        return 'Turning left';
      },
      robot_turn_right: async (parameters: { duration?: number }) => {
        console.log('Robot: turn right', parameters);
        onCommandRef.current('turnRight', parameters.duration || 500);
        setLastCommand('Turning right');
        clearCommandDisplay();
        return 'Turning right';
      },
      robot_stop: async () => {
        console.log('Robot: stop');
        onCommandRef.current('stop');
        setLastCommand('Stopping');
        clearCommandDisplay();
        return 'Stopped';
      },
    },
    onConnect: () => {
      setIsConnecting(false);
      onStatusChange?.('connected');
      console.log('Voice control connected');
    },
    onDisconnect: () => {
      setIsConnecting(false);
      onStatusChange?.('disconnected');
      console.log('Voice control disconnected');
    },
    onError: (error) => {
      console.error('Voice control error:', error);
      setIsConnecting(false);
      onStatusChange?.('error');
    },
    onMessage: (message) => {
      console.log('Voice message:', message);
    },
  });

  const clearCommandDisplay = () => {
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
    }
    commandTimeoutRef.current = setTimeout(() => {
      setLastCommand(null);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_ROBOT_AGENT_ID;

    if (!agentId) {
      console.error('ElevenLabs Robot Agent ID not configured');
      onStatusChange?.('error');
      return;
    }

    setIsConnecting(true);
    try {
      await conversation.startSession({
        agentId: agentId,
      });
    } catch (error) {
      console.error('Failed to start voice session:', error);
      setIsConnecting(false);
      onStatusChange?.('error');
    }
  }, [conversation, onStatusChange]);

  const stopListening = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isActive = conversation.status === 'connected';

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={isActive ? stopListening : startListening}
        disabled={isConnecting}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          isActive
            ? 'bg-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.3)]'
            : isConnecting
            ? 'bg-[rgba(74,158,255,0.1)] text-[#4a9eff]/50 cursor-wait'
            : 'bg-[rgba(74,158,255,0.15)] text-[#4a9eff] hover:bg-[rgba(74,158,255,0.25)]'
        }`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : isActive ? (
          <>
            <MicOff className="w-4 h-4" />
            Stop Listening
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Start Listening
          </>
        )}
      </button>

      {/* Status indicator */}
      {isActive && (
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
          <span className="text-xs text-[#22c55e]">ARIA Online</span>
        </div>
      )}

      {/* Last command feedback */}
      {lastCommand && (
        <div className="text-center">
          <span className="text-xs text-[#00d4ff] bg-[rgba(0,212,255,0.1)] px-3 py-1 rounded-full">
            {lastCommand}
          </span>
        </div>
      )}

      {!isActive && !isConnecting && (
        <p className="text-xs text-white/40 text-center">
          Say "move forward", "turn left", etc.
        </p>
      )}
    </div>
  );
}
