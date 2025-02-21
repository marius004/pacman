import {Character} from "./character.model";
import {MOVE_INTERVAL} from "./constants";
import {Direction} from "./interfaces";

export class Ghost extends Character {
    private canMove: boolean = false;
    private moveInterval: number;
    private color: string;

    constructor(x: number, y: number, color: string, cellSize: number) {
        super(x, y, cellSize);
        this.color = color;
        this.moveInterval = MOVE_INTERVAL * 1.3;
        this.direction = this.getRandomDirection();
    }

    startMoving(): void {
        this.canMove = true;
    }

    update(currentTime: number): void {
        if (!this.canMove || !this.updatePosition(currentTime, this.moveInterval)) return;
        
        if (!this.canMoveToNextPosition()) {
            this.direction = this.getValidRandomDirection();
        }

        this.moveGhost(currentTime);
        this.handleWraparound();
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.displayX + this.cellSize / 2, this.displayY + this.cellSize / 2);
        
        this.drawBody(ctx);
        this.drawEyes(ctx);
        this.drawPupils(ctx);
        
        ctx.restore();
    }

    private getRandomDirection(): Direction {
        const directions: Direction[] = [
            {x: -1, y: 0 }, {x: 1, y: 0},
            {x: 0, y: -1 }, {x: 0, y: 1}
        ];
        return directions[Math.floor(Math.random() * directions.length)];
    }

    private canMoveToNextPosition(): boolean {
        const nextX = this.gridX + this.direction.x;
        const nextY = this.gridY + this.direction.y;
        return this.isValidPosition(nextX, nextY);
    }

    private getValidRandomDirection(): Direction {
        const validDirections: Direction[] = [
            {x: -1, y: 0},
            {x: 1, y: 0},
            {x: 0, y: -1},
            {x: 0, y: 1}
        ].filter(({ x, y }) => this.isValidPosition(this.gridX + x, this.gridY + y));
        
        return validDirections.length > 0 
            ? validDirections[Math.floor(Math.random() * validDirections.length)]
            : this.direction;
    }

    private moveGhost(currentTime: number): void {
        const newX = this.gridX + this.direction.x;
        const newY = this.gridY + this.direction.y;

        if (this.isValidPosition(newX, newY)) {
            this.gridX = newX;
            this.gridY = newY;
            this.lastMoveTime = currentTime;
        }
    }

    private drawBody(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.fillStyle = this.color;
        
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
