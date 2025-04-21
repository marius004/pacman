export interface EpisodeSample {
    pacman: {x: number; y: number};
    ghosts: {
        x: number; 
        y: number;
        type: number;
        state: number;
    }[];
    
    game_over: boolean;
    
    timestamp: number;
    lives: number;
    score: number;
}