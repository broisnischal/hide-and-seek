
import React from 'react';
import { Player } from '../types';
import { GAME_MAP } from '../services/mapData';

interface Props {
  player: Player;
  isSelf: boolean;
}

const PlayerAvatar: React.FC<Props> = ({ player, isSelf }) => {
  // Check if inside a hiding spot
  const isHidden = GAME_MAP.some(obs => 
      obs.isHidingSpot &&
      player.x >= obs.x && player.x <= obs.x + obs.w &&
      player.y >= obs.y && player.y <= obs.y + obs.h
  );

  let opacity = 1;
  
  if (player.status === 'CAUGHT') {
      opacity = 0.5; 
  } else if (isHidden) {
      if (player.isSelf) {
          opacity = 0.4; // Self hidden visible as ghost
      } else {
          opacity = 0; // Totally invisible to others
      }
  }

  return (
    <div
      className="absolute flex flex-col items-center justify-center z-30 pointer-events-none will-change-transform"
      style={{
        bottom: `${100 - player.y}%`, 
        left: `${player.x}%`,
        transform: 'translate(-50%, 50%)',
        opacity: opacity,
        transition: 'bottom 0.1s linear, left 0.1s linear, opacity 0.2s ease', // Smooth interpolation
        display: opacity === 0 ? 'none' : 'flex'
      }}
    >
      {/* Name Tag */}
      <div className="absolute -top-8 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] text-white font-mono border border-white/10 whitespace-nowrap">
        {player.name} {isSelf && <span className="text-emerald-400">*</span>}
      </div>

      {/* Character Body */}
      <div className={`relative w-8 h-8 transition-transform duration-150 ${player.facing === 'left' ? 'scale-x-[-1]' : 'scale-x-100'}`}>
        
        {/* Main Block */}
        <div 
            className={`w-full h-full ${player.status === 'CAUGHT' ? 'bg-zinc-500' : player.color} rounded-sm shadow-sm relative overflow-hidden`}
        >
            {/* Visor / Eyes */}
            <div className="absolute top-2 right-1 w-4 h-1.5 bg-black/80 rounded-sm"></div>
            
            {/* Seeker Badge */}
            {player.role === 'SEEKER' && player.status === 'ALIVE' && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 animate-pulse"></div>
            )}
        </div>

        {/* Talking Ring */}
        {player.isTalking && (
            <div className="absolute -inset-2 border-2 border-white/50 rounded-full animate-ping opacity-75"></div>
        )}
      </div>
      
      {/* Shadow */}
      <div className="w-6 h-1.5 bg-black/30 blur-[2px] rounded-full mt-[-2px]"></div>
    </div>
  );
};

export default PlayerAvatar;
