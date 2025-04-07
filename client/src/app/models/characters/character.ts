import {GameMap} from '@models/map/game-map';
import {Direction} from '@models/interfaces';

export const ANIMATION_SPEED = 0.1;
export const MOVE_INTERVAL = 225;

export const POSSIBLE_DIRECTIONS: readonly Direction[] = [
    {x: 1, y: 0}, {x: -1, y: 0},
    {x: 0, y: 1}, {x: 0, y: -1}
];

export abstract class Character {
    private isGameOver = false;

    moveInterval: number;

    gridX: number;
    gridY: number;
    
    displayX: number;
    displayY: number;
    
    direction: Direction;
    nextDirection: Direction;

    lastMoveTime: number;
    cellSize: number;
    
    gameMap: GameMap;
    isMoving: boolean;

    simulationMode: boolean;

    constructor(gameMap: GameMap, gridX: number, gridY: number, cellSize: number, moveInterval: number, simulationMode: boolean) {
        this.simulationMode = simulationMode;
        this.moveInterval = moveInterval;

        this.cellSize = cellSize;
        this.gameMap = gameMap;

        this.gridX = gridX;
        this.gridY = gridY;
        
        this.displayX = gridX * cellSize;
        this.displayY = gridY * cellSize;
        
        this.direction = {x: 0, y: 0};
        this.nextDirection = {x: 0, y: 0};
        
        this.lastMoveTime = 0;
        this.isMoving = false;
    }
  
    updatePosition(currentTime: number): boolean {
        if(this.isGameOver) {
            return false;
        }
        
        const targetX = this.gridX * this.cellSize;
        const targetY = this.gridY * this.cellSize;
    
        this.isMoving = Math.abs(this.displayX - targetX) > 0.1 ||
                        Math.abs(this.displayY - targetY) > 0.1 ||
                        (this.direction.x !== 0 || this.direction.y !== 0);
  
        if (currentTime - this.lastMoveTime < this.moveInterval) {
            this.displayX += (targetX - this.displayX) * ANIMATION_SPEED;
            this.displayY += (targetY - this.displayY) * ANIMATION_SPEED;
            return false;
        }
        
        return true;
    }

    isValidPosition(x: number, y: number): boolean {
        return (
            x >= 0 &&
            y >= 0 &&
            x < this.gameMap.width &&
            y < this.gameMap.height &&
            this.gameMap.isWalkable(this, x, y)
        );
    }

    setGameOver() {
        this.isGameOver = true;
        this.nextDirection = {x: 0, y: 0};
    }

    canPassDoor(): boolean {
        return false;
    }
    
    abstract draw(ctx: CanvasRenderingContext2D, currentTime: number): void;
}
