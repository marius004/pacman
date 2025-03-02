import {Character, POSSIBLE_DIRECTIONS, MOVE_INTERVAL} from './character';
import {Direction, GameState} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {GhostType} from './ghost-type';
import { CellType } from '@models/map/cell-type';

const GHOST_COLORS: Record<GhostType, string> = {
    [GhostType.BLINKY]: "#FF0000", // Blinky -> Red
    [GhostType.PINKY]: "#EB94BC",  // Pinky  -> Pink
    [GhostType.INKY]: "#00FCFF",   // Inky   -> Blue
    [GhostType.CLYDE]: "#FDCC08"   // Clyde  -> Orange
};

export abstract class Ghost extends Character {
    private moveInterval: number;
    protected exitedRoom = false;

    readonly type: GhostType;

    constructor(type: GhostType, x: number, y: number, gameMap: GameMap, cellSize: number) {
        super(gameMap, x, y, cellSize);
        
        this.moveInterval = MOVE_INTERVAL * 1.3;
        this.direction = this.getRandomDirection();
        this.type = type;
    }

    update(currentTime: number, gameState: GameState): void {
        if (!this.updatePosition(currentTime, this.moveInterval)) {
            return;
        }

        if (this.gameMap.getCell(this.gridX, this.gridY) === CellType.Door) {
            const nextCell = this.gameMap.getCell(this.gridX + this.direction.x, this.gridY + this.direction.y);
            this.exitedRoom = nextCell !== CellType.GhostCell;
        }

        this.direction = this.updateDirection(gameState);
        if (!this.canMoveToNextPosition()) {
            this.direction = this.getValidRandomDirection();
        }

        this.moveGhost(currentTime);
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.displayX + this.cellSize / 2, this.displayY + this.cellSize / 2);
        
        this.drawBody(ctx);
        this.drawEyes(ctx);
        this.drawPupils(ctx);
        
        ctx.restore();
    }

    protected getDirectionTowards(target: Direction): Direction {
        return POSSIBLE_DIRECTIONS
            .map(dir => ({
                dir,
                distance: Math.pow(target.x - (this.gridX + dir.x), 2) 
                        + Math.pow(target.y - (this.gridY + dir.y), 2)
            }))
            .filter(({dir}) => this.isValidPosition(this.gridX + dir.x, this.gridY + dir.y))
            .reduce<{dir: Direction | null; distance: number}>(
                (best, current) => (current.distance < best.distance ? current : best),
                {dir: null, distance: Infinity}
            ).dir ?? this.getValidRandomDirection();
    }

    protected getRandomDirection(): Direction {
        return POSSIBLE_DIRECTIONS[Math.floor(Math.random() * POSSIBLE_DIRECTIONS.length)];
    }

    protected canMoveToNextPosition(): boolean {
        return this.isValidPosition(this.gridX + this.direction.x, this.gridY + this.direction.y);
    }

    protected getValidRandomDirection(): Direction {
        const validDirections = 
            POSSIBLE_DIRECTIONS.filter(({x, y}) => this.isValidPosition(this.gridX + x, this.gridY + y));
        
        return validDirections.length > 0 
            ? validDirections[Math.floor(Math.random() * validDirections.length)]
            : this.direction;
    }

    protected abstract updateDirection(gameState: GameState): Direction;

    private moveGhost(currentTime: number): void {
        const newX = this.gridX + this.direction.x;
        const newY = this.gridY + this.direction.y;

        if (this.isValidPosition(newX, newY)) {
            this.lastMoveTime = currentTime;

            this.gridX = newX;
            this.gridY = newY;
        }
    }

    private drawBody(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.fillStyle = GHOST_COLORS[this.type];
        
        ctx.arc(0, -2, this.cellSize / 2 - 4, Math.PI, 0, false);
        
        ctx.rect(-this.cellSize / 2 + 4, -2, this.cellSize - 8, this.cellSize / 2 - 2);
        ctx.fill();
    }

    private drawEyes(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5, -4, 4, 0, Math.PI * 2);
        ctx.arc(5, -4, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawPupils(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = 'black';
        const lookDir = Math.atan2(this.direction.y, this.direction.x);
        const pupilX = Math.cos(lookDir) * 2;
        const pupilY = Math.sin(lookDir) * 2;
        
        ctx.beginPath();
        ctx.arc(-5 + pupilX, -4 + pupilY, 2, 0, Math.PI * 2);
        ctx.arc(5 + pupilX, -4 + pupilY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
