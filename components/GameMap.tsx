
import React from 'react';
import { GAME_MAP } from '../services/mapData';
import { Obstacle } from '../types';

const GameMap: React.FC = () => {
  const renderObstacle = (obs: Obstacle) => {
    let className = "";
    let content = null;
    let style: React.CSSProperties = {};

    switch (obs.type) {
        case 'WALL':
            className = "bg-slate-700 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] border-t border-l border-slate-600";
            break;
        case 'GRAVESTONE':
            className = "bg-zinc-500 rounded-t-sm shadow-md flex items-center justify-center";
            content = <div className="w-3/4 h-3/4 border-2 border-zinc-600 border-b-0 opacity-50"></div>;
            break;
        case 'TREE':
            return (
                <div key={obs.id} style={{ left: `${obs.x}%`, top: `${obs.y}%`, width: `${obs.w}%`, height: `${obs.h}%` }} className="absolute z-20 pointer-events-none">
                    {/* Trunk */}
                    <div className="absolute bottom-0 left-1/3 w-1/3 h-1/4 bg-amber-900 rounded-sm"></div>
                    {/* Leaves */}
                    <div className="absolute bottom-1/4 left-0 w-full h-3/4 bg-emerald-800 rounded-sm shadow-lg border-b-4 border-emerald-900 opacity-95"></div>
                    <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-emerald-700 rounded-sm opacity-50"></div>
                </div>
            );
        case 'BUSH':
            className = "bg-emerald-900/80 rounded-sm border-2 border-emerald-800 opacity-90 backdrop-blur-sm";
            break;
        case 'WATER':
            className = "bg-cyan-900/50 border-2 border-cyan-500/30 overflow-hidden";
            content = <div className="absolute inset-0 bg-cyan-400/10 animate-pulse"></div>;
            break;
        case 'TRASH':
            className = "bg-stone-800 rounded-sm border border-stone-700";
            content = <div className="w-full h-full flex items-center justify-center text-[8px] text-stone-600">///</div>;
            break;
    }

    return (
      <div
        key={obs.id}
        className={`absolute ${className}`}
        style={{
          left: `${obs.x}%`,
          top: `${obs.y}%`,
          width: `${obs.w}%`,
          height: `${obs.h}%`,
          zIndex: obs.isSolid ? 10 : 5, // Solid objects higher
          ...style
        }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
       {/* Base Floor - Dark Tactical Grid */}
       <div className="absolute inset-0 bg-[#1a1a1a] z-0">
          <div className="absolute inset-0" 
               style={{ 
                   backgroundImage: 'linear-gradient(#262626 1px, transparent 1px), linear-gradient(90deg, #262626 1px, transparent 1px)', 
                   backgroundSize: '4% 4%' 
               }}>
          </div>
       </div>
       
       {/* Organic Patches (Subtle) */}
       <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-emerald-900/10 rounded-full blur-3xl z-0"></div>
       <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-3xl z-0"></div>

       {GAME_MAP.map(renderObstacle)}
    </div>
  );
};

export default GameMap;
