export interface EpisodeSample {
    pacman: [number, number];
    ghosts: [number, number, number][];
    
    game_over: boolean;
    
    timestamp: number;
    lives: number;
    score: number;
}