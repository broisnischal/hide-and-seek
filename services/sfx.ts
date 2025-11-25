
let audioCtx: AudioContext | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playStepSound = () => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Sci-fi footstep: fast frequency drop for a "bloop" step sound
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

  gain.gain.setValueAtTime(0.05, t); // Keep volume low
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t);
  osc.stop(t + 0.1);
};

export const playJoinSound = () => {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + 0.3);
};

export const playMissionStartSound = () => {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Alarm / Horn sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.linearRampToValueAtTime(220, t + 0.5);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 1.0);
};

export const playBlindSound = () => {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    // Low frequency thrum/heartbeat
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, t);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 1.5);
};

// Proximity Heartbeat State
let heartbeatOsc: OscillatorNode | null = null;
let heartbeatGain: GainNode | null = null;

export const updateProximitySound = (intensity: number) => {
    // intensity: 0.0 (far) to 1.0 (very close)
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    // Turn off if intensity is zero
    if (intensity <= 0.01) {
        if (heartbeatGain) {
            heartbeatGain.gain.setTargetAtTime(0, now, 0.2);
        }
        return;
    }

    // Initialize if needed
    if (!heartbeatOsc || !heartbeatGain) {
        heartbeatOsc = audioCtx.createOscillator();
        heartbeatGain = audioCtx.createGain();
        
        heartbeatOsc.type = 'triangle'; 
        heartbeatOsc.frequency.value = 50;
        
        heartbeatGain.gain.value = 0;

        heartbeatOsc.connect(heartbeatGain);
        heartbeatGain.connect(audioCtx.destination);
        heartbeatOsc.start();
    }

    // Dynamic Sound Shaping
    // Pitch: 50Hz -> 120Hz (Higher pitch as they get closer)
    heartbeatOsc.frequency.setTargetAtTime(50 + (intensity * 70), now, 0.1);

    // Pulse Effect (Wobble volume)
    // Speed: 2Hz -> 10Hz (Faster pulse as they get closer)
    const pulseSpeed = 2 + (intensity * 8); 
    const wobble = (Math.sin(now * pulseSpeed * Math.PI) + 1) / 2; // 0 to 1 sine wave
    
    // Volume: 0 -> 0.4 max
    // Mix constant volume with wobble for a throbbing effect
    const baseVol = intensity * 0.4;
    const currentVol = baseVol * (0.6 + 0.4 * wobble);

    heartbeatGain.gain.setTargetAtTime(currentVol, now, 0.05);
};
