import { Obstacle } from '../types';

export const GAME_MAP: Obstacle[] = [
    // --- HOUSE (Top Right) ---
    { id: 'house-main', type: 'WALL', x: 60, y: 10, w: 30, h: 25, isSolid: true, isHidingSpot: false },
    { id: 'house-roof', type: 'WALL', x: 58, y: 5, w: 34, h: 5, isSolid: false, isHidingSpot: false }, // Visual only
    // { id: 'house-door', type: 'WALL', x: 73, y: 35, w: 4, h: 1, isSolid: false, isHidingSpot: false }, // Doorway

    // --- GRAVEYARD (Top Left) ---
    { id: 'grave-1', type: 'GRAVESTONE', x: 10, y: 10, w: 4, h: 6, isSolid: true, isHidingSpot: false },
    { id: 'grave-2', type: 'GRAVESTONE', x: 20, y: 15, w: 4, h: 6, isSolid: true, isHidingSpot: false },
    { id: 'grave-3', type: 'GRAVESTONE', x: 15, y: 25, w: 4, h: 6, isSolid: true, isHidingSpot: false },
    { id: 'dead-tree', type: 'TREE', x: 5, y: 5, w: 10, h: 10, isSolid: true, isHidingSpot: false },

    // --- SWIMMING POOL (Bottom Right) ---
    { id: 'pool', type: 'WATER', x: 65, y: 65, w: 25, h: 20, isSolid: false, isHidingSpot: false }, // Can walk in, maybe slows down?
    { id: 'pool-chair', type: 'WALL', x: 62, y: 70, w: 3, h: 8, isSolid: true, isHidingSpot: false },

    // --- DUMPYARD (Bottom Left) ---
    { id: 'trash-1', type: 'TRASH', x: 5, y: 70, w: 8, h: 8, isSolid: false, isHidingSpot: true },
    { id: 'trash-2', type: 'TRASH', x: 15, y: 80, w: 10, h: 6, isSolid: false, isHidingSpot: true },
    { id: 'trash-bin', type: 'WALL', x: 10, y: 60, w: 6, h: 6, isSolid: true, isHidingSpot: true },

    // --- FOREST (Center / Scatter) ---
    // Bushes (Hiding Spots)
    { id: 'bush-1', type: 'BUSH', x: 40, y: 40, w: 8, h: 8, isSolid: false, isHidingSpot: true },
    { id: 'bush-2', type: 'BUSH', x: 20, y: 50, w: 8, h: 8, isSolid: false, isHidingSpot: true },
    { id: 'bush-3', type: 'BUSH', x: 80, y: 50, w: 8, h: 8, isSolid: false, isHidingSpot: true },
    { id: 'bush-4', type: 'BUSH', x: 50, y: 80, w: 8, h: 8, isSolid: false, isHidingSpot: true },
    
    // Trees (Solid trunk, can hide behind canopy technically, but we treat as solid base)
    { id: 'tree-1', type: 'TREE', x: 35, y: 20, w: 6, h: 6, isSolid: true, isHidingSpot: false },
    { id: 'tree-2', type: 'TREE', x: 50, y: 55, w: 6, h: 6, isSolid: true, isHidingSpot: false },
    { id: 'tree-3', type: 'TREE', x: 85, y: 85, w: 6, h: 6, isSolid: true, isHidingSpot: false },
];
