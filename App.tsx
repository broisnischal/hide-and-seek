
import React, { useState, useEffect, useRef } from 'react';
import { Send, Play, Mic, MicOff, Eye, EyeOff, Radio, Users, Skull, Clock } from 'lucide-react';
import { realtimeService } from './services/mockSocket';
import { initAudio, playStepSound, playJoinSound, playMissionStartSound, playBlindSound, updateProximitySound } from './services/sfx';
import VoiceIndicator from './components/VoiceIndicator';
import PlayerAvatar from './components/PlayerAvatar';
import GameMap from './components/GameMap';
import { GAME_MAP } from './services/mapData';
import { Player, ChatMessage, GameStatus } from './types';

// WORLD CONFIG
const WORLD_SIZE_PX = 3000; // The internal resolution of the map
const VIEWPORT_WIDTH = window.innerWidth;
const VIEWPORT_HEIGHT = window.innerHeight;

function App() {
  // Game State
  const [status, setStatus] = useState<GameStatus>(GameStatus.LOBBY);
  const [timer, setTimer] = useState(0);
  const [seekerId, setSeekerId] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [selfPlayer, setSelfPlayer] = useState<Player | null>(null);
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice State
  const [isMuted, setIsMuted] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);

  // Input & Movement State
  const keysPressed = useRef<Set<string>>(new Set());
  const distanceAccumulator = useRef<number>(0);

  // Host Logic
  const isHost = useRef(false);

  // Camera State
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0 });

  // --- Initialization & Realtime ---

  const joinGame = async () => {
    if (!username.trim()) return;
    try {
        initAudio();
        playJoinSound();

        let stream: MediaStream | null = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMediaStream(stream);
            setIsMuted(false); 
        } catch (err) {
            console.warn("Mic permission denied", err);
            setErrorMsg("Mic denied. Spectator mode.");
        }

        realtimeService.onPlayersChange(setPlayers);
        realtimeService.onChatMessage((msg) => {
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
        });

        realtimeService.onGameStateUpdate((payload) => {
            setStatus(payload.status);
            setTimer(payload.timer);
            setSeekerId(payload.seekerId);
            
            setSelfPlayer(prev => {
                if(!prev) return null;
                const role = prev.id === payload.seekerId ? 'SEEKER' : 'HIDER';
                if (prev.role !== role) {
                    // Role changed
                    if (role === 'SEEKER') playMissionStartSound();
                    realtimeService.updateMyStatus('ALIVE', role);
                    return { ...prev, role };
                }
                return prev;
            });
        });

        realtimeService.onRemoteStream((stream, peerId) => {
            if (!remoteAudioRef.current) return;
            console.log("Attaching audio for", peerId);
            
            // Clean existing
            const existing = document.getElementById(`audio-${peerId}`);
            if (existing) existing.remove();

            const audio = document.createElement('audio');
            audio.id = `audio-${peerId}`;
            audio.srcObject = stream;
            audio.autoplay = true;
            (audio as any).playsInline = true; 
            audio.volume = 1.0; 
            
            // Important: Append first, then play
            remoteAudioRef.current.appendChild(audio);
            
            audio.play().catch(e => {
                console.warn("Autoplay prevented, attempting to resume on interaction", e);
            });
        });

        realtimeService.onPeerDisconnect((peerId) => {
             const audioEl = document.getElementById(`audio-${peerId}`);
             if (audioEl) audioEl.remove();
        });

        const self = await realtimeService.connect(username);
        setSelfPlayer(self);
        setPlayers([self]);
        
        if (stream) {
            await realtimeService.joinVoice(stream);
        }
    } catch (e) {
        console.error(e);
        setErrorMsg("Connection failed. Refresh?");
    }
  };

  const startGame = () => {
      playMissionStartSound();
      isHost.current = true;
      const allIds = players.map(p => p.id);
      const newSeekerId = allIds[Math.floor(Math.random() * allIds.length)];
      realtimeService.broadcastGameState(GameStatus.HIDING, 15, newSeekerId);
      realtimeService.updateMyStatus('ALIVE', selfPlayer?.id === newSeekerId ? 'SEEKER' : 'HIDER');
  };

  // Timer Loop (Host)
  useEffect(() => {
      if (!isHost.current || status === GameStatus.LOBBY) return;

      const interval = setInterval(() => {
          let nextTimer = timer - 1;
          let nextStatus: GameStatus = status;

          if (nextTimer <= 0) {
              if (status === GameStatus.HIDING) {
                  nextStatus = GameStatus.SEEKING;
                  playMissionStartSound();
                  nextTimer = 45;
              } else if (status === GameStatus.SEEKING) {
                  nextStatus = GameStatus.GAME_OVER;
                  nextTimer = 8; 
              } else if (status === GameStatus.GAME_OVER) {
                  nextStatus = GameStatus.LOBBY;
                  nextTimer = 0;
                  isHost.current = false;
              }
          }

          setTimer(nextTimer);
          setStatus(nextStatus);
          realtimeService.broadcastGameState(nextStatus, nextTimer, seekerId || '');
      }, 1000);

      return () => clearInterval(interval);
  }, [status, timer, seekerId]);

  // Blind Loop Effect
  useEffect(() => {
      if (status === GameStatus.HIDING && selfPlayer?.role === 'SEEKER') {
          const interval = setInterval(() => {
              playBlindSound();
          }, 2000);
          return () => clearInterval(interval);
      }
  }, [status, selfPlayer?.role]);

  // Movement Logic
  const checkCollision = (newX: number, newY: number): boolean => {
      const pW = 2; const pH = 2; // Hitbox size in %
      for (const obs of GAME_MAP) {
          if (!obs.isSolid) continue;
          // Check overlapping rectangles
          if (newX < obs.x + obs.w && newX + pW > obs.x && newY < obs.y + obs.h && newY + pH > obs.y) {
              return true;
          }
      }
      return false;
  };

  useEffect(() => {
      const handleDown = (e: KeyboardEvent) => {
          if (document.activeElement?.tagName === 'INPUT') return;
          keysPressed.current.add(e.key.toLowerCase());
      };
      const handleUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
      window.addEventListener('keydown', handleDown);
      window.addEventListener('keyup', handleUp);
      return () => {
          window.removeEventListener('keydown', handleDown);
          window.removeEventListener('keyup', handleUp);
      };
  }, []);

  useEffect(() => {
      if (!selfPlayer) return; 

      let animationFrameId: number;

      const loop = () => {
          setSelfPlayer((prev) => {
              if (!prev) return null;
              if (prev.status === 'CAUGHT') return prev; 

              // Proximity Sound Update
              if (status === GameStatus.SEEKING && prev.role === 'HIDER' && prev.status === 'ALIVE') {
                  const seeker = players.find(p => p.role === 'SEEKER' && p.status === 'ALIVE');
                  if (seeker) {
                      const dx = seeker.x - prev.x;
                      const dy = seeker.y - prev.y;
                      const distPercent = Math.hypot(dx, dy);
                      const maxHearDist = 25; // Hear seeker within 25% of map width
                      
                      if (distPercent < maxHearDist) {
                          const intensity = Math.pow(1 - (distPercent / maxHearDist), 2); // Exponential increase
                          updateProximitySound(intensity);
                      } else {
                          updateProximitySound(0);
                      }
                  } else {
                      updateProximitySound(0);
                  }
              } else {
                  updateProximitySound(0);
              }

              // Movement
              const speed = prev.role === 'SEEKER' ? 0.15 : 0.12;
              let dx = 0; let dy = 0;

              if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy -= speed;
              if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy += speed;
              if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= speed;
              if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += speed;

              if (dx === 0 && dy === 0) {
                  return prev;
              }

              const distance = Math.hypot(dx, dy);
              distanceAccumulator.current += distance;
              if (distanceAccumulator.current > 5) { // Step frequency
                  playStepSound();
                  distanceAccumulator.current = 0;
              }

              let newX = Math.min(98, Math.max(0, prev.x + dx));
              let newY = Math.min(98, Math.max(0, prev.y + dy));
              
              const facing = dx < 0 ? 'left' : dx > 0 ? 'right' : prev.facing;

              if (checkCollision(newX, prev.y)) newX = prev.x;
              if (checkCollision(newX, newY)) newY = prev.y;

              realtimeService.moveSelf(newX, newY, facing);
              
              // Tagging Logic
              if (status === GameStatus.SEEKING && prev.role === 'SEEKER') {
                   players.forEach(other => {
                       if (other.id !== prev.id && other.status === 'ALIVE') {
                           const dist = Math.hypot(other.x - newX, other.y - newY);
                           if (dist < 3) { // Tag radius
                               realtimeService.broadcastTagged(other.id);
                               playMissionStartSound(); // Use alarm as tag sound
                           }
                       }
                   });
              }

              return { ...prev, x: newX, y: newY, facing };
          });
          animationFrameId = requestAnimationFrame(loop);
      };
      loop();
      return () => cancelAnimationFrame(animationFrameId);
  }, [status, players]); 

  // Update Camera Follow
  useEffect(() => {
      if (selfPlayer) {
          // Convert player % position to pixels in the large world
          const playerPX = (selfPlayer.x / 100) * WORLD_SIZE_PX;
          const playerPY = (selfPlayer.y / 100) * WORLD_SIZE_PX;

          // Center the viewport on the player
          const camX = -playerPX + (window.innerWidth / 2);
          const camY = -playerPY + (window.innerHeight / 2);

          setCameraPos({ x: camX, y: camY });
      }
  }, [selfPlayer?.x, selfPlayer?.y]);

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !selfPlayer) return;
    realtimeService.sendChat(chatInput);
    setChatInput('');
  };

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  
  const toggleMute = () => {
      if (mediaStream) {
          mediaStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
          setIsMuted(!isMuted);
          realtimeService.broadcastTalking(!isMuted);
      }
  };

  // --- Render Login ---
  if (!selfPlayer) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-zinc-950 relative overflow-hidden font-mono">
              {/* Background Grid */}
              <div className="absolute inset-0 z-0 opacity-20" style={{ 
                   backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)', 
                   backgroundSize: '40px 40px' 
              }}></div>
              
              <div className="z-10 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 p-8 rounded-xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                  
                  <h1 className="text-3xl text-emerald-500 mb-1 tracking-wider font-bold">NEON PROTOCOL</h1>
                  <p className="text-zinc-500 text-xs mb-8 tracking-widest uppercase">Large Scale Stealth Ops</p>
                  
                  <div className="mb-6">
                      <input 
                        type="text" 
                        placeholder="OPERATIVE ID"
                        autoFocus
                        className="w-full bg-black/50 border border-zinc-600 p-4 text-center text-white font-mono focus:border-emerald-500 outline-none rounded transition-all placeholder:text-zinc-700"
                        value={username}
                        onChange={e => setUsername(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && joinGame()}
                      />
                  </div>
                  
                  <button 
                    onClick={joinGame}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  >
                      <Radio size={16} className="animate-pulse" /> ESTABLISH UPLINK
                  </button>
                  
                  {errorMsg && <p className="text-red-500 text-xs mt-4">{errorMsg}</p>}
              </div>
          </div>
      );
  }

  const isBlind = status === GameStatus.HIDING && selfPlayer.role === 'SEEKER';

  return (
    <div className="fixed inset-0 w-full h-full bg-zinc-950 overflow-hidden select-none font-mono text-white">
      
      {/* --- Game World Container (Camera Transform) --- */}
      <div 
        className="absolute will-change-transform transition-transform duration-75 ease-linear"
        style={{
            width: `${WORLD_SIZE_PX}px`,
            height: `${WORLD_SIZE_PX}px`,
            transform: `translate3d(${cameraPos.x}px, ${cameraPos.y}px, 0)`
        }}
      >
          <GameMap />
          {players.map(p => (
              <PlayerAvatar key={p.id} player={p} isSelf={p.id === selfPlayer.id} />
          ))}
      </div>

      {/* --- Fog of War Overlay --- */}
      {/* Only visible when playing, centers on screen (which is where player is) */}
      {!isBlind && status !== GameStatus.LOBBY && (
        <div 
            className="fixed inset-0 pointer-events-none z-20"
            style={{
                background: 'radial-gradient(circle at center, transparent 150px, rgba(0,0,0,0.5) 300px, rgba(0,0,0,0.95) 500px, black 100%)'
            }}
        ></div>
      )}

      {/* --- HUD: Top Bar (Timer & Status) --- */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none">
          {status !== GameStatus.LOBBY && (
              <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 flex items-center gap-4 shadow-lg">
                  <div className={`text-3xl font-bold tracking-widest ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                      {timer.toString().padStart(2, '0')}
                  </div>
                  <div className="h-8 w-px bg-white/10"></div>
                  <div className="text-xs uppercase tracking-widest text-zinc-400">
                      {status === GameStatus.HIDING ? 'EVASION PHASE' : 'HUNT PHASE'}
                  </div>
              </div>
          )}
          
          {status === GameStatus.LOBBY && (
             <div className="bg-black/80 backdrop-blur px-8 py-6 rounded-xl border border-yellow-500/30 text-center pointer-events-auto shadow-2xl">
                 <div className="text-yellow-500 text-sm mb-2 uppercase tracking-widest">Awaiting Host Command</div>
                 <button 
                    onClick={startGame}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-3 rounded font-bold flex items-center gap-2 mx-auto transition-colors shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                  >
                      <Play size={16} /> INITIATE MISSION
                  </button>
                  <p className="text-[10px] text-zinc-500 mt-4">WASD to Move • Click Mic to Talk</p>
             </div>
          )}
      </div>

      {/* --- HUD: Top Right (Voice & Role) --- */}
      <div className="absolute top-6 right-6 z-40 flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-lg">
              <div className="text-right mr-2">
                  <div className="text-[10px] text-zinc-500 uppercase">Status</div>
                  <div className={`text-sm font-bold ${selfPlayer.role === 'SEEKER' ? 'text-red-500' : 'text-emerald-400'}`}>
                      {selfPlayer.role}
                  </div>
              </div>
              <button 
                onClick={toggleMute}
                className={`p-3 rounded-md transition-all ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'}`}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
          </div>
          {!isMuted && <div className="w-full h-1 bg-emerald-500/50 rounded animate-pulse"></div>}
      </div>

      {/* --- HUD: Bottom Left (Chat) --- */}
      <div className="absolute bottom-6 left-6 z-40 w-80 flex flex-col gap-2 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md border border-white/5 p-3 h-48 overflow-y-auto pointer-events-auto rounded-lg flex flex-col-reverse shadow-lg scrollbar-hide">
              <div ref={chatEndRef} />
              {messages.slice().reverse().map((msg) => (
                  <div key={msg.id} className="mb-1.5 text-xs break-words">
                      <span className={`font-bold mr-2 ${msg.senderName === selfPlayer.name ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          {msg.senderName}
                      </span>
                      <span className="text-zinc-200 opacity-90">{msg.text}</span>
                  </div>
              ))}
          </div>
          <form onSubmit={sendMessage} className="pointer-events-auto flex gap-2">
              <input 
                className="bg-black/60 backdrop-blur-sm border border-white/10 text-white px-3 py-2.5 text-xs flex-1 outline-none focus:border-emerald-500/50 rounded-lg transition-colors placeholder:text-zinc-600"
                placeholder="Broadcast Message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
          </form>
      </div>

      {/* --- Full Screen Blindness Effect --- */}
      {isBlind && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center pointer-events-auto">
              <EyeOff size={80} className="text-zinc-700 mb-8 animate-pulse" />
              <h2 className="text-4xl text-zinc-600 font-bold tracking-[0.3em] mb-4 text-center">SENSORS OFFLINE</h2>
              <div className="w-96 h-2 bg-zinc-900 rounded overflow-hidden">
                  <div className="h-full bg-red-700 transition-all duration-1000 ease-linear" style={{ width: `${(timer / 15) * 100}%` }}></div>
              </div>
              <p className="text-zinc-500 text-sm mt-6 tracking-widest">REBOOTING OPTICS IN {timer}s</p>
          </div>
      )}

      {/* Game Over Overlay */}
      {status === GameStatus.GAME_OVER && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center pointer-events-auto">
             <div className="text-center p-12 border border-white/10 rounded-3xl bg-zinc-900/80 shadow-2xl transform scale-110">
                  <div className="text-8xl mb-6 animate-bounce">
                     {players.find(p => p.role === 'SEEKER')?.status === 'CAUGHT' ? '👻' : '💀'}
                  </div>
                  <h2 className="text-5xl text-white font-bold mb-4 tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                      {players.find(p => p.role === 'SEEKER')?.status === 'CAUGHT' ? 'HIDERS SURVIVED' : 'SEEKER DOMINATED'}
                  </h2>
                  <p className="text-zinc-500 text-sm uppercase tracking-widest mt-8">Mission Cycle Complete. Resetting...</p>
             </div>
          </div>
      )}
      
      {/* Death Screen Overlay */}
      {selfPlayer.status === 'CAUGHT' && status !== GameStatus.GAME_OVER && (
          <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center bg-red-500/10 mix-blend-overlay backdrop-grayscale">
              <div className="text-red-500/30 font-bold text-[150px] -rotate-12 uppercase tracking-tighter border-4 border-red-500/30 p-4 rounded-xl">TERMINATED</div>
          </div>
      )}

      {/* Invisible Audio Mount */}
      <div ref={remoteAudioRef} className="hidden"></div>
    </div>
  );
}

export default App;
