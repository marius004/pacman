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

const GHOST_RESPAWN_POINT: Record<GhostType, Direction> = {
    [GhostType.BLINKY]: {x: 9, y: 9},
    [GhostType.PINKY]: {x: 9, y: 9},
    [GhostType.INKY]: {x: 10, y: 9},
    [GhostType.CLYDE]: {x: 8, y: 9}
};

const GHOST_RESPAWN_TIME: Record<GhostType, number> = {
    [GhostType.BLINKY]: 1500,
    [GhostType.PINKY]:  2000,
    [GhostType.INKY]:   4000,
    [GhostType.CLYDE]:  6000
};

const SCATTER_CHASE_CYCLE = [7000, 20000, 7000, 20000, 5000, 20000, 5000, Infinity];

const GHOST_BASE_SPEED = MOVE_INTERVAL * 1.3;
const SPEED_INCREASE_INTERVAL = 10000;

type NodePath = {
    distance: number;
    parent: Direction | null;
} | null;

export abstract class Ghost extends Character {    
    protected scatterTarget: Direction;
    protected previousState: GhostState;

    protected lastStateChange = 0;
    protected exitedRoom = false;
    protected cycleIndex = 0;
    
    state = GhostState.SCATTER;
    readonly type: GhostType;

    constructor(type: GhostType, x: number, y: number, gameMap: GameMap, cellSize: number, simulationMode: boolean) {
        super(gameMap, x, y, cellSize, GHOST_BASE_SPEED, simulationMode);
        this.type = type;

        this.scatterTarget = this.getScatterTarget(type, gameMap);
        this.previousState = GhostState.SCATTER;
    }

    update(currentTime: number, gameState: GameState): void {
        if (this.simulationMode) {
            const ghostData = gameState.ghostsInfo.find(g => g.type === this.type);
            if (ghostData) {
                super.updateFrom(
                    ghostData.x, 
                    ghostData.y, 
                    {x: ghostData.x - this.gridX, y: ghostData.y - this.gridY}, 
                    currentTime
                );
                this.state = ghostData.state;
            }

            return;
        }

        if (!this.updatePosition(currentTime)) return;

        this.handleStateTransition(currentTime);
        this.updateSpeed(currentTime);

        if (this.gameMap.getCell(this.gridX, this.gridY) === CellType.Door) {
            const nextCell = this.gameMap.getCell(this.gridX + this.direction.x, this.gridY + this.direction.y);
            this.exitedRoom = nextCell !== CellType.GhostCell;
        }

        if (!this.simulationMode) {
            switch (this.state) {
                case GhostState.SCATTER:
                    this.direction = this.getDirectionTowards(gameState, this.scatterTarget);
                    break;
                case GhostState.CHASE:
                    this.direction = this.selectChaseDirection(gameState);
                    break;
                default:
                    this.direction = this.getValidRandomDirection();
                    break;
            }
        }

        if (!this.simulationMode && !this.isValidPosition(this.gridX + this.direction.x, this.gridY + this.direction.y)) {
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
        if (this.state !== GhostState.FRIGHTENED) {
            this.previousState = this.state;
            this.state = GhostState.FRIGHTENED;
            this.lastStateChange = currentTime;
        }
    }

    onEaten(currentTime: number): void {
        this.direction = {x: 0, y: 0};
        this.lastMoveTime = currentTime;
        
        this.gridX = GHOST_RESPAWN_POINT[this.type].x;
        this.gridY = GHOST_RESPAWN_POINT[this.type].y;
        
        this.state = this.previousState;
        this.lastStateChange = currentTime;
        this.exitedRoom = true;
        
        setTimeout(() => {
            this.exitedRoom = false;
        }, GHOST_RESPAWN_TIME[this.type]);
    }

    isFrightened(): boolean {
        return this.state == GhostState.FRIGHTENED;
    }
    
    override canPassDoor(): boolean {
        return !this.exitedRoom;
    }

    override isValidPosition(x: number, y: number): boolean {
        if (!super.isValidPosition(x, y)) return false;
    
        const validMoves = POSSIBLE_DIRECTIONS.filter(({ x: dx, y: dy }) =>
            super.isValidPosition(this.gridX + dx, this.gridY + dy)
        );
    
        if (validMoves.length === 1) return true;
    
        const isOppositeDirection = x === this.gridX - this.direction.x && y === this.gridY - this.direction.y;
        return !isOppositeDirection;
    }

    protected getDirectionTowards(gameState: GameState, target: Direction): Direction {
        const {width, height} = gameState.gameMap;
        
        const targetX = Math.max(0, Math.min(target.x, width - 1));
        const targetY = Math.max(0, Math.min(target.y, height - 1));
    
        let queue: [number, number][] = [[this.gridX, this.gridY]];
        let cost: NodePath[][] = Array.from({ length: width }, () =>
            Array.from({ length: height }, () => null)
        );
    
        cost[this.gridX][this.gridY] = {distance: 0, parent: null};
        let closest = {
            x: this.gridX,
            y: this.gridY, 
            distance: Math.abs(this.gridX - targetX) + Math.abs(this.gridY - targetY) 
        };
    
        while (queue.length) {
            const [x, y] = queue.shift()!;
            const distance = Math.abs(x - targetX) + Math.abs(y - targetY);
    
            if (distance < closest.distance) closest = {x, y, distance};
            if (x === targetX && y === targetY) break;
    
            for (const dir of POSSIBLE_DIRECTIONS) {
                const nx = x + dir.x, ny = y + dir.y;
    
                if (!this.isValidPosition(nx, ny) || cost[nx][ny]) continue;
    
                cost[nx][ny] = {
                    distance: cost[x][y]!.distance + 1, 
                    parent: { x: -dir.x, y: -dir.y } 
                };
                queue.push([nx, ny]);
            }
        }
    
        return this.traceBackDirection(cost, closest.x, closest.y);
    }

    protected getValidRandomDirection(): Direction {
        const validDirections = 
            POSSIBLE_DIRECTIONS.filter(({x, y}) => this.isValidPosition(this.gridX + x, this.gridY + y));
        
        const directionIndex = Math.floor(Math.random() * validDirections.length);
        return validDirections.length > 0 ? validDirections[directionIndex] : this.direction;    
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
            const isFlashing = timeElapsed >= 5500 && Math.floor((timeElapsed / 200) % 2) === 0;
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

    handleStateTransition(currentTime: number): void {
        const sinceLastChange = currentTime - this.lastStateChange;
        if (this.state === GhostState.FRIGHTENED) {
            if (sinceLastChange > 7000) {
                this.lastStateChange = currentTime;
                this.state = this.previousState;
            }
            return;
        }
    
        if (sinceLastChange > SCATTER_CHASE_CYCLE[this.cycleIndex]) {
            this.state = this.state === GhostState.SCATTER ? GhostState.CHASE : GhostState.SCATTER;
            this.cycleIndex = Math.min(this.cycleIndex + 1, SCATTER_CHASE_CYCLE.length - 1);
            this.lastStateChange = currentTime;
        }
    }

    private updateSpeed(currentTime: number): void {
        if (this.state === GhostState.FRIGHTENED) {
            this.moveInterval = GHOST_BASE_SPEED * 0.8;
            return;
        }
        
        const speedIncrease = Math.min(Math.floor(currentTime / SPEED_INCREASE_INTERVAL) * 0.05);
        this.moveInterval = MOVE_INTERVAL * Math.max(1.3 - speedIncrease, 1.15);
    }

    private getScatterTarget(type: GhostType, gameMap: GameMap) {
        const SCATTER_TARGETS: Record<GhostType, Direction> = {
            [GhostType.INKY]: {x: gameMap.width - 1, y: gameMap.height - 1},
            [GhostType.BLINKY]: {x: gameMap.width - 1, y: 0},
            [GhostType.CLYDE]: {x: 0, y: gameMap.height - 1},
            [GhostType.PINKY]: {x: 0, y: 0}
        };

        return SCATTER_TARGETS[type];
    }

    private traceBackDirection(cost: NodePath[][], x: number, y: number): Direction {
        while (cost[x][y]?.parent) {
            const parent = cost[x][y]!.parent!;
            const px = x + parent.x, py = y + parent.y;
    
            if (px === this.gridX && py === this.gridY) {
                return {
                    x: x - px,
                    y: y - py
                };
            }
    
            x = px;
            y = py;
        }
        return this.getValidRandomDirection();
    }
}
