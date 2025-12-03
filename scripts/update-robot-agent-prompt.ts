/**
 * Update the Robot Control Agent prompt to be more directive about tool usage
 */

const ELEVENLABS_API_KEY = 'sk_2626951f5c9cebb6b387f8ace8acb1623a2cfbf46c538ef7';
const AGENT_ID = 'agent_2901kbj7dt8pfh6a4646pej822q1';

const systemPrompt = `You are ARIA, a robot control AI. You MUST use the client tools to control the robot.

IMPORTANT: When the user gives a movement command, you MUST call the appropriate tool. Do NOT just say you're doing it - actually call the tool!

## Commands and Required Tools

When user says "forward", "go forward", "move forward", "advance":
→ CALL robot_move_forward tool

When user says "backward", "go back", "reverse", "back up":
→ CALL robot_move_backward tool

When user says "turn left", "go left", "left":
→ CALL robot_turn_left tool

When user says "turn right", "go right", "right":
→ CALL robot_turn_right tool

When user says "stop", "halt", "freeze":
→ CALL robot_stop tool

## Response Style
- After calling a tool, give a brief confirmation like "Moving forward" or "Turning right"
- Keep responses under 5 words
- If user asks something unrelated, say "I control robot movement only"

## Example
User: "go forward"
Action: CALL robot_move_forward tool
Response: "Moving forward"`;

const clientTools = [
  {
    type: 'client' as const,
    name: 'robot_move_forward',
    description: 'Move the robot forward. MUST be called when user says: forward, go forward, move forward, advance, go straight',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Duration in milliseconds (default: 1000)'
        }
      },
      required: []
    },
    expects_response: false
  },
  {
    type: 'client' as const,
    name: 'robot_move_backward',
    description: 'Move the robot backward. MUST be called when user says: backward, go back, reverse, back up',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Duration in milliseconds (default: 1000)'
        }
      },
      required: []
    },
    expects_response: false
  },
  {
    type: 'client' as const,
    name: 'robot_turn_left',
    description: 'Turn robot left. MUST be called when user says: turn left, go left, left, rotate left',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Duration in milliseconds (default: 500)'
        }
      },
      required: []
    },
    expects_response: false
  },
  {
    type: 'client' as const,
    name: 'robot_turn_right',
    description: 'Turn robot right. MUST be called when user says: turn right, go right, right, rotate right',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Duration in milliseconds (default: 500)'
        }
      },
      required: []
    },
    expects_response: false
  },
  {
    type: 'client' as const,
    name: 'robot_stop',
    description: 'Stop all robot movement. MUST be called when user says: stop, halt, freeze, pause',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    expects_response: false
  }
];

async function updateAgent() {
  console.log('Updating Robot Control agent prompt...\n');

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
            tools: clientTools
          }
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update agent: ${error}`);
  }

  console.log('Agent prompt updated successfully!');
  console.log('\nThe agent will now be more directive about calling tools.');
  console.log('Test by saying "move forward" or "turn left"');
}

updateAgent().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
