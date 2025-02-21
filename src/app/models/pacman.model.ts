import {Character} from "./character.model";
import {MOVE_INTERVAL} from "./constants";

export class Pacman extends Character {
  hasMoved: boolean = false;
  angle: number = 0;

  onFirstMove?: () => void;

  constructor(x: number, y: number, cellSize: number, onFirstMove?: () => void) {
    super(x, y, cellSize);
    this.onFirstMove = onFirstMove;
  }

  update(currentTime: number): void {
    if (!this.updatePosition(currentTime, MOVE_INTERVAL)) return;

    const nextX = this.gridX + this.nextDirection.x;
    const nextY = this.gridY + this.nextDirection.y;

    if (this.isValidPosition(nextX, nextY)) {
      this.direction = { ...this.nextDirection};
    }

    const newX = this.gridX + this.direction.x;
    const newY = this.gridY + this.direction.y;

    if (this.isValidPosition(newX, newY)) {
      this.gridX = newX;
      this.gridY = newY;
      this.lastMoveTime = currentTime;

      if (!this.hasMoved && (this.direction.x !== 0 || this.direction.y !== 0)) {
        this.hasMoved = true;
        if (this.onFirstMove) {
          this.onFirstMove();
        }
      }
    }
  
    if (this.direction.x === 1) this.angle = 0;
    else if (this.direction.x === -1) this.angle = Math.PI;
    else if (this.direction.y === 1) this.angle = Math.PI/2;
    else if (this.direction.y === -1) this.angle = -Math.PI/2;

    this.handleWraparound();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.displayX + this.cellSize/2, this.displayY + this.cellSize/2);
    ctx.rotate(this.angle);

    const mouthOpen = this.isMoving ? (Math.sin(Date.now() * 0.05) + 1) / 4 : 0.15;

    ctx.beginPath();
    ctx.fillStyle = '#FFFF00';
    ctx.arc(0, 0, this.cellSize/2 - 2, mouthOpen, 2 * Math.PI - mouthOpen);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.restore();
  }
}