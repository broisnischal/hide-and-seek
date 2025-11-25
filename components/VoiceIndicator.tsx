import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceIndicatorProps {
  isMuted: boolean;
  onToggleMute: () => void;
  stream: MediaStream | null;
}

const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ isMuted, onToggleMute, stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || isMuted) {
       // Stop animation if muted or no stream
       if (animationRef.current) cancelAnimationFrame(animationRef.current);
       // Clear canvas
       const canvas = canvasRef.current;
       const ctx = canvas?.getContext('2d');
       if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
       return;
    }

    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Create analyzer
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 32;
      }
      
      const analyser = analyserRef.current;

      // Connect source
      if (sourceRef.current) sourceRef.current.disconnect();
      sourceRef.current = ctx.createMediaStreamSource(stream);
      sourceRef.current.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;
      const canvasCtx = canvas?.getContext('2d');

      const draw = () => {
        if (!canvas || !canvasCtx) return;
        
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        // Simple visualizer: Draw a few bars
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height;

          // Green to Blue gradient simulation
          canvasCtx.fillStyle = `rgb(50, ${50 + barHeight + 100}, 255)`;
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    };

    initAudio();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [stream, isMuted]);

  return (
    <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
      <button
        onClick={onToggleMute}
        className={`p-2 rounded-full transition-colors ${
          isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
      
      <div className="flex flex-col">
         <span className="text-xs text-slate-400 font-mono uppercase">Voice Channel</span>
         <div className="h-8 w-32 bg-slate-900 rounded overflow-hidden relative">
            <canvas 
                ref={canvasRef} 
                width={128} 
                height={32} 
                className="w-full h-full"
            />
            {isMuted && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                    MUTED
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default VoiceIndicator;