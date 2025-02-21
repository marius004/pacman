import {GAME_MAP, ANIMATION_SPEED, GRID_WIDTH, GRID_HEIGHT} from './constants';
import {Direction} from "./interfaces";

export abstract class Character {
    gridX: number;
    gridY: number;
    
    displayX: number;
    displayY: number;
    
    direction: Direction;
    nextDirection: Direction;
    lastMoveTime: number;
    isMoving: boolean;
    cellSize: number;
  
    constructor(gridX: number, gridY: number, cellSize: number) {
        this.gridX = gridX;
        this.gridY = gridY;
        
        this.displayX = gridX * cellSize;
        this.displayY = gridY * cellSize;
        
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        
        this.lastMoveTime = 0;
        this.isMoving = false;
        this.cellSize = cellSize;
    }
  
    updatePosition(currentTime: number, moveInterval: number): boolean {
        const targetX = this.gridX * this.cellSize;
        const targetY = this.gridY * this.cellSize;
    
        this.isMoving = Math.abs(this.displayX - targetX) > 0.1 ||
                        Math.abs(this.displayY - targetY) > 0.1 ||
                        (this.direction.x !== 0 || this.direction.y !== 0);
  
        if (currentTime - this.lastMoveTime < moveInterval) {
            this.displayX += (targetX - this.displayX) * ANIMATION_SPEED;
            this.displayY += (targetY - this.displayY) * ANIMATION_SPEED;
            return false;
        }
        return true;
    }
  

    isValidPosition(x: number, y: number): boolean {
        return x >= 0 && y >= 0 && x < GAME_MAP.width && y < GAME_MAP.height && GAME_MAP.isWalkable(x, y);
    }
    
    handleWraparound(): void {
        if (this.gridX < 0) this.gridX = GRID_WIDTH - 1;
        if (this.gridX >= GRID_WIDTH) this.gridX = 0;
        if (this.gridY < 0) this.gridY = GRID_HEIGHT - 1;
        if (this.gridY >= GRID_HEIGHT) this.gridY = 0;
    }

    abstract update(currentTime: number): void;
    abstract draw(ctx: CanvasRenderingContext2D): void;
}
