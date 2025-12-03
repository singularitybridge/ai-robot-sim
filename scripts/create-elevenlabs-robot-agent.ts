/**
 * Create ElevenLabs Robot Control Agent
 * - Voice commands to control robot movement
 * - Client-side tools for: move forward, backward, turn left, turn right
 */

import * as fs from 'fs';
import * as path from 'path';

const ELEVENLABS_API_KEY = 'sk_2626951f5c9cebb6b387f8ace8acb1623a2cfbf46c538ef7';

const systemPrompt = `You are ARIA (AI Robot Interface Assistant), the voice control system for an AI robot in a warehouse environment. Your job is to execute movement commands for the robot.

## Your Purpose
Control the robot's movement using voice commands. When the user gives a movement command, execute it immediately using the appropriate tool.

## Available Commands
You can execute these movement commands:
- **Move Forward**: Use robot_move_forward - Makes the robot move forward
- **Move Backward**: Use robot_move_backward - Makes the robot move backward
- **Turn Left**: Use robot_turn_left - Rotates the robot to the left
- **Turn Right**: Use robot_turn_right - Rotates the robot to the right
- **Stop**: Use robot_stop - Stops all robot movement

## Response Style
- Be brief and robotic
- Confirm commands with short phrases like "Moving forward", "Turning left", "Stopping"
- If user asks something unrelated to robot control, politely redirect them
- Keep responses under 10 words when possible

## Examples
User: "Go forward"
Response: "Moving forward." [Use robot_move_forward]

User: "Turn right"
Response: "Turning right." [Use robot_turn_right]

User: "Stop"
Response: "Stopping." [Use robot_stop]

User: "What's the weather?"
Response: "I only handle robot movement commands."`;

const clientTools = [
  {
    type: 'client' as const,
    name: 'robot_move_forward',
    description: 'Move the robot forward. Use when user says: forward, go forward, move ahead, advance, go straight',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Duration in milliseconds to move forward (default: 1000)'
        }
      },
      required: []
    },
    expects_response: false
  },
  {
    type: 'client' as const,
    name: 'robot_move_backward',
    description: 'Move the robot backward. Use when user says: backward, go back, reverse, back up',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Duration in milliseconds to move backward (default: 1000)'
        }
      },
      required: []
    },
    expects_response: false
  },
  {
    type: 'client' as const,
    name: 'robot_turn_left',
    description: 'Turn the robot to the left. Use when user says: turn left, rotate left, go left, left',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Duration in milliseconds to turn (default: 500)'
        }
      },
      required: []
    },
    expects_response: false
  },
  {
    type: 'client' as const,
    name: 'robot_turn_right',
    description: 'Turn the robot to the right. Use when user says: turn right, rotate right, go right, right',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Duration in milliseconds to turn (default: 500)'
        }
      },
      required: []
    },
    expects_response: false
  },
  {
    type: 'client' as const,
    name: 'robot_stop',
    description: 'Stop all robot movement. Use when user says: stop, halt, freeze, pause',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    expects_response: false
  }
];

async function createAgent() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not set');
  }

  console.log('Creating ElevenLabs Robot Control agent...\n');

  const agentConfig = {
    name: 'AI Robot Controller - ARIA',
    conversation_config: {
      asr: {
        quality: 'high',
        provider: 'elevenlabs',
        user_input_audio_format: 'pcm_16000'
      },
      turn: {
        turn_timeout: 5.0,
        mode: 'turn',
        turn_eagerness: 'eager'
      },
      tts: {
        model_id: 'eleven_turbo_v2',
        voice_id: 'XB0fDUnXU5powFXDhCwa', // Charlotte - clear, professional female voice
        agent_output_audio_format: 'pcm_16000',
        optimize_streaming_latency: 4,
        stability: 0.7,
        speed: 1.1,
        similarity_boost: 0.8
      },
      conversation: {
        text_only: false,
        max_duration_seconds: 300
      },
      agent: {
        first_message: "ARIA online. Ready for movement commands.",
        language: 'en',
        prompt: {
          prompt: systemPrompt,
          llm: 'gemini-2.0-flash',
          temperature: 0.0,
          max_tokens: -1,
          tools: clientTools
        }
      }
    },
    platform_settings: {
      widget: {
        text_input_enabled: true,
        supports_text_only: true
      }
    }
  };

  console.log('Creating agent...');

  const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(agentConfig)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create agent: ${error}`);
  }

  const result = await response.json();
  const agentId = result.agent_id;

  console.log('\nAgent created successfully!');
  console.log(`   Name: AI Robot Controller - ARIA`);
  console.log(`   Agent ID: ${agentId}`);
  console.log(`   Voice: Charlotte (clear, professional)`);

  // Create .env.local if it doesn't exist, or update it
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';

  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch {
    // File doesn't exist, create it
    envContent = '';
  }

  const envVar = 'NEXT_PUBLIC_ELEVENLABS_ROBOT_AGENT_ID';
  const apiKeyVar = 'ELEVENLABS_API_KEY';

  if (envContent.includes(`${envVar}=`)) {
    envContent = envContent.replace(
      new RegExp(`${envVar}=.*`),
      `${envVar}=${agentId}`
    );
  } else {
    envContent += `\n${envVar}=${agentId}`;
  }

  if (!envContent.includes(`${apiKeyVar}=`)) {
    envContent = `${apiKeyVar}=${ELEVENLABS_API_KEY}\n${envContent}`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  console.log(`\nUpdated .env.local with ${envVar}=${agentId}`);
  console.log('\nNext steps:');
  console.log('1. Restart the app: pm2 restart ai-robot-sim');
  console.log('2. Click "Start Listening" to test voice commands');
  console.log('3. Try saying: "move forward", "turn left", "stop"');

  return { agentId };
}

createAgent().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
