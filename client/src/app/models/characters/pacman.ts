import { Direction } from '@models/interfaces';
import {Character, MOVE_INTERVAL} from './character';
import {GameMap} from '@models/map/game-map';

export class Pacman extends Character {
  moved: boolean = false;
  angle: number = 0;

  constructor(gameMap: GameMap, x: number, y: number, cellSize: number, simulationMode: boolean) {
    super(gameMap, x, y, cellSize, MOVE_INTERVAL, simulationMode);
  }

  get hasMoved(): boolean {
    return this.moved;
  }

  updateFromServerData(x: number, y: number, direction: Direction, currentTime: number): void {
    super.updateFrom(x, y, direction, currentTime);
    
    if (direction.x === 1) this.angle = 0;
    else if (direction.x === -1) this.angle = Math.PI;
    else if (direction.y === 1) this.angle = Math.PI/2;
    else if (direction.y === -1) this.angle = -Math.PI/2;
    
    this.isMoving = true;
    this.moved = true;
  } 

  update(currentTime: number): void {
    if (!this.updatePosition(currentTime)) return;

    const nextX = this.gridX + this.nextDirection.x;
    const nextY = this.gridY + this.nextDirection.y;

    if (this.isValidPosition(nextX, nextY)) {
      this.direction = {...this.nextDirection};
    } else if (this.handleTeleport()) {
      this.lastMoveTime = currentTime + 250;
      return;
    }

    const newX = this.gridX + this.direction.x;
    const newY = this.gridY + this.direction.y;

    if (this.isValidPosition(newX, newY)) {
      this.lastMoveTime = currentTime;

      this.gridX = newX;
      this.gridY = newY;

      if (!this.moved && (this.direction.x !== 0 || this.direction.y !== 0)) {
        this.moved = true;
      }
    }
  
    if (this.direction.x === 1) this.angle = 0;
    else if (this.direction.x === -1) this.angle = Math.PI;
    else if (this.direction.y === 1) this.angle = Math.PI/2;
    else if (this.direction.y === -1) this.angle = -Math.PI/2;
  }

  draw(ctx: CanvasRenderingContext2D, currentTime: number): void {
    ctx.save();
    ctx.translate(this.displayX + this.cellSize/2, this.displayY + this.cellSize/2);
    ctx.rotate(this.angle);

    const mouthOpen = this.isMoving ? (Math.sin(Date.now() * 0.025) + 1) / 4 : 0.15;

    ctx.beginPath();
    ctx.fillStyle = '#FFFF00';
    ctx.arc(0, 0, this.cellSize/2 - 2, mouthOpen, 2 * Math.PI - mouthOpen);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.restore();
  }

  private handleTeleport(): boolean {
    const [pointA, pointB] = this.gameMap.teleportPoints;
    const target = [pointA, pointB].find(p => this.gridX === p.x && this.gridY === p.y);
    
    if (target) {
      ({x: this.gridX, y: this.gridY} = target === pointA ? pointB : pointA);
      return true;
    }
    
    return false;
  }
}