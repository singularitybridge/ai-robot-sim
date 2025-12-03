'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface RobotCommands {
  doWave: () => Promise<void>;
  doSpin: () => Promise<void>;
  doTakePhoto: () => Promise<void>;
  doSayHello: () => Promise<void>;
  showTextOnFace: (text: string, duration?: number) => void;
}

interface RobotSceneProps {
  expression: string;
  faceColor: string;
  bodyColor: string;
  onSpeedChange?: (speed: number, state: string) => void;
  onExpressionChange?: (expression: string) => void;
  onResponseUpdate?: (html: string) => void;
}

// Physics parameters
const PHYSICS = {
  maxSpeed: 2.2,
  acceleration: 4.0,
  deceleration: 5.0,
  friction: 3.0,
  maxTurnSpeed: 2.2,
  turnAccel: 6.0,
  turnFriction: 8.0,
  headTurnSpeed: 2.5,
  headFriction: 6.0,
  headMaxRotation: 1.2,
  tiltAmount: 0.08,
  leanAmount: 0.06,
  tiltSmoothing: 8.0,
  leanSmoothing: 10.0,
  suspensionStiffness: 80.0,
  suspensionDamping: 8.0,
  bumpForce: 0.015,
  wheelRadius: 0.3
};

const ROBOT_RADIUS = 0.5;
const COLLISION_PADDING = 0.1;

const RobotScene = forwardRef<RobotCommands, RobotSceneProps>(function RobotScene({ expression, faceColor, bodyColor, onSpeedChange, onExpressionChange, onResponseUpdate }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    robot: THREE.Group;
    body: THREE.Mesh;
    headGroup: THREE.Group;
    neck: THREE.Mesh;
    neckRing: THREE.Mesh;
    leftWheel: THREE.Group;
    rightWheel: THREE.Group;
    whiteMat: THREE.MeshStandardMaterial;
    lightGrayMat: THREE.MeshStandardMaterial;
    faceTexture: THREE.CanvasTexture;
    faceCanvas: HTMLCanvasElement;
    faceCtx: CanvasRenderingContext2D;
    lcdGlowLight: THREE.PointLight;
    lcdAmbientGlow: THREE.PointLight;
    cameraLed: THREE.Mesh;
    robotCamera: THREE.PerspectiveCamera;
    robotCameraRT: THREE.WebGLRenderTarget;
    securityCamera: THREE.PerspectiveCamera;
    securityCameraRT: THREE.WebGLRenderTarget;
    secCamMount: THREE.Group;
    collidableObjects: Array<{mesh?: THREE.Mesh; type: string; radius?: number; x?: number; z?: number}>;
    dustParticles: Array<{mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; maxLife: number}>;
    chargingRing?: THREE.Mesh;
  } | null>(null);

  const robotStateRef = useRef({
    x: 0,
    z: 0,
    rotation: 0,
    velocity: 0,
    angularVelocity: 0,
    headRotY: 0,
    headAngularVel: 0,
    wheelRotation: 0,
    bodyTilt: 0,
    bodyLean: 0,
    suspensionOffset: 0,
    suspensionVelocity: 0
  });

  const actionsRef = useRef({
    forward: false,
    backward: false,
    turnLeft: false,
    turnRight: false,
    headLeft: false,
    headRight: false
  });

  const idleStateRef = useRef({
    headLookTarget: 0,
    headLookCurrent: 0,
    nextLookTime: 3000,
    breathPhase: 0,
    attentionPhase: 0,
    isLooking: false
  });

  const expressionRef = useRef(expression);
  const faceColorRef = useRef(faceColor);
  const bodyColorRef = useRef(bodyColor);
  const displayTextRef = useRef<string | null>(null);
  const displayTextTimeoutRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  // Update refs when props change
  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    faceColorRef.current = faceColor;
    if (sceneRef.current) {
      const glowColor = new THREE.Color(faceColor);
      sceneRef.current.lcdGlowLight.color.copy(glowColor);
      sceneRef.current.lcdAmbientGlow.color.copy(glowColor);
    }
  }, [faceColor]);

  useEffect(() => {
    bodyColorRef.current = bodyColor;
    if (sceneRef.current) {
      const mainColor = new THREE.Color(bodyColor);
      const accentColor = mainColor.clone().multiplyScalar(0.92);
      sceneRef.current.whiteMat.color.copy(mainColor);
      sceneRef.current.lightGrayMat.color.copy(accentColor);

      const luminance = mainColor.r * 0.299 + mainColor.g * 0.587 + mainColor.b * 0.114;
      if (luminance < 0.3) {
        sceneRef.current.whiteMat.roughness = 0.45;
        sceneRef.current.lightGrayMat.roughness = 0.55;
      } else {
        sceneRef.current.whiteMat.roughness = 0.35;
        sceneRef.current.lightGrayMat.roughness = 0.45;
      }
    }
  }, [bodyColor]);

  // Show text on face
  const showTextOnFace = useCallback((text: string, duration = 3000) => {
    displayTextRef.current = text;
    if (displayTextTimeoutRef.current) {
      clearTimeout(displayTextTimeoutRef.current);
    }
    if (duration > 0) {
      displayTextTimeoutRef.current = window.setTimeout(() => {
        displayTextRef.current = null;
      }, duration);
    }
  }, []);

  // Wave animation
  const doWave = useCallback(async () => {
    if (isAnimatingRef.current || !sceneRef.current) return;
    isAnimatingRef.current = true;

    onExpressionChange?.('happy');
    expressionRef.current = 'happy';
    showTextOnFace('Hello!', 2500);
    onResponseUpdate?.('👋 <span style="color:#00ffff">Waving hello!</span><br><br>The robot greets you with enthusiasm!');

    // Head wave animation
    const state = robotStateRef.current;
    const originalHeadRot = state.headRotY;
    const waveSteps = [0.4, -0.4, 0.3, -0.3, 0.2, -0.2, 0];

    for (const rot of waveSteps) {
      state.headRotY = rot;
      await new Promise(r => setTimeout(r, 150));
    }

    state.headRotY = originalHeadRot;
    await new Promise(r => setTimeout(r, 500));
    onExpressionChange?.('neutral');
    expressionRef.current = 'neutral';
    isAnimatingRef.current = false;
  }, [onExpressionChange, onResponseUpdate, showTextOnFace]);

  // Spin animation
  const doSpin = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    onExpressionChange?.('surprised');
    expressionRef.current = 'surprised';
    showTextOnFace('Wheee!', 2000);
    onResponseUpdate?.('🔄 <span style="color:#00ffff">Spinning around!</span><br><br>Watch me go! This is fun!');

    const state = robotStateRef.current;
    const startRot = state.rotation;
    const spinDuration = 1500;
    const startTime = Date.now();

    await new Promise<void>(resolve => {
      const spinLoop = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < spinDuration) {
          const progress = elapsed / spinDuration;
          const easeOut = 1 - Math.pow(1 - progress, 3);
          state.rotation = startRot + easeOut * Math.PI * 2;
          state.wheelRotation += 0.2;
          requestAnimationFrame(spinLoop);
        } else {
          state.rotation = startRot + Math.PI * 2;
          resolve();
        }
      };
      spinLoop();
    });

    onExpressionChange?.('happy');
    expressionRef.current = 'happy';
    await new Promise(r => setTimeout(r, 500));
    onExpressionChange?.('neutral');
    expressionRef.current = 'neutral';
    isAnimatingRef.current = false;
  }, [onExpressionChange, onResponseUpdate, showTextOnFace]);

  // Take photo animation
  const doTakePhoto = useCallback(async () => {
    if (isAnimatingRef.current || !sceneRef.current) return;
    isAnimatingRef.current = true;

    onExpressionChange?.('neutral');
    expressionRef.current = 'neutral';
    showTextOnFace('📸', 500);
    onResponseUpdate?.('📷 <span style="color:#00ffff">Photo captured!</span><br><br>Image saved from robot camera. Ready for AI analysis!');

    // Flash effect on POV canvas
    const povCanvas = document.getElementById('robot-pov-canvas') as HTMLCanvasElement;
    if (povCanvas) {
      const povCtx = povCanvas.getContext('2d');
      if (povCtx) {
        povCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        povCtx.fillRect(0, 0, 640, 360);
      }
    }

    await new Promise(r => setTimeout(r, 100));

    // Camera LED flash
    const { cameraLed } = sceneRef.current;
    const ledMat = cameraLed.material as THREE.MeshBasicMaterial;
    ledMat.color.setHex(0xffffff);
    await new Promise(r => setTimeout(r, 200));
    ledMat.color.setHex(0x00ff00);

    showTextOnFace('Saved!', 1500);
    onExpressionChange?.('happy');
    expressionRef.current = 'happy';

    await new Promise(r => setTimeout(r, 1500));
    onExpressionChange?.('neutral');
    expressionRef.current = 'neutral';
    isAnimatingRef.current = false;
  }, [onExpressionChange, onResponseUpdate, showTextOnFace]);

  // Say hello animation
  const doSayHello = useCallback(async () => {
    if (isAnimatingRef.current || !sceneRef.current) return;
    isAnimatingRef.current = true;

    const greetings = [
      'Hi there!',
      'Hello friend!',
      'Hey!',
      'Greetings!',
      'Nice to meet you!'
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    onExpressionChange?.('happy');
    expressionRef.current = 'happy';
    showTextOnFace(greeting, 3000);
    onResponseUpdate?.(`💬 <span style="color:#00ffff">"${greeting}"</span><br><br>The robot speaks! Voice synthesis coming in Phase 2.`);

    // Subtle head nod
    const { headGroup } = sceneRef.current;
    const originalY = headGroup.position.y;
    for (let i = 0; i < 3; i++) {
      headGroup.position.y = originalY - 0.05;
      await new Promise(r => setTimeout(r, 100));
      headGroup.position.y = originalY + 0.02;
      await new Promise(r => setTimeout(r, 100));
    }
    headGroup.position.y = originalY;

    await new Promise(r => setTimeout(r, 2000));
    onExpressionChange?.('neutral');
    expressionRef.current = 'neutral';
    isAnimatingRef.current = false;
  }, [onExpressionChange, onResponseUpdate, showTextOnFace]);

  // Expose commands via ref
  useImperativeHandle(ref, () => ({
    doWave,
    doSpin,
    doTakePhoto,
    doSayHello,
    showTextOnFace
  }), [doWave, doSpin, doTakePhoto, doSayHello, showTextOnFace]);

  // Helper function to create rounded box
  const createRoundedBox = useCallback((width: number, height: number, depth: number, radius: number, segments: number) => {
    const shape = new THREE.Shape();
    const w = width / 2 - radius;
    const h = height / 2 - radius;

    shape.moveTo(-w, -height / 2);
    shape.lineTo(w, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
    shape.lineTo(width / 2, h);
    shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
    shape.lineTo(-w, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
    shape.lineTo(-width / 2, -h);
    shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: radius,
      bevelSize: radius,
      bevelSegments: segments
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    return geometry;
  }, []);

  // Draw face on canvas - matching reference index.html
  const drawFace = useCallback((time: number) => {
    if (!sceneRef.current) return;
    const { faceCtx, faceCanvas, faceTexture } = sceneRef.current;
    const currentExpression = expressionRef.current;
    const currentFaceColor = faceColorRef.current;
    const displayText = displayTextRef.current;

    const w = faceCanvas.width;
    const h = faceCanvas.height;

    // Dark LCD background
    faceCtx.fillStyle = '#0a0a1a';
    faceCtx.fillRect(0, 0, w, h);

    // Glow settings - matching reference
    faceCtx.shadowColor = currentFaceColor;
    faceCtx.shadowBlur = 20;
    faceCtx.fillStyle = currentFaceColor;
    faceCtx.strokeStyle = currentFaceColor;
    faceCtx.lineWidth = 3;
    faceCtx.lineCap = 'round';

    if (displayText) {
      faceCtx.font = 'bold 28px Inter, sans-serif';
      faceCtx.textAlign = 'center';
      faceCtx.textBaseline = 'middle';

      const words = displayText.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (faceCtx.measureText(testLine).width > w - 40) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      lines.push(currentLine);

      const lineHeight = 32;
      const startY = h / 2 - (lines.length - 1) * lineHeight / 2;

      lines.forEach((line, i) => {
        faceCtx.fillText(line, w / 2, startY + i * lineHeight);
      });

      faceTexture.needsUpdate = true;
      return;
    }

    // Values matching reference (256x160 canvas)
    const eyeY = h * 0.42;
    const eyeSpacing = w * 0.22;
    const eyeWidth = 35;
    const eyeHeight = 45;

    const blinkCycle = Math.sin(time * 0.003);
    const blinkScale = blinkCycle > 0.95 ? 0.1 : 1;

    if (currentExpression === 'neutral') {
      // Oval eyes
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
      faceCtx.fill();
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 + eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
      faceCtx.fill();
      // Small smile
      faceCtx.beginPath();
      faceCtx.arc(w / 2, h * 0.72, 25, 0.1 * Math.PI, 0.9 * Math.PI, false);
      faceCtx.stroke();
    } else if (currentExpression === 'happy') {
      // Happy curved eyes
      faceCtx.lineWidth = 8;
      faceCtx.beginPath();
      faceCtx.arc(w / 2 - eyeSpacing, eyeY + 10, 28, Math.PI, 2 * Math.PI);
      faceCtx.stroke();
      faceCtx.beginPath();
      faceCtx.arc(w / 2 + eyeSpacing, eyeY + 10, 28, Math.PI, 2 * Math.PI);
      faceCtx.stroke();
      // Big smile
      faceCtx.lineWidth = 4;
      faceCtx.beginPath();
      faceCtx.arc(w / 2, h * 0.68, 35, 0.15 * Math.PI, 0.85 * Math.PI);
      faceCtx.stroke();
    } else if (currentExpression === 'thinking') {
      // One eye normal, one raised
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
      faceCtx.fill();
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 + eyeSpacing, eyeY - 8, eyeWidth * 0.9, eyeHeight * 0.7, -0.2, 0, Math.PI * 2);
      faceCtx.fill();
      // Wavy mouth
      faceCtx.beginPath();
      faceCtx.moveTo(w / 2 - 25, h * 0.72);
      faceCtx.quadraticCurveTo(w / 2, h * 0.68, w / 2 + 25, h * 0.72);
      faceCtx.stroke();
    } else if (currentExpression === 'surprised') {
      // Big round eyes
      faceCtx.beginPath();
      faceCtx.arc(w / 2 - eyeSpacing, eyeY, 32, 0, Math.PI * 2);
      faceCtx.fill();
      faceCtx.beginPath();
      faceCtx.arc(w / 2 + eyeSpacing, eyeY, 32, 0, Math.PI * 2);
      faceCtx.fill();
      // O mouth
      faceCtx.lineWidth = 4;
      faceCtx.beginPath();
      faceCtx.arc(w / 2, h * 0.72, 18, 0, Math.PI * 2);
      faceCtx.stroke();
    } else if (currentExpression === 'love') {
      // Heart eyes
      const drawHeart = (cx: number, cy: number, size: number) => {
        faceCtx.beginPath();
        faceCtx.moveTo(cx, cy + size * 0.3);
        faceCtx.bezierCurveTo(cx, cy, cx - size, cy, cx - size, cy + size * 0.5);
        faceCtx.bezierCurveTo(cx - size, cy + size, cx, cy + size * 1.2, cx, cy + size * 1.5);
        faceCtx.bezierCurveTo(cx, cy + size * 1.2, cx + size, cy + size, cx + size, cy + size * 0.5);
        faceCtx.bezierCurveTo(cx + size, cy, cx, cy, cx, cy + size * 0.3);
        faceCtx.fill();
      };
      drawHeart(w / 2 - eyeSpacing, eyeY - 25, 22);
      drawHeart(w / 2 + eyeSpacing, eyeY - 25, 22);
      // Smile
      faceCtx.beginPath();
      faceCtx.arc(w / 2, h * 0.7, 30, 0.1 * Math.PI, 0.9 * Math.PI);
      faceCtx.stroke();
    } else if (currentExpression === 'loading') {
      // Spinning dots
      const dotCount = 8;
      const radius = 35;
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2 + time * 0.005;
        const x = w / 2 + Math.cos(angle) * radius;
        const y = h / 2 + Math.sin(angle) * radius;
        const alpha = ((i / dotCount) + (time * 0.002)) % 1;
        faceCtx.globalAlpha = alpha;
        faceCtx.beginPath();
        faceCtx.arc(x, y, 8, 0, Math.PI * 2);
        faceCtx.fill();
      }
      faceCtx.globalAlpha = 1;
    } else if (currentExpression === 'sad') {
      // Droopy eyes
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 - eyeSpacing, eyeY + 8, eyeWidth * 0.9, eyeHeight * 0.6 * blinkScale, 0.2, 0, Math.PI * 2);
      faceCtx.fill();
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 + eyeSpacing, eyeY + 8, eyeWidth * 0.9, eyeHeight * 0.6 * blinkScale, -0.2, 0, Math.PI * 2);
      faceCtx.fill();
      // Frown
      faceCtx.lineWidth = 4;
      faceCtx.beginPath();
      faceCtx.arc(w / 2, h * 0.82, 25, 1.1 * Math.PI, 1.9 * Math.PI);
      faceCtx.stroke();
    } else if (currentExpression === 'angry') {
      // Angry slanted eyes
      faceCtx.save();
      faceCtx.translate(w / 2 - eyeSpacing, eyeY);
      faceCtx.rotate(-0.3);
      faceCtx.fillRect(-eyeWidth, -eyeHeight * 0.3 * blinkScale, eyeWidth * 2, eyeHeight * 0.6 * blinkScale);
      faceCtx.restore();
      faceCtx.save();
      faceCtx.translate(w / 2 + eyeSpacing, eyeY);
      faceCtx.rotate(0.3);
      faceCtx.fillRect(-eyeWidth, -eyeHeight * 0.3 * blinkScale, eyeWidth * 2, eyeHeight * 0.6 * blinkScale);
      faceCtx.restore();
      // Angry mouth
      faceCtx.lineWidth = 5;
      faceCtx.beginPath();
      faceCtx.moveTo(w / 2 - 30, h * 0.72);
      faceCtx.lineTo(w / 2 + 30, h * 0.72);
      faceCtx.stroke();
    } else if (currentExpression === 'wink') {
      // One eye open, one closed (winking)
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
      faceCtx.fill();
      // Closed winking eye
      faceCtx.lineWidth = 6;
      faceCtx.beginPath();
      faceCtx.arc(w / 2 + eyeSpacing, eyeY, 25, 0, Math.PI);
      faceCtx.stroke();
      // Cheeky smile
      faceCtx.lineWidth = 4;
      faceCtx.beginPath();
      faceCtx.arc(w / 2 + 10, h * 0.70, 30, 0.1 * Math.PI, 0.9 * Math.PI);
      faceCtx.stroke();
    } else if (currentExpression === 'excited') {
      // Big sparkly eyes with stars
      faceCtx.beginPath();
      faceCtx.arc(w / 2 - eyeSpacing, eyeY, 30, 0, Math.PI * 2);
      faceCtx.fill();
      faceCtx.beginPath();
      faceCtx.arc(w / 2 + eyeSpacing, eyeY, 30, 0, Math.PI * 2);
      faceCtx.fill();
      // Star highlights in eyes
      faceCtx.fillStyle = '#000';
      const drawStar = (cx: number, cy: number, size: number) => {
        faceCtx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * size;
          const y = cy + Math.sin(angle) * size;
          if (i === 0) faceCtx.moveTo(x, y);
          else faceCtx.lineTo(x, y);
          const midAngle = angle + Math.PI / 4;
          const mx = cx + Math.cos(midAngle) * size * 0.4;
          const my = cy + Math.sin(midAngle) * size * 0.4;
          faceCtx.lineTo(mx, my);
        }
        faceCtx.closePath();
        faceCtx.fill();
      };
      drawStar(w / 2 - eyeSpacing - 8, eyeY - 8, 8);
      drawStar(w / 2 + eyeSpacing - 8, eyeY - 8, 8);
      faceCtx.fillStyle = currentFaceColor;
      // Wide smile
      faceCtx.lineWidth = 4;
      faceCtx.beginPath();
      faceCtx.arc(w / 2, h * 0.68, 35, 0.1 * Math.PI, 0.9 * Math.PI);
      faceCtx.stroke();
      // Teeth suggestion
      faceCtx.beginPath();
      faceCtx.moveTo(w / 2 - 20, h * 0.72);
      faceCtx.lineTo(w / 2 + 20, h * 0.72);
      faceCtx.stroke();
    } else if (currentExpression === 'sleepy') {
      // Half-closed droopy eyes
      faceCtx.lineWidth = 6;
      faceCtx.beginPath();
      faceCtx.arc(w / 2 - eyeSpacing, eyeY + 5, 25, 0.3 * Math.PI, 0.7 * Math.PI);
      faceCtx.stroke();
      faceCtx.beginPath();
      faceCtx.arc(w / 2 + eyeSpacing, eyeY + 5, 25, 0.3 * Math.PI, 0.7 * Math.PI);
      faceCtx.stroke();
      // Sleepy yawn mouth
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2, h * 0.73, 15, 20, 0, 0, Math.PI * 2);
      faceCtx.stroke();
      // Zzz
      faceCtx.font = 'bold 18px Inter, sans-serif';
      faceCtx.fillText('z', w * 0.75, h * 0.35);
      faceCtx.font = 'bold 14px Inter, sans-serif';
      faceCtx.fillText('z', w * 0.80, h * 0.28);
      faceCtx.font = 'bold 10px Inter, sans-serif';
      faceCtx.fillText('z', w * 0.84, h * 0.22);
    } else if (currentExpression === 'confused') {
      // Asymmetric confused eyes
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
      faceCtx.fill();
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 + eyeSpacing, eyeY - 5, eyeWidth * 0.8, eyeHeight * 0.7 * blinkScale, 0, 0, Math.PI * 2);
      faceCtx.fill();
      // Question mark eyebrow
      faceCtx.font = 'bold 24px Inter, sans-serif';
      faceCtx.fillText('?', w / 2 + eyeSpacing + 15, eyeY - 25);
      // Wavy confused mouth
      faceCtx.lineWidth = 4;
      faceCtx.beginPath();
      faceCtx.moveTo(w / 2 - 30, h * 0.72);
      faceCtx.quadraticCurveTo(w / 2 - 10, h * 0.68, w / 2, h * 0.72);
      faceCtx.quadraticCurveTo(w / 2 + 10, h * 0.76, w / 2 + 30, h * 0.72);
      faceCtx.stroke();
    }

    faceTexture.needsUpdate = true;
  }, []);

  // Collision detection
  const checkWallCollision = useCallback((newX: number, newZ: number) => {
    const r = ROBOT_RADIUS + COLLISION_PADDING;
    const minX = -9 + r;
    const maxX = 9 - r;
    const minZ = -9 + r;
    const maxZ = 10;

    return {
      x: Math.max(minX, Math.min(maxX, newX)),
      z: Math.max(minZ, Math.min(maxZ, newZ))
    };
  }, []);

  const checkObjectCollision = useCallback((newX: number, newZ: number) => {
    if (!sceneRef.current) return { x: newX, z: newZ, collision: false };

    const robotR = ROBOT_RADIUS + COLLISION_PADDING;
    let resultX = newX;
    let resultZ = newZ;
    let collision = false;

    for (const obj of sceneRef.current.collidableObjects) {
      if (obj.type === 'wall') continue;

      const objX = obj.x !== undefined ? obj.x : (obj.mesh ? obj.mesh.position.x : 0);
      const objZ = obj.z !== undefined ? obj.z : (obj.mesh ? obj.mesh.position.z : 0);
      const objR = obj.radius || 0.5;

      const dx = newX - objX;
      const dz = newZ - objZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const minDist = robotR + objR;

      if (distance < minDist && distance > 0.001) {
        collision = true;
        const pushDist = minDist - distance;
        const normalX = dx / distance;
        const normalZ = dz / distance;
        resultX += normalX * pushDist;
        resultZ += normalZ * pushDist;
      }
    }

    return { x: resultX, z: resultZ, collision };
  }, []);

  const resolveCollisions = useCallback((newX: number, newZ: number) => {
    const objResult = checkObjectCollision(newX, newZ);
    const wallResult = checkWallCollision(objResult.x, objResult.z);
    const wallCollision = wallResult.x !== objResult.x || wallResult.z !== objResult.z;

    return {
      x: wallResult.x,
      z: wallResult.z,
      collision: objResult.collision || wallCollision
    };
  }, [checkObjectCollision, checkWallCollision]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const povCanvas = document.getElementById('robot-pov-canvas') as HTMLCanvasElement;
    const povCtx = povCanvas?.getContext('2d');

    // Scene setup - brighter background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a3a);
    scene.fog = new THREE.Fog(0x2a2a3a, 15, 50);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5, 4, 8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 1, 0);

    // Lighting - brighter overall
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Hemisphere light for sky/ground ambient - brighter
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 12, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-6, 8, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xccddff, 0.4);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);

    // Accent lights for visual interest - slightly brighter
    const blueLight = new THREE.PointLight(0x6699ff, 0.4, 15);
    blueLight.position.set(-4, 3, -2);
    scene.add(blueLight);

    const warmLight = new THREE.PointLight(0xffaa66, 0.3, 15);
    warmLight.position.set(4, 2, 4);
    scene.add(warmLight);

    // Collidable objects array
    const collidableObjects: Array<{mesh?: THREE.Mesh; type: string; radius?: number; x?: number; z?: number}> = [];

    // Environment Materials - brighter colors
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x5a5a65,
      roughness: 0.6,
      metalness: 0.1
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x555566,
      roughness: 0.8,
      metalness: 0.0
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.3,
      metalness: 0.8
    });

    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
      metalness: 0.0
    });

    const plasticWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.4,
      metalness: 0.0
    });

    const plasticBlueMat = new THREE.MeshStandardMaterial({
      color: 0x4488cc,
      roughness: 0.4,
      metalness: 0.0
    });

    const plasticOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      roughness: 0.4,
      metalness: 0.0
    });

    // Floor
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor grid lines (warehouse marking)
    const gridHelper = new THREE.GridHelper(20, 20, 0x4a9eff, 0x333344);
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Safety floor markings - yellow zone around robot start
    const createFloorStripe = (x: number, z: number, width: number, depth: number, color: number) => {
      const geo = new THREE.PlaneGeometry(width, depth);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
      const stripe = new THREE.Mesh(geo, mat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.01, z);
      return stripe;
    };

    // Yellow safety zone around robot start position
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      scene.add(createFloorStripe(
        Math.cos(angle) * 1.5,
        Math.sin(angle) * 1.5,
        0.1, 0.8, 0xffaa00
      ));
    }

    // Walls
    const wallGeo = new THREE.BoxGeometry(20, 4, 0.3);
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 2, -10);
    backWall.receiveShadow = true;
    scene.add(backWall);
    collidableObjects.push({ mesh: backWall, type: 'wall' });

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-10, 2, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    collidableObjects.push({ mesh: leftWall, type: 'wall' });

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = Math.PI / 2;
    rightWall.position.set(10, 2, 0);
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    collidableObjects.push({ mesh: rightWall, type: 'wall' });

    // Shelving units - proper rack structure
    const shelfFrameMat = new THREE.MeshStandardMaterial({
      color: 0x888899,
      roughness: 0.4,
      metalness: 0.7
    });

    const shelfPlateMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.5,
      metalness: 0.3
    });

    const createShelf = (x: number, z: number) => {
      const shelfGroup = new THREE.Group();

      // Vertical posts (4 corners)
      const postGeo = new THREE.BoxGeometry(0.08, 2.5, 0.08);
      const postPositions = [
        [-0.9, 1.25, -0.25],
        [-0.9, 1.25, 0.25],
        [0.9, 1.25, -0.25],
        [0.9, 1.25, 0.25]
      ];

      postPositions.forEach(([px, py, pz]) => {
        const post = new THREE.Mesh(postGeo, shelfFrameMat);
        post.position.set(px, py, pz);
        post.castShadow = true;
        post.receiveShadow = true;
        shelfGroup.add(post);
      });

      // Horizontal shelf plates (3 levels)
      for (let i = 0; i < 3; i++) {
        const shelfPlateGeo = new THREE.BoxGeometry(1.85, 0.04, 0.55);
        const shelfPlate = new THREE.Mesh(shelfPlateGeo, shelfPlateMat);
        shelfPlate.position.y = 0.3 + i * 0.85;
        shelfPlate.castShadow = true;
        shelfPlate.receiveShadow = true;
        shelfGroup.add(shelfPlate);

        // Add colorful items on each shelf
        const numItems = 2 + Math.floor(Math.random() * 2);
        for (let j = 0; j < numItems; j++) {
          const itemWidth = 0.2 + Math.random() * 0.25;
          const itemHeight = 0.15 + Math.random() * 0.2;
          const itemDepth = 0.15 + Math.random() * 0.15;
          const itemGeo = new THREE.BoxGeometry(itemWidth, itemHeight, itemDepth);
          const itemMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.6, 0.55),
            roughness: 0.4
          });
          const item = new THREE.Mesh(itemGeo, itemMat);
          item.position.set(
            -0.6 + j * 0.5 + Math.random() * 0.2,
            0.3 + i * 0.85 + itemHeight / 2 + 0.02,
            (Math.random() - 0.5) * 0.2
          );
          item.castShadow = true;
          shelfGroup.add(item);
        }
      }

      // Cross braces on the back for stability look
      const braceGeo = new THREE.BoxGeometry(0.03, 0.03, 0.55);
      for (let i = 0; i < 2; i++) {
        const brace = new THREE.Mesh(braceGeo, shelfFrameMat);
        brace.position.set(i === 0 ? -0.9 : 0.9, 1.25, 0);
        brace.rotation.x = Math.PI / 4;
        shelfGroup.add(brace);
      }

      shelfGroup.position.set(x, 0, z);
      scene.add(shelfGroup);
      return shelfGroup;
    };

    const shelf1 = createShelf(-6, -8);
    collidableObjects.push({ mesh: shelf1.children[0] as THREE.Mesh, type: 'shelf', radius: 1.2, x: -6, z: -8 });
    const shelf2 = createShelf(-2, -8);
    collidableObjects.push({ mesh: shelf2.children[0] as THREE.Mesh, type: 'shelf', radius: 1.2, x: -2, z: -8 });
    const shelf3 = createShelf(2, -8);
    collidableObjects.push({ mesh: shelf3.children[0] as THREE.Mesh, type: 'shelf', radius: 1.2, x: 2, z: -8 });
    const shelf4 = createShelf(6, -8);
    collidableObjects.push({ mesh: shelf4.children[0] as THREE.Mesh, type: 'shelf', radius: 1.2, x: 6, z: -8 });

    // Work station
    const workStation = new THREE.Group();
    const tableGeo = new THREE.BoxGeometry(2, 0.1, 1);
    const table = new THREE.Mesh(tableGeo, plasticWhiteMat);
    table.position.y = 0.8;
    table.castShadow = true;
    workStation.add(table);

    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const positions = [[-0.9, 0.4, -0.4], [-0.9, 0.4, 0.4], [0.9, 0.4, -0.4], [0.9, 0.4, 0.4]];
    positions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(x, y, z);
      workStation.add(leg);
    });

    const monitorGeo = new THREE.BoxGeometry(0.8, 0.5, 0.05);
    const monitor = new THREE.Mesh(monitorGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
    monitor.position.set(0, 1.3, -0.2);
    workStation.add(monitor);

    const monitorScreenGeo = new THREE.PlaneGeometry(0.7, 0.4);
    const monitorScreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 });
    const monitorScreen = new THREE.Mesh(monitorScreenGeo, monitorScreenMat);
    monitorScreen.position.set(0, 1.3, -0.17);
    workStation.add(monitorScreen);

    workStation.position.set(-7, 0, -3);
    scene.add(workStation);
    collidableObjects.push({ mesh: table, type: 'table', radius: 1.3, x: -7, z: -3 });

    // Crates
    const crate1Geo = new THREE.BoxGeometry(1, 1, 1);
    const crate1 = new THREE.Mesh(crate1Geo, crateMat);
    crate1.position.set(7, 0.5, -6);
    crate1.castShadow = true;
    scene.add(crate1);
    collidableObjects.push({ mesh: crate1, type: 'box', radius: 0.6, x: 7, z: -6 });

    const crate2 = new THREE.Mesh(crate1Geo, crateMat);
    crate2.position.set(7.8, 0.5, -6);
    crate2.castShadow = true;
    scene.add(crate2);
    collidableObjects.push({ mesh: crate2, type: 'box', radius: 0.6, x: 7.8, z: -6 });

    // Yellow security box with camera
    const securityBoxMat = new THREE.MeshStandardMaterial({
      color: 0xffc800,
      roughness: 0.4,
      metalness: 0.1
    });
    const securityBoxGeo = new THREE.BoxGeometry(1.2, 1.5, 1.2);
    const securityBox = new THREE.Mesh(securityBoxGeo, securityBoxMat);
    securityBox.position.set(7, 0.75, 4);
    securityBox.castShadow = true;
    securityBox.receiveShadow = true;
    scene.add(securityBox);
    collidableObjects.push({ mesh: securityBox, type: 'box', radius: 0.8, x: 7, z: 4 });

    // Security camera mount on yellow box
    const secCamMount = new THREE.Group();
    secCamMount.position.set(7, 1.5, 4);

    // Camera pole
    const camPoleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12);
    const camPole = new THREE.Mesh(camPoleGeo, metalMat);
    camPole.position.y = 0.3;
    secCamMount.add(camPole);

    // Camera housing
    const camHousingGeo = new THREE.BoxGeometry(0.3, 0.2, 0.4);
    const camHousingMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.3,
      metalness: 0.5
    });
    const camHousing = new THREE.Mesh(camHousingGeo, camHousingMat);
    camHousing.position.set(0, 0.7, 0);
    secCamMount.add(camHousing);

    // Camera lens
    const secCamLensGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.1, 16);
    const secCamLensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 1.0
    });
    const secCamLens = new THREE.Mesh(secCamLensGeo, secCamLensMat);
    secCamLens.rotation.x = Math.PI / 2;
    secCamLens.position.set(0, 0.7, -0.25);
    secCamMount.add(secCamLens);

    // Status LED on camera
    const secCamLedGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const secCamLedMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const secCamLed = new THREE.Mesh(secCamLedGeo, secCamLedMat);
    secCamLed.position.set(0.1, 0.8, -0.15);
    secCamMount.add(secCamLed);

    scene.add(secCamMount);

    // Security camera (Three.js camera for rendering)
    const securityCamera = new THREE.PerspectiveCamera(50, 640 / 360, 0.1, 50);
    securityCamera.position.set(7, 2.2, 4);

    const securityCameraRT = new THREE.WebGLRenderTarget(640, 360, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    // Barrels
    const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1, 16);
    const barrel1 = new THREE.Mesh(barrelGeo, plasticBlueMat);
    barrel1.position.set(-8, 0.5, 2);
    barrel1.castShadow = true;
    scene.add(barrel1);
    collidableObjects.push({ mesh: barrel1, type: 'barrel', radius: 0.5, x: -8, z: 2 });

    const barrel2 = new THREE.Mesh(barrelGeo, plasticBlueMat);
    barrel2.position.set(-8.6, 0.5, 2.5);
    barrel2.castShadow = true;
    scene.add(barrel2);
    collidableObjects.push({ mesh: barrel2, type: 'barrel', radius: 0.5, x: -8.6, z: 2.5 });

    // Charging station
    const chargingStation = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.15, 32);
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.y = 0.075;
    chargingStation.add(base);

    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 16);
    const pole = new THREE.Mesh(poleGeo, metalMat);
    pole.position.set(0, 0.9, -0.5);
    chargingStation.add(pole);

    const ringGeo = new THREE.TorusGeometry(0.6, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const chargingRing = new THREE.Mesh(ringGeo, ringMat);
    chargingRing.rotation.x = Math.PI / 2;
    chargingRing.position.y = 0.16;
    chargingStation.add(chargingRing);

    chargingStation.position.set(5, 0, 4);
    scene.add(chargingStation);
    collidableObjects.push({ mesh: base, type: 'station', radius: 0.8, x: 5, z: 4 });

    // Safety cones
    const coneGeo = new THREE.ConeGeometry(0.2, 0.5, 8);
    const cone1 = new THREE.Mesh(coneGeo, plasticOrangeMat);
    cone1.position.set(3, 0.25, 2);
    cone1.castShadow = true;
    scene.add(cone1);
    collidableObjects.push({ type: 'cone', radius: 0.3, x: 3, z: 2 });

    const cone2 = new THREE.Mesh(coneGeo, plasticOrangeMat);
    cone2.position.set(3.5, 0.25, 1.5);
    cone2.castShadow = true;
    scene.add(cone2);
    collidableObjects.push({ type: 'cone', radius: 0.3, x: 3.5, z: 1.5 });

    // Ceiling lights - brighter
    const createCeilingLight = (x: number, z: number) => {
      const lightGroup = new THREE.Group();
      const fixtureGeo = new THREE.BoxGeometry(1.5, 0.1, 0.4);
      const fixture = new THREE.Mesh(fixtureGeo, new THREE.MeshStandardMaterial({ color: 0x444444 }));
      lightGroup.add(fixture);

      const bulbGeo = new THREE.PlaneGeometry(1.4, 0.3);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.y = -0.06;
      bulb.rotation.x = -Math.PI / 2;
      lightGroup.add(bulb);

      const ceilingPointLight = new THREE.PointLight(0xffffff, 0.5, 12);
      ceilingPointLight.position.y = -0.2;
      lightGroup.add(ceilingPointLight);

      lightGroup.position.set(x, 3.9, z);
      scene.add(lightGroup);
    };

    createCeilingLight(-5, -5);
    createCeilingLight(5, -5);
    createCeilingLight(-5, 3);
    createCeilingLight(5, 3);
    createCeilingLight(0, -1); // Extra center light

    // Robot Materials
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xfafaf5,
      roughness: 0.35,
      metalness: 0.0,
      envMapIntensity: 0.5
    });

    const lightGrayMat = new THREE.MeshStandardMaterial({
      color: 0xf0f0e8,
      roughness: 0.45,
      metalness: 0.0,
      envMapIntensity: 0.3
    });

    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.3,
      metalness: 0.8
    });

    const darkScreenMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.1,
      metalness: 0.3
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 1.0,
      envMapIntensity: 1.0
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.0
    });

    // Robot Group
    const robot = new THREE.Group();
    scene.add(robot);

    // Body - taller and raised
    const bodyGeo = createRoundedBox(1.0, 1.0, 0.7, 0.15, 4);
    const body = new THREE.Mesh(bodyGeo, whiteMat);
    body.position.y = 0.8;
    body.castShadow = true;
    body.receiveShadow = true;
    robot.add(body);

    // Panel detail
    const panelGeo = createRoundedBox(0.6, 0.5, 0.02, 0.05, 2);
    const panel = new THREE.Mesh(panelGeo, lightGrayMat);
    panel.position.set(0, 0.85, 0.36);
    robot.add(panel);

    // Indicator LEDs
    const ledGeoSmall = new THREE.SphereGeometry(0.025, 8, 8);
    const ledPositions = [
      { x: -0.15, color: 0x00ff00 },
      { x: 0, color: 0x00ffff },
      { x: 0.15, color: 0xffff00 }
    ];
    ledPositions.forEach(({ x, color }) => {
      const ledSmall = new THREE.Mesh(ledGeoSmall, new THREE.MeshBasicMaterial({ color }));
      ledSmall.position.set(x, 1.0, 0.37);
      robot.add(ledSmall);
    });

    // Neck - raised and longer for more separation
    const neckGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.35, 16);
    const neck = new THREE.Mesh(neckGeo, silverMat);
    neck.position.y = 1.5;
    robot.add(neck);

    const neckRingGeo = new THREE.TorusGeometry(0.18, 0.03, 8, 24);
    const neckRing = new THREE.Mesh(neckRingGeo, chromeMat);
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.y = 1.42;
    robot.add(neckRing);

    // Head - raised further from body
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.85;
    robot.add(headGroup);

    const headWidth = 1.1;
    const headHeight = 0.7;
    const headDepth = 0.6;
    const headGeo = createRoundedBox(headWidth, headHeight, headDepth, 0.12, 4);
    const headShell = new THREE.Mesh(headGeo, whiteMat);
    headShell.castShadow = true;
    headShell.receiveShadow = true;
    headGroup.add(headShell);

    // LCD Screen dimensions
    const screenWidth = 0.9;
    const screenHeight = 0.5;

    // Dark LCD background - simple plane, positioned at front of head
    const lcdBackgroundGeo = new THREE.PlaneGeometry(screenWidth, screenHeight);
    const lcdBackgroundMat = new THREE.MeshBasicMaterial({ color: 0x0a0a1a });
    const lcdBackground = new THREE.Mesh(lcdBackgroundGeo, lcdBackgroundMat);
    lcdBackground.position.z = 0.43; // Just in front of head shell
    headGroup.add(lcdBackground);

    // Face Canvas for LCD display
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 256;
    faceCanvas.height = 160;
    const faceCtx = faceCanvas.getContext('2d')!;

    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.minFilter = THREE.LinearFilter;
    faceTexture.magFilter = THREE.LinearFilter;

    // Face display - NOT transparent, draws directly on canvas with dark background
    const faceMat = new THREE.MeshBasicMaterial({
      map: faceTexture
    });

    const faceDisplayGeo = new THREE.PlaneGeometry(screenWidth - 0.02, screenHeight - 0.02);
    const faceDisplay = new THREE.Mesh(faceDisplayGeo, faceMat);
    faceDisplay.position.z = 0.431; // Slightly in front of dark background
    headGroup.add(faceDisplay);

    // Draw initial face immediately
    const drawInitialFace = () => {
      const w = faceCanvas.width;
      const h = faceCanvas.height;

      // Dark background
      faceCtx.fillStyle = '#0a0a1a';
      faceCtx.fillRect(0, 0, w, h);

      // Glow settings
      const color = faceColorRef.current;
      faceCtx.shadowColor = color;
      faceCtx.shadowBlur = 20;
      faceCtx.fillStyle = color;
      faceCtx.strokeStyle = color;
      faceCtx.lineWidth = 3;
      faceCtx.lineCap = 'round';

      // Draw neutral face (eyes and mouth)
      const eyeY = h * 0.42;
      const eyeSpacing = w * 0.22;

      // Left eye
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, 35, 45, 0, 0, Math.PI * 2);
      faceCtx.fill();

      // Right eye
      faceCtx.beginPath();
      faceCtx.ellipse(w / 2 + eyeSpacing, eyeY, 35, 45, 0, 0, Math.PI * 2);
      faceCtx.fill();

      // Mouth
      faceCtx.beginPath();
      faceCtx.arc(w / 2, h * 0.72, 25, 0.1 * Math.PI, 0.9 * Math.PI, false);
      faceCtx.stroke();

      faceTexture.needsUpdate = true;
    };

    // Draw face immediately on creation
    drawInitialFace();

    // LCD Glow - use faceColor from ref for initial color
    const initialGlowColor = new THREE.Color(faceColorRef.current);
    const lcdGlowLight = new THREE.PointLight(initialGlowColor, 0.6, 3, 2);
    lcdGlowLight.position.set(0, 0, headDepth / 2 + 0.3);
    headGroup.add(lcdGlowLight);

    const lcdAmbientGlow = new THREE.PointLight(initialGlowColor, 0.2, 5, 2);
    lcdAmbientGlow.position.set(0, -0.2, headDepth / 2 + 0.5);
    headGroup.add(lcdAmbientGlow);

    // Ears
    const earGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.15, 16);
    const leftEar = new THREE.Mesh(earGeo, lightGrayMat);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-headWidth / 2 - 0.05, 0, 0);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, lightGrayMat);
    rightEar.rotation.z = Math.PI / 2;
    rightEar.position.set(headWidth / 2 + 0.05, 0, 0);
    headGroup.add(rightEar);

    // Camera mount
    const cameraMount = new THREE.Group();
    cameraMount.position.set(0, headHeight / 2 + 0.08, 0);
    headGroup.add(cameraMount);

    const cameraDomeGeo = new THREE.SphereGeometry(0.08, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cameraDome = new THREE.Mesh(cameraDomeGeo, new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.3,
      metalness: 0.5
    }));
    cameraMount.add(cameraDome);

    const cameraLensGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.03, 12);
    const cameraLens = new THREE.Mesh(cameraLensGeo, chromeMat);
    cameraLens.rotation.x = Math.PI / 2;
    cameraLens.position.set(0, 0.03, 0.05);
    cameraMount.add(cameraLens);

    const ledSmallGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const ledSmallMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cameraLed = new THREE.Mesh(ledSmallGeo, ledSmallMat);
    cameraLed.position.set(0.05, 0.02, 0.05);
    cameraMount.add(cameraLed);

    // Wheels
    const createWheel = (side: 'left' | 'right') => {
      const wheelGroup = new THREE.Group();

      const tireGeo = new THREE.TorusGeometry(0.3, 0.12, 16, 32);
      const tire = new THREE.Mesh(tireGeo, rubberMat);
      tire.rotation.y = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 24);
      const hub = new THREE.Mesh(hubGeo, whiteMat);
      hub.rotation.z = Math.PI / 2;
      hub.castShadow = true;
      wheelGroup.add(hub);

      const hubCapGeo = new THREE.CircleGeometry(0.18, 24);
      const hubCapMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.5 });
      const hubCapL = new THREE.Mesh(hubCapGeo, hubCapMat);
      hubCapL.position.x = side === 'left' ? -0.045 : 0.045;
      hubCapL.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      wheelGroup.add(hubCapL);

      const xPos = side === 'left' ? -0.7 : 0.7;
      wheelGroup.position.set(xPos, 0.32, 0);
      return wheelGroup;
    };

    const leftWheel = createWheel('left');
    robot.add(leftWheel);
    const rightWheel = createWheel('right');
    robot.add(rightWheel);

    // Caster wheel
    const casterGroup = new THREE.Group();
    casterGroup.position.set(0, 0.12, -0.25);
    robot.add(casterGroup);

    const casterBallGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const casterBall = new THREE.Mesh(casterBallGeo, chromeMat);
    casterGroup.add(casterBall);

    const casterHousingGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.1, 16);
    const casterHousing = new THREE.Mesh(casterHousingGeo, silverMat);
    casterHousing.position.y = 0.1;
    casterGroup.add(casterHousing);

    // Robot POV Camera
    const robotCamera = new THREE.PerspectiveCamera(60, 640 / 360, 0.1, 50);

    const robotCameraRT = new THREE.WebGLRenderTarget(640, 360, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    const povBuffer = new Uint8Array(640 * 360 * 4);
    const povImageData = povCtx?.createImageData(640, 360);

    // Dust particles
    const dustParticles: Array<{mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; maxLife: number}> = [];

    // Security camera canvas context
    const secCamCanvas = document.getElementById('security-cam-canvas') as HTMLCanvasElement;
    const secCamCtx = secCamCanvas?.getContext('2d');
    const secCamBuffer = new Uint8Array(640 * 360 * 4);
    const secCamImageData = secCamCtx?.createImageData(640, 360);

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      robot,
      body,
      headGroup,
      neck,
      neckRing,
      leftWheel,
      rightWheel,
      whiteMat,
      lightGrayMat,
      faceTexture,
      faceCanvas,
      faceCtx,
      lcdGlowLight,
      lcdAmbientGlow,
      cameraLed,
      robotCamera,
      robotCameraRT,
      securityCamera,
      securityCameraRT,
      secCamMount,
      collidableObjects,
      dustParticles,
      chargingRing
    };

    // Animation variables
    let lastTime = 0;
    let lastPovRenderTime = 0;
    let lastFaceDrawTime = 0;
    const POV_RENDER_INTERVAL = 50;
    const FACE_DRAW_INTERVAL = 33;

    // Local face drawing function (uses local canvas variables directly)
    const drawFaceLocal = (time: number) => {
      const w = faceCanvas.width;
      const h = faceCanvas.height;
      const currentExpression = expressionRef.current;
      const currentFaceColor = faceColorRef.current;
      const displayText = displayTextRef.current;

      // Dark LCD background
      faceCtx.fillStyle = '#0a0a1a';
      faceCtx.fillRect(0, 0, w, h);

      // Glow settings
      faceCtx.shadowColor = currentFaceColor;
      faceCtx.shadowBlur = 20;
      faceCtx.fillStyle = currentFaceColor;
      faceCtx.strokeStyle = currentFaceColor;
      faceCtx.lineWidth = 3;
      faceCtx.lineCap = 'round';

      // If there's text to display, show it instead of expression
      if (displayText) {
        faceCtx.font = 'bold 28px Inter, sans-serif';
        faceCtx.textAlign = 'center';
        faceCtx.textBaseline = 'middle';

        // Word wrap for long text
        const words = displayText.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach(word => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          if (faceCtx.measureText(testLine).width > w - 40) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        lines.push(currentLine);

        const lineHeight = 32;
        const startY = h / 2 - (lines.length - 1) * lineHeight / 2;

        lines.forEach((line, i) => {
          faceCtx.fillText(line, w / 2, startY + i * lineHeight);
        });

        faceTexture.needsUpdate = true;
        return;
      }

      const eyeY = h * 0.42;
      const eyeSpacing = w * 0.22;
      const eyeWidth = 35;
      const eyeHeight = 45;

      const blinkCycle = Math.sin(time * 0.003);
      const blinkScale = blinkCycle > 0.95 ? 0.1 : 1;

      if (currentExpression === 'neutral') {
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 + eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.beginPath();
        faceCtx.arc(w / 2, h * 0.72, 25, 0.1 * Math.PI, 0.9 * Math.PI, false);
        faceCtx.stroke();
      } else if (currentExpression === 'happy') {
        faceCtx.lineWidth = 8;
        faceCtx.beginPath();
        faceCtx.arc(w / 2 - eyeSpacing, eyeY + 10, 28, Math.PI, 2 * Math.PI);
        faceCtx.stroke();
        faceCtx.beginPath();
        faceCtx.arc(w / 2 + eyeSpacing, eyeY + 10, 28, Math.PI, 2 * Math.PI);
        faceCtx.stroke();
        faceCtx.lineWidth = 4;
        faceCtx.beginPath();
        faceCtx.arc(w / 2, h * 0.68, 35, 0.15 * Math.PI, 0.85 * Math.PI);
        faceCtx.stroke();
      } else if (currentExpression === 'thinking') {
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 + eyeSpacing, eyeY - 8, eyeWidth * 0.9, eyeHeight * 0.7, -0.2, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.beginPath();
        faceCtx.moveTo(w / 2 - 25, h * 0.72);
        faceCtx.quadraticCurveTo(w / 2, h * 0.68, w / 2 + 25, h * 0.72);
        faceCtx.stroke();
      } else if (currentExpression === 'surprised') {
        faceCtx.beginPath();
        faceCtx.arc(w / 2 - eyeSpacing, eyeY, 32, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.beginPath();
        faceCtx.arc(w / 2 + eyeSpacing, eyeY, 32, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.lineWidth = 4;
        faceCtx.beginPath();
        faceCtx.arc(w / 2, h * 0.72, 18, 0, Math.PI * 2);
        faceCtx.stroke();
      } else if (currentExpression === 'love') {
        const drawHeart = (cx: number, cy: number, size: number) => {
          faceCtx.beginPath();
          faceCtx.moveTo(cx, cy + size * 0.3);
          faceCtx.bezierCurveTo(cx, cy, cx - size, cy, cx - size, cy + size * 0.5);
          faceCtx.bezierCurveTo(cx - size, cy + size, cx, cy + size * 1.2, cx, cy + size * 1.5);
          faceCtx.bezierCurveTo(cx, cy + size * 1.2, cx + size, cy + size, cx + size, cy + size * 0.5);
          faceCtx.bezierCurveTo(cx + size, cy, cx, cy, cx, cy + size * 0.3);
          faceCtx.fill();
        };
        drawHeart(w / 2 - eyeSpacing, eyeY - 25, 22);
        drawHeart(w / 2 + eyeSpacing, eyeY - 25, 22);
        faceCtx.beginPath();
        faceCtx.arc(w / 2, h * 0.7, 30, 0.1 * Math.PI, 0.9 * Math.PI);
        faceCtx.stroke();
      } else if (currentExpression === 'loading') {
        const dotCount = 8;
        const radius = 35;
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount) * Math.PI * 2 + time * 0.005;
          const x = w / 2 + Math.cos(angle) * radius;
          const y = h / 2 + Math.sin(angle) * radius;
          const alpha = ((i / dotCount) + (time * 0.002)) % 1;
          faceCtx.globalAlpha = alpha;
          faceCtx.beginPath();
          faceCtx.arc(x, y, 8, 0, Math.PI * 2);
          faceCtx.fill();
        }
        faceCtx.globalAlpha = 1;
      } else if (currentExpression === 'sad') {
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 - eyeSpacing, eyeY + 8, eyeWidth * 0.9, eyeHeight * 0.6 * blinkScale, 0.2, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 + eyeSpacing, eyeY + 8, eyeWidth * 0.9, eyeHeight * 0.6 * blinkScale, -0.2, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.lineWidth = 4;
        faceCtx.beginPath();
        faceCtx.arc(w / 2, h * 0.82, 25, 1.1 * Math.PI, 1.9 * Math.PI);
        faceCtx.stroke();
      } else if (currentExpression === 'angry') {
        faceCtx.save();
        faceCtx.translate(w / 2 - eyeSpacing, eyeY);
        faceCtx.rotate(-0.3);
        faceCtx.fillRect(-eyeWidth, -eyeHeight * 0.3 * blinkScale, eyeWidth * 2, eyeHeight * 0.6 * blinkScale);
        faceCtx.restore();
        faceCtx.save();
        faceCtx.translate(w / 2 + eyeSpacing, eyeY);
        faceCtx.rotate(0.3);
        faceCtx.fillRect(-eyeWidth, -eyeHeight * 0.3 * blinkScale, eyeWidth * 2, eyeHeight * 0.6 * blinkScale);
        faceCtx.restore();
        faceCtx.lineWidth = 5;
        faceCtx.beginPath();
        faceCtx.moveTo(w / 2 - 30, h * 0.72);
        faceCtx.lineTo(w / 2 + 30, h * 0.72);
        faceCtx.stroke();
      } else if (currentExpression === 'wink') {
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.lineWidth = 6;
        faceCtx.beginPath();
        faceCtx.arc(w / 2 + eyeSpacing, eyeY, 25, 0, Math.PI);
        faceCtx.stroke();
        faceCtx.lineWidth = 4;
        faceCtx.beginPath();
        faceCtx.arc(w / 2 + 10, h * 0.70, 30, 0.1 * Math.PI, 0.9 * Math.PI);
        faceCtx.stroke();
      } else if (currentExpression === 'excited') {
        faceCtx.beginPath();
        faceCtx.arc(w / 2 - eyeSpacing, eyeY, 30, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.beginPath();
        faceCtx.arc(w / 2 + eyeSpacing, eyeY, 30, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.fillStyle = '#000';
        const drawStar = (cx: number, cy: number, size: number) => {
          faceCtx.beginPath();
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * size;
            const y = cy + Math.sin(angle) * size;
            if (i === 0) faceCtx.moveTo(x, y);
            else faceCtx.lineTo(x, y);
            const midAngle = angle + Math.PI / 4;
            const mx = cx + Math.cos(midAngle) * size * 0.4;
            const my = cy + Math.sin(midAngle) * size * 0.4;
            faceCtx.lineTo(mx, my);
          }
          faceCtx.closePath();
          faceCtx.fill();
        };
        drawStar(w / 2 - eyeSpacing - 8, eyeY - 8, 8);
        drawStar(w / 2 + eyeSpacing - 8, eyeY - 8, 8);
        faceCtx.fillStyle = currentFaceColor;
        faceCtx.lineWidth = 4;
        faceCtx.beginPath();
        faceCtx.arc(w / 2, h * 0.68, 35, 0.1 * Math.PI, 0.9 * Math.PI);
        faceCtx.stroke();
        faceCtx.beginPath();
        faceCtx.moveTo(w / 2 - 20, h * 0.72);
        faceCtx.lineTo(w / 2 + 20, h * 0.72);
        faceCtx.stroke();
      } else if (currentExpression === 'sleepy') {
        faceCtx.lineWidth = 6;
        faceCtx.beginPath();
        faceCtx.arc(w / 2 - eyeSpacing, eyeY + 5, 25, 0.3 * Math.PI, 0.7 * Math.PI);
        faceCtx.stroke();
        faceCtx.beginPath();
        faceCtx.arc(w / 2 + eyeSpacing, eyeY + 5, 25, 0.3 * Math.PI, 0.7 * Math.PI);
        faceCtx.stroke();
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2, h * 0.73, 15, 20, 0, 0, Math.PI * 2);
        faceCtx.stroke();
        faceCtx.font = 'bold 18px Inter, sans-serif';
        faceCtx.fillText('z', w * 0.75, h * 0.35);
        faceCtx.font = 'bold 14px Inter, sans-serif';
        faceCtx.fillText('z', w * 0.80, h * 0.28);
        faceCtx.font = 'bold 10px Inter, sans-serif';
        faceCtx.fillText('z', w * 0.84, h * 0.22);
      } else if (currentExpression === 'confused') {
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 - eyeSpacing, eyeY, eyeWidth, eyeHeight * blinkScale, 0, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.beginPath();
        faceCtx.ellipse(w / 2 + eyeSpacing, eyeY - 5, eyeWidth * 0.8, eyeHeight * 0.7 * blinkScale, 0, 0, Math.PI * 2);
        faceCtx.fill();
        faceCtx.font = 'bold 24px Inter, sans-serif';
        faceCtx.fillText('?', w / 2 + eyeSpacing + 15, eyeY - 25);
        faceCtx.lineWidth = 4;
        faceCtx.beginPath();
        faceCtx.moveTo(w / 2 - 30, h * 0.72);
        faceCtx.quadraticCurveTo(w / 2 - 10, h * 0.68, w / 2, h * 0.72);
        faceCtx.quadraticCurveTo(w / 2 + 10, h * 0.76, w / 2 + 30, h * 0.72);
        faceCtx.stroke();
      }

      faceTexture.needsUpdate = true;
    };

    // Update movement
    const updateMovement = (delta: number) => {
      const state = robotStateRef.current;
      const actions = actionsRef.current;
      const P = PHYSICS;

      let targetVelocity = 0;
      if (actions.forward) targetVelocity = P.maxSpeed;
      if (actions.backward) targetVelocity = -P.maxSpeed * 0.6;

      if (targetVelocity !== 0) {
        const accel = targetVelocity > state.velocity ? P.acceleration : P.deceleration;
        state.velocity += Math.sign(targetVelocity - state.velocity) * accel * delta;
        if (Math.abs(state.velocity) > Math.abs(targetVelocity)) {
          state.velocity = targetVelocity;
        }
      } else {
        if (Math.abs(state.velocity) > 0.01) {
          state.velocity -= Math.sign(state.velocity) * P.friction * delta;
        } else {
          state.velocity = 0;
        }
      }

      let targetAngularVel = 0;
      if (actions.turnLeft) targetAngularVel = P.maxTurnSpeed;
      if (actions.turnRight) targetAngularVel = -P.maxTurnSpeed;

      const speedFactor = 1.0 - Math.abs(state.velocity) / P.maxSpeed * 0.3;
      targetAngularVel *= speedFactor;

      if (targetAngularVel !== 0) {
        state.angularVelocity += (targetAngularVel - state.angularVelocity) * P.turnAccel * delta;
      } else {
        if (Math.abs(state.angularVelocity) > 0.01) {
          state.angularVelocity *= (1 - P.turnFriction * delta);
        } else {
          state.angularVelocity = 0;
        }
      }

      let targetHeadVel = 0;
      if (actions.headLeft) targetHeadVel = P.headTurnSpeed;
      if (actions.headRight) targetHeadVel = -P.headTurnSpeed;

      if (targetHeadVel !== 0) {
        state.headAngularVel += (targetHeadVel - state.headAngularVel) * P.headFriction * delta;
      } else {
        state.headAngularVel *= (1 - P.headFriction * delta);
      }

      state.headRotY += state.headAngularVel * delta;
      state.headRotY = Math.max(-P.headMaxRotation, Math.min(P.headMaxRotation, state.headRotY));

      state.rotation += state.angularVelocity * delta;

      const moveDistance = state.velocity * delta;
      const proposedX = state.x + Math.sin(state.rotation) * moveDistance;
      const proposedZ = state.z + Math.cos(state.rotation) * moveDistance;

      const resolved = resolveCollisions(proposedX, proposedZ);
      state.x = resolved.x;
      state.z = resolved.z;

      if (resolved.collision) {
        state.velocity *= 0.5;
        state.suspensionVelocity -= 0.02 * Math.sign(state.velocity);
      }

      state.wheelRotation += moveDistance / P.wheelRadius;

      const accelerationForce = (targetVelocity - state.velocity) * 0.5;
      const targetTilt = -accelerationForce * P.tiltAmount;
      state.bodyTilt += (targetTilt - state.bodyTilt) * P.tiltSmoothing * delta;

      const targetLean = -state.angularVelocity * P.leanAmount * Math.max(0.3, Math.abs(state.velocity) / P.maxSpeed);
      state.bodyLean += (targetLean - state.bodyLean) * P.leanSmoothing * delta;

      const velocityChange = Math.abs(targetVelocity - state.velocity);
      if (velocityChange > 0.5) {
        state.suspensionVelocity -= P.bumpForce * Math.sign(targetVelocity - state.velocity);
      }

      const springForce = -state.suspensionOffset * P.suspensionStiffness;
      const dampingForce = -state.suspensionVelocity * P.suspensionDamping;
      state.suspensionVelocity += (springForce + dampingForce) * delta;
      state.suspensionOffset += state.suspensionVelocity * delta;

      robot.position.x = state.x;
      robot.position.z = state.z;
      robot.rotation.y = state.rotation;

      body.rotation.x = state.bodyTilt;
      body.rotation.z = state.bodyLean;
      body.position.y = 0.8 + state.suspensionOffset;

      neck.rotation.x = state.bodyTilt * 0.5;
      neck.position.y = 1.5 + state.suspensionOffset * 0.8;
      neckRing.position.y = 1.42 + state.suspensionOffset * 0.8;

      leftWheel.rotation.x = state.wheelRotation;
      rightWheel.rotation.x = state.wheelRotation;

      headGroup.rotation.y = state.headRotY;

      controls.target.lerp(new THREE.Vector3(state.x, 1, state.z), 0.1);

      // Update speed callback
      if (onSpeedChange) {
        const speedPercent = Math.abs(state.velocity) / P.maxSpeed * 100;
        const isMoving = Math.abs(state.velocity) > 0.1;
        const isTurning = Math.abs(state.angularVelocity) > 0.3;
        const isReversing = state.velocity < -0.1;

        let stateText = 'Idle';
        if (isMoving && isTurning) {
          stateText = isReversing ? 'Reversing + Turn' : 'Moving + Turn';
        } else if (isMoving) {
          stateText = isReversing ? 'Reversing' : 'Moving';
        } else if (isTurning) {
          stateText = 'Turning';
        }
        onSpeedChange(speedPercent, stateText);
      }
    };

    // Update idle animations
    const updateIdleAnimations = (currentTime: number, delta: number) => {
      const state = robotStateRef.current;
      const idle = idleStateRef.current;
      const actions = actionsRef.current;

      const isMoving = Math.abs(state.velocity) > 0.1 || Math.abs(state.angularVelocity) > 0.3;
      const isUserControllingHead = actions.headLeft || actions.headRight;

      if (!isMoving && !isUserControllingHead) {
        if (currentTime > idle.nextLookTime) {
          idle.headLookTarget = (Math.random() - 0.5) * 1.0;
          idle.nextLookTime = currentTime + 2000 + Math.random() * 4000;
          idle.isLooking = true;
        }

        if (idle.isLooking) {
          idle.headLookCurrent += (idle.headLookTarget - idle.headLookCurrent) * 2.0 * delta;
          if (Math.abs(idle.headLookTarget - idle.headLookCurrent) < 0.01) {
            idle.isLooking = false;
          }
        } else {
          idle.headLookCurrent += (0 - idle.headLookCurrent) * 1.0 * delta;
        }

        headGroup.rotation.y = state.headRotY + idle.headLookCurrent;
      }

      idle.breathPhase += delta * 1.5;
      const breathOffset = Math.sin(idle.breathPhase) * 0.003;
      body.position.y = 0.8 + state.suspensionOffset + breathOffset;

      idle.attentionPhase += delta * 0.8;
      const attentionTilt = Math.sin(idle.attentionPhase) * 0.01;
      if (!isMoving) {
        headGroup.rotation.x = attentionTilt;
      }
    };

    // Spawn dust particle
    const spawnDustParticle = (x: number, y: number, z: number, velocityX: number, velocityZ: number) => {
      if (dustParticles.length >= 50) return;

      const size = 0.03 + Math.random() * 0.04;
      const geometry = new THREE.SphereGeometry(size, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.6
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(x, y, z);
      scene.add(particle);

      dustParticles.push({
        mesh: particle,
        velocity: new THREE.Vector3(
          velocityX + (Math.random() - 0.5) * 0.3,
          0.2 + Math.random() * 0.3,
          velocityZ + (Math.random() - 0.5) * 0.3
        ),
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4
      });
    };

    // Update dust particles
    const updateDustParticles = (delta: number, currentTime: number) => {
      const state = robotStateRef.current;
      const speed = Math.abs(state.velocity);

      if (speed > 0.5 && Math.random() < speed * 0.3) {
        const wheelOffsetX = 0.55;
        const wheelZ = Math.cos(state.rotation) * -0.1;
        const wheelX = Math.sin(state.rotation) * -0.1;

        const leftWheelX = state.x - Math.cos(state.rotation) * wheelOffsetX + wheelX;
        const leftWheelZ = state.z + Math.sin(state.rotation) * wheelOffsetX + wheelZ;
        const rightWheelX = state.x + Math.cos(state.rotation) * wheelOffsetX + wheelX;
        const rightWheelZ = state.z - Math.sin(state.rotation) * wheelOffsetX + wheelZ;

        const backVelX = -Math.sin(state.rotation) * speed * 0.5;
        const backVelZ = -Math.cos(state.rotation) * speed * 0.5;

        if (Math.random() > 0.5) {
          spawnDustParticle(leftWheelX, 0.1, leftWheelZ, backVelX, backVelZ);
        } else {
          spawnDustParticle(rightWheelX, 0.1, rightWheelZ, backVelX, backVelZ);
        }
      }

      for (let i = dustParticles.length - 1; i >= 0; i--) {
        const p = dustParticles[i];
        p.life += delta;

        p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.y -= 0.5 * delta;
        p.velocity.multiplyScalar(0.98);

        const lifeRatio = p.life / p.maxLife;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - lifeRatio);
        p.mesh.scale.setScalar(1 + lifeRatio * 0.5);

        if (p.life >= p.maxLife) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          dustParticles.splice(i, 1);
        }
      }
    };

    // Render robot POV
    const renderRobotPOV = () => {
      if (!povCtx || !povImageData) return;

      const state = robotStateRef.current;
      const headWorldPos = new THREE.Vector3();
      headGroup.getWorldPosition(headWorldPos);

      robotCamera.position.set(
        robot.position.x,
        headWorldPos.y + 0.35,
        robot.position.z
      );

      const totalRotation = state.rotation + state.headRotY;
      const lookTarget = new THREE.Vector3(
        robotCamera.position.x + Math.sin(totalRotation) * 10,
        robotCamera.position.y - 0.5, // Slight downward tilt to see floor/environment
        robotCamera.position.z + Math.cos(totalRotation) * 10
      );
      robotCamera.lookAt(lookTarget);

      // Hide robot so it doesn't see itself
      robot.visible = false;

      renderer.setRenderTarget(robotCameraRT);
      renderer.render(scene, robotCamera);

      // Show robot again
      robot.visible = true;

      renderer.setRenderTarget(null);

      renderer.readRenderTargetPixels(robotCameraRT, 0, 0, 640, 360, povBuffer);

      // Copy to ImageData (flip Y since WebGL is bottom-up)
      for (let y = 0; y < 360; y++) {
        for (let x = 0; x < 640; x++) {
          const srcIdx = ((359 - y) * 640 + x) * 4;
          const dstIdx = (y * 640 + x) * 4;
          povImageData.data[dstIdx] = povBuffer[srcIdx];
          povImageData.data[dstIdx + 1] = povBuffer[srcIdx + 1];
          povImageData.data[dstIdx + 2] = povBuffer[srcIdx + 2];
          povImageData.data[dstIdx + 3] = povBuffer[srcIdx + 3];
        }
      }
      povCtx.putImageData(povImageData, 0, 0);

      // Brighten the POV image
      povCtx.globalCompositeOperation = 'lighter';
      povCtx.fillStyle = 'rgba(40, 40, 50, 0.3)';
      povCtx.fillRect(0, 0, 640, 360);
      povCtx.globalCompositeOperation = 'source-over';

      // Very subtle scanline effect
      povCtx.fillStyle = 'rgba(0, 0, 0, 0.015)';
      for (let y = 0; y < 360; y += 3) {
        povCtx.fillRect(0, y, 640, 1);
      }

      // Very light vignette
      const gradient = povCtx.createRadialGradient(320, 180, 200, 320, 180, 400);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.15)');
      povCtx.fillStyle = gradient;
      povCtx.fillRect(0, 0, 640, 360);
    };

    // Render security camera (follows robot)
    const renderSecurityCamera = () => {
      if (!secCamCtx || !secCamImageData) return;

      // Make security camera look at robot
      const robotWorldPos = new THREE.Vector3();
      robot.getWorldPosition(robotWorldPos);

      // Point the camera mount towards robot
      const dx = robotWorldPos.x - secCamMount.position.x;
      const dz = robotWorldPos.z - secCamMount.position.z;
      secCamMount.rotation.y = Math.atan2(dx, dz);

      // Update security camera to look at robot (from slightly above the box)
      securityCamera.position.copy(secCamMount.position);
      securityCamera.position.y += 0.7; // Camera is on top of mount
      securityCamera.lookAt(robotWorldPos.x, robotWorldPos.y + 0.8, robotWorldPos.z);

      renderer.setRenderTarget(securityCameraRT);
      renderer.render(scene, securityCamera);
      renderer.setRenderTarget(null);

      renderer.readRenderTargetPixels(securityCameraRT, 0, 0, 640, 360, secCamBuffer);

      // Copy to ImageData (flip Y since WebGL is bottom-up)
      for (let y = 0; y < 360; y++) {
        for (let x = 0; x < 640; x++) {
          const srcIdx = ((359 - y) * 640 + x) * 4;
          const dstIdx = (y * 640 + x) * 4;
          secCamImageData.data[dstIdx] = secCamBuffer[srcIdx];
          secCamImageData.data[dstIdx + 1] = secCamBuffer[srcIdx + 1];
          secCamImageData.data[dstIdx + 2] = secCamBuffer[srcIdx + 2];
          secCamImageData.data[dstIdx + 3] = secCamBuffer[srcIdx + 3];
        }
      }
      secCamCtx.putImageData(secCamImageData, 0, 0);

      // Slight yellow/amber tint for security camera look
      secCamCtx.globalCompositeOperation = 'multiply';
      secCamCtx.fillStyle = 'rgba(255, 250, 230, 0.95)';
      secCamCtx.fillRect(0, 0, 640, 360);
      secCamCtx.globalCompositeOperation = 'source-over';

      // Subtle scanlines
      secCamCtx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      for (let y = 0; y < 360; y += 2) {
        secCamCtx.fillRect(0, y, 640, 1);
      }

      // Vignette
      const secGradient = secCamCtx.createRadialGradient(320, 180, 180, 320, 180, 380);
      secGradient.addColorStop(0, 'rgba(0,0,0,0)');
      secGradient.addColorStop(1, 'rgba(0,0,0,0.25)');
      secCamCtx.fillStyle = secGradient;
      secCamCtx.fillRect(0, 0, 640, 360);
    };

    // Animation loop
    const animate = (currentTime: number) => {
      requestAnimationFrame(animate);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      updateMovement(delta);
      updateIdleAnimations(currentTime, delta);
      updateDustParticles(delta, currentTime);

      controls.update();

      // Camera LED blink
      const ledPhase = currentTime * 0.004;
      const ledBrightness = (Math.sin(ledPhase) > 0.7) ? 0x00ff00 :
        (Math.sin(ledPhase) > 0) ? 0x00aa00 : 0x005500;
      cameraLed.material.color.setHex(ledBrightness);

      // Charging ring animation
      if (chargingRing) {
        chargingRing.rotation.z = currentTime * 0.002;
      }

      // Draw face at reduced rate
      if (currentTime - lastFaceDrawTime > FACE_DRAW_INTERVAL) {
        drawFaceLocal(currentTime);
        lastFaceDrawTime = currentTime;
      }

      // Render POV at reduced rate
      if (currentTime - lastPovRenderTime > POV_RENDER_INTERVAL) {
        renderRobotPOV();
        renderSecurityCamera();
        lastPovRenderTime = currentTime;
      }

      renderer.render(scene, camera);
    };

    // Start animation
    animate(0);

    // Handle resize
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, keyof typeof actionsRef.current> = {
        'KeyW': 'forward',
        'ArrowUp': 'forward',
        'KeyS': 'backward',
        'ArrowDown': 'backward',
        'KeyA': 'turnLeft',
        'ArrowLeft': 'turnLeft',
        'KeyD': 'turnRight',
        'ArrowRight': 'turnRight',
        'KeyQ': 'headLeft',
        'KeyE': 'headRight'
      };
      const action = keyMap[e.code];
      if (action) {
        actionsRef.current[action] = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyMap: Record<string, keyof typeof actionsRef.current> = {
        'KeyW': 'forward',
        'ArrowUp': 'forward',
        'KeyS': 'backward',
        'ArrowDown': 'backward',
        'KeyA': 'turnLeft',
        'ArrowLeft': 'turnLeft',
        'KeyD': 'turnRight',
        'ArrowRight': 'turnRight',
        'KeyQ': 'headLeft',
        'KeyE': 'headRight'
      };
      const action = keyMap[e.code];
      if (action) {
        actionsRef.current[action] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [createRoundedBox, drawFace, resolveCollisions, onSpeedChange]);

  // Expose action setters for external controls
  const setAction = useCallback((action: keyof typeof actionsRef.current, value: boolean) => {
    actionsRef.current[action] = value;
  }, []);

  // Expose method via ref-like pattern using window
  useEffect(() => {
    (window as unknown as {robotActions: typeof setAction}).robotActions = setAction;
    return () => {
      delete (window as unknown as {robotActions?: typeof setAction}).robotActions;
    };
  }, [setAction]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
});

export default RobotScene;
