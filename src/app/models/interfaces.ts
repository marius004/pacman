import {GhostType} from './characters/ghost-type';

export interface GhostPosition {
    type: GhostType;

    x: number;
    y: number;
}

export interface Direction {
    x: number;
    y: number;
}

export interface Dot {
    gridX: number;
    gridY: number;
    type: number;
}

export interface GameState {
    pacmanPosition: Direction;
    ghostPositions: GhostPosition[];
}