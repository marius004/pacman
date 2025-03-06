import { Character } from '@models/characters/character';
import {CellType} from './cell-type';
import {Dot} from '../interfaces';

export class GameMap {
    private grid: CellType[][];
    
    constructor(mapData: number[][]) {
        this.grid = mapData.map(row => row.map(cell => cell as CellType));
    }
    
    getCell(x: number, y: number): CellType | null {
        return this.isValidPosition(x, y) ? this.grid[y][x] : null;
    }
    
    setCell(x: number, y: number, type: CellType): void {
        if (this.isValidPosition(x, y)) this.grid[y][x] = type;
    }
    
    isWalkable(character: Character, x: number, y: number): boolean {
        const cell = this.getCell(x, y) ?? CellType.Wall; 

        if (cell === CellType.Door) {
            return character.canPassDoor();
        }

        return cell !== CellType.Wall;
    }
    
    private isValidPosition(x: number, y: number): boolean {
        return x >= 0 && y >= 0 && y < this.height && x < this.width;
    }
    
    get width(): number {
        return this.grid[0]?.length ?? 0;
    }
    
    get height(): number {
        return this.grid.length;
    }
    
    get dots(): Dot[] {
        return this.grid
            .flatMap((row, y) => row.map((cell, x) => ({cell, x, y})))
            .filter(({cell}) => [CellType.Dot, CellType.PowerPellet].includes(cell))
            .map(({x, y, cell}) => ({gridX: x, gridY: y, type: cell}));
    }
    
    get walls(): {gridX: number, gridY: number}[] {
        return this.grid
            .flatMap((row, y) => row.map((cell, x) => ({cell, x, y})))
            .filter(({cell}) => cell === CellType.Wall)
            .map(({x, y}) => ({gridX: x, gridY: y}));
    }

    get door(): {gridX: number, gridY: number} | null {
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                if (this.grid[y][x] === CellType.Door) {
                    return {gridX: x, gridY: y};
                }
            }
        }
        return null;
    }
    
    drawWalls(ctx: CanvasRenderingContext2D, cellSize: number): void {
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(0, 0, this.width * cellSize, this.height * cellSize);
        
        ctx.fillStyle = '#000000';
        this.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== CellType.Wall) {
                    ctx.fillRect(
                        x * cellSize,
                        y * cellSize,
                        cellSize,
                        cellSize
                    );
                }
            });
        });
    }
    
    drawDots(ctx: CanvasRenderingContext2D, cellSize: number): void {
        ctx.fillStyle = '#FFFFFF';
        this.dots.forEach(({ gridX, gridY, type }) => {
            const x = gridX * cellSize + cellSize / 2;
            const y = gridY * cellSize + cellSize / 2;
            const radius = type === CellType.Dot ? 2 : 6;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawDoor(ctx: CanvasRenderingContext2D, cellSize: number): void {
        const door = this.door;
        if (door) {
            ctx.fillStyle = '#FF69B4';
            const doorWidth = cellSize;
            const doorHeight = cellSize / 5;
            const offsetX = (cellSize - doorWidth) / 2;
            ctx.fillRect(
                door.gridX * cellSize + offsetX,
                door.gridY * cellSize,
                doorWidth,
                doorHeight
            );
        }
    }
}