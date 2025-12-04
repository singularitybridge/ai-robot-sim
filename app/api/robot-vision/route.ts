import { NextRequest, NextResponse } from 'next/server';

interface RobotCommand {
  command: 'forward' | 'backward' | 'left' | 'right' | 'stop';
  param: number;
  thoughts: string;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiUrl = `${process.env.AGENT_HUB_API_URL}/assistant/robot-eyes/execute`;
    const apiKey = process.env.AGENT_HUB_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Agent Hub API not configured' }, { status: 500 });
    }

    const payload = {
      userInput: 'Analyze this image from my robot camera and tell me what to do next.',
      attachments: [
        {
          data: imageBase64,
          mimeType: 'image/png',
          fileName: 'robot-camera.png'
        }
      ]
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agent Hub API error:', errorText);
      return NextResponse.json({ error: `API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    // Extract text from response
    let text = '';
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: { type: string }) => c.type === 'text');
      if (textContent?.text?.value) {
        text = textContent.text.value;
      }
    } else if (typeof data.content === 'string') {
      text = data.content;
    }

    // Try to parse as JSON command
    try {
      const commandData: RobotCommand = JSON.parse(text);
      return NextResponse.json({
        command: commandData.command,
        param: commandData.param,
        thoughts: commandData.thoughts,
        raw: text
      });
    } catch {
      // If not valid JSON, return as plain text response
      return NextResponse.json({
        command: null,
        param: null,
        thoughts: text,
        raw: text
      });
    }
  } catch (error) {
    console.error('Robot vision error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
