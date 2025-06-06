import {Subject, fromEvent, takeUntil, debounceTime, map, Observable} from 'rxjs';
import {GAME_MAP, GhostInfo} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {CommonModule} from '@angular/common';
import {
  AfterViewInit, ElementRef, OnDestroy, 
  Component, ViewChild, OnInit, inject,
  Input
} from '@angular/core';

import {Pacman} from '@models/characters/pacman';
import {Dot, Direction} from '@models/interfaces';
import {Ghost} from '@models/characters/ghost';

import {Blinky} from '@models/characters/ghosts/blinky';
import {Clyde} from '@models/characters/ghosts/clyde';
import {Pinky} from '@models/characters/ghosts/pinky';
import {Inky} from '@models/characters/ghosts/inky';
import {GameService} from '@services/game.service';
import {CellType} from '@models/map/cell-type';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss'
})
export class BoardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') private readonly canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() gameMap!: GameMap;

  private readonly gameService = inject(GameService);
  private readonly destroyed$ = new Subject<void>();
  
  private ctx!: CanvasRenderingContext2D;
  private animationFrame = 0;
  private cellSize = 0;
  
  readonly gameOver$ = this.gameService.gameOver$;
  
  pacman!: Pacman;
  ghosts: Ghost[] = [];
  dots: Dot[] = [];

  ngOnInit(): void {
    this.cellSize = this.calculateInitialCellSize();
    
    this.initializeGameEntities();
    this.setupKeyboardControls();
    this.setupWindowResize();

    this.gameOver$.subscribe(value => {
      if (value) {
        this.pacman.setGameOver();
        this.ghosts.forEach(ghost => ghost.setGameOver());
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.startGameLoop();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    cancelAnimationFrame(this.animationFrame);
  }

  get score$(): Observable<number> {
    return this.gameService.score$;
  }

  restartGame(): void {
    window.location.reload();
  }

  private initializeGameEntities(): void {
    this.dots = this.gameMap.dots;
    this.initializePacman();
    this.initializeGhosts();
  }

  private initializePacman(): void {
    this.pacman = new Pacman(this.gameMap, 9, 15, this.cellSize, false);
  }

  private initializeGhosts(): void {
    this.ghosts = [
      new Blinky(9, 8, this.gameMap, this.cellSize, false),
      new Clyde(8, 9, this.gameMap, this.cellSize, false),
      new Inky(10, 9, this.gameMap, this.cellSize, false),
      new Pinky(9, 9, this.gameMap, this.cellSize, false)
    ];
  }

  private calculateInitialCellSize(): number {
    const {innerWidth: width, innerHeight: height} = window;
    const gridRatio = this.gameMap.width / this.gameMap.height;
    const windowRatio = width / height;

    return Math.floor(
      windowRatio > gridRatio
        ? (height * 0.95) / this.gameMap.height
        : (width * 0.95) / this.gameMap.width
    );
  }

  private initializeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.resizeCanvas(canvas);
    
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = true;
  }

  private setupKeyboardControls(): void {
    const directionMap = new Map<string, Direction>([
      ['ArrowLeft', { x: -1, y: 0 }], ['a', { x: -1, y: 0 }], ['A', { x: -1, y: 0 }],
      ['ArrowRight', { x: 1, y: 0 }], ['d', { x: 1, y: 0 }], ['D', { x: 1, y: 0 }],
      ['ArrowUp', { x: 0, y: -1 }], ['w', { x: 0, y: -1 }], ['W', { x: 0, y: -1 }],
      ['ArrowDown', { x: 0, y: 1 }], ['s', { x: 0, y: 1 }], ['S', { x: 0, y: 1 }]
    ]);

    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(takeUntil(this.destroyed$))
      .subscribe(({key}) => {
        const direction = directionMap.get(key);
        if (direction) {
          this.pacman.nextDirection = direction;
        }
      });
  }

  private setupWindowResize(): void {
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(250),
        takeUntil(this.destroyed$)
      )
      .subscribe(() => {
        this.cellSize = this.calculateInitialCellSize();
        this.resizeCanvas(this.canvasRef.nativeElement);
      });
  }

  private resizeCanvas(canvas: HTMLCanvasElement): void {
    canvas.width = this.gameMap.width * this.cellSize;
    canvas.height = this.gameMap.height * this.cellSize;
  }

  private checkCollisions(currentTime: number): void {
    this.checkDotCollision(currentTime);
    this.checkGhostCollision(currentTime);
  }

  private checkDotCollision(currentTime: number): void {
    const pacmanPosition = {
      x: this.pacman.gridX,
      y: this.pacman.gridY
    };

    this.dots = this.dots.filter(dot => {
      if (dot.gridX === pacmanPosition.x && dot.gridY === pacmanPosition.y) {
        if (dot.type === 0) {
          this.gameService.eatDot();
        } else {
          this.gameService.eatPowerPellet();
          this.ghosts.forEach(ghost => ghost.enterFrightenedState(currentTime));
        }
        
        this.gameMap.setCell(dot.gridX, dot.gridY, CellType.Empty);
        return false;
      }
      return true;
    });

    if (this.dots.length === 0) {
      this.gameMap = new GameMap(GAME_MAP);
      this.initializeGameEntities();
    }
  }

  private checkGhostCollision(currentTime: number): void {
    this.ghosts.forEach(ghost => { 
      if (this.pacman.gridX === ghost.gridX && this.pacman.gridY === ghost.gridY) {
        if (ghost.isFrightened()) {
          this.gameService.eatGhost();
          ghost.onEaten(currentTime);
        } else {
          this.gameService.gameOver();
        }
      }
    });
  }

  private render(currentTime: number): void {
    this.clearCanvas();
    this.drawMaze();
    this.drawEntities(currentTime);
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
  }

  private drawMaze(): void {
    this.gameMap.drawWalls(this.ctx, this.cellSize);
    this.gameMap.drawDots(this.ctx, this.cellSize);
    this.gameMap.drawDoor(this.ctx, this.cellSize);
  }

  private drawEntities(currentTime: number): void {
    this.pacman.draw(this.ctx, currentTime);
    this.ghosts.forEach(ghost => ghost.draw(this.ctx, currentTime));
  }

  private startGameLoop(): void {
    const gameLoop = (currentTime: number) => {
      this.updateGameState(currentTime);
      this.render(currentTime);
      this.animationFrame = requestAnimationFrame(gameLoop);
    };

    this.animationFrame = requestAnimationFrame(gameLoop);
  }

  private updateGameState(currentTime: number): void {
    this.pacman.update(currentTime);
    this.ghosts.forEach(ghost => {
      if (this.pacman.hasMoved) {
        ghost.update(
          currentTime, 
          {
            pacmanPosition: {x: this.pacman.gridX, y: this.pacman.gridY},
            ghostsInfo: this.ghosts.map(ghost => ({x: ghost.gridX, y: ghost.gridY, state: ghost.state, type: ghost.type} as GhostInfo)),
            gameMap: this.gameMap,
          }
        );
      }
    });
    this.checkCollisions(currentTime);
  }
}