import {Character, POSSIBLE_DIRECTIONS, MOVE_INTERVAL} from './character';
import {Direction, GameState} from '@models/interfaces';
import {CellType} from '@models/map/cell-type';
import {GameMap} from '@models/map/game-map';
import {GhostState} from './ghost-state';
import {GhostType} from './ghost-type';

const GHOST_COLORS: Record<GhostType, string> = {
    [GhostType.BLINKY]: "#FF0000", // Blinky -> Red
    [GhostType.PINKY]: "#EB94BC",  // Pinky  -> Pink
    [GhostType.INKY]: "#00FCFF",   // Inky   -> Blue
    [GhostType.CLYDE]: "#FDCC08"   // Clyde  -> Orange
};

const SCATTER_CHASE_CYCLE = [7000, 20000, 7000, 20000, 5000, 20000, 5000, Infinity];

export abstract class Ghost extends Character {
    protected scatterTarget: Direction;

    protected state = GhostState.SCATTER;
    protected lastStateChange = 0;
    protected exitedRoom = false;
    protected cycleIndex = 0;
    
    readonly type: GhostType;

    constructor(type: GhostType, x: number, y: number, gameMap: GameMap, cellSize: number) {
        super(gameMap, x, y, cellSize, MOVE_INTERVAL * 1.3);

        this.scatterTarget = this.getScatterTarget(type, gameMap);
        this.type = type;
    }

    update(currentTime: number, gameState: GameState): void {
        this.handleStateTransition(currentTime);

        if (!this.updatePosition(currentTime)) {
            return;
        }

        if (this.gameMap.getCell(this.gridX, this.gridY) === CellType.Door) {
            const nextCell = this.gameMap.getCell(this.gridX + this.direction.x, this.gridY + this.direction.y);
            this.exitedRoom = nextCell !== CellType.GhostCell;
        }

        switch (this.state) {
            case GhostState.SCATTER:
                this.direction = this.getDirectionTowards(this.scatterTarget);
                break;
            case GhostState.CHASE:
                this.direction = this.selectChaseDirection(gameState);
                break;
            default:
                this.direction = this.getValidRandomDirection();
                break;
        }

        if (!this.canMoveToNextPosition()) {
            this.direction = this.getValidRandomDirection();
        }

        this.moveGhost(currentTime);
    }

    draw(ctx: CanvasRenderingContext2D, currentTime: number): void {
        ctx.save();
        ctx.translate(this.displayX + this.cellSize / 2, this.displayY + this.cellSize / 2);
        
        this.drawBody(ctx, currentTime);
        this.drawEyes(ctx);
        this.drawPupils(ctx);
        
        ctx.restore();
    }

    enterFrightenedState(currentTime: number): void {
        this.state = GhostState.FRIGHTENED;
        this.lastStateChange = currentTime;
    }

    onEaten(currentTime: number): void {
        this.lastStateChange = currentTime;
        this.state = GhostState.SCATTER;
        this.exitedRoom = false;

        this.gridX = 9;
        this.gridY = 9;
    }

    isFrightened(): boolean {
        return this.state == GhostState.FRIGHTENED;
    }

    override isValidPosition(x: number, y: number): boolean {
        // todo: use A* instead...
        if (!super.isValidPosition(x, y)) return false;
    
        const validMoves = POSSIBLE_DIRECTIONS.filter(({ x: dx, y: dy }) =>
            super.isValidPosition(this.gridX + dx, this.gridY + dy)
        );
    
        if (validMoves.length === 1) return true;
    
        const isOppositeDirection = x === this.gridX - this.direction.x && y === this.gridY - this.direction.y;
        return !isOppositeDirection;
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

    protected abstract selectChaseDirection(gameState: GameState): Direction;

    private moveGhost(currentTime: number): void {
        const newX = this.gridX + this.direction.x;
        const newY = this.gridY + this.direction.y;

        if (this.isValidPosition(newX, newY)) {
            this.lastMoveTime = currentTime;

            this.gridX = newX;
            this.gridY = newY;
        }
    }

    private drawBody(ctx: CanvasRenderingContext2D, currentTime: number): void {
        let ghostColor = GHOST_COLORS[this.type];

        if (this.state === GhostState.FRIGHTENED) {
            const timeElapsed = currentTime - this.lastStateChange;    
            const isFlashing = timeElapsed >= 4500 && Math.floor((timeElapsed / 200) % 2) === 0;
            ghostColor = isFlashing ? "#fff3e0" : "#ff6f00";
        }

        ctx.beginPath();
        ctx.fillStyle = ghostColor;

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

    private handleStateTransition(currentTime: number): void {
        const sinceLastChange = currentTime - this.lastStateChange;
        if (this.state === GhostState.FRIGHTENED && sinceLastChange > 7000) {
            this.state = GhostState.CHASE;
        }

        if (sinceLastChange > SCATTER_CHASE_CYCLE[this.cycleIndex]) {
            this.state = this.state == GhostState.SCATTER ? GhostState.CHASE : GhostState.SCATTER;
            this.cycleIndex = Math.min(this.cycleIndex + 1, SCATTER_CHASE_CYCLE.length - 1);
            this.lastStateChange = currentTime;
        }
    }

    private getScatterTarget(type: GhostType, gameMap: GameMap) {
        const SCATTER_TARGETS: Record<GhostType, Direction> = {
            [GhostType.INKY]: {x: gameMap.width, y: gameMap.height},
            [GhostType.BLINKY]: {x: gameMap.width, y: 0},
            [GhostType.CLYDE]: {x: 0, y: gameMap.height},
            [GhostType.PINKY]: {x: 0, y: 0}
        };

        return SCATTER_TARGETS[type];
    }
}
