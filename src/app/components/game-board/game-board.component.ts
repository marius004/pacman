import {Subject, fromEvent, takeUntil, debounceTime} from 'rxjs';
import {CommonModule} from '@angular/common';
import {
  AfterViewInit, ElementRef, OnDestroy, 
  Component, ViewChild, OnInit, inject
} from '@angular/core';

import {GAME_MAP, GRID_HEIGHT, GRID_WIDTH} from '@models/constants';
import {Dot, Direction} from '@models/interfaces';
import {Pacman} from '@models/pacman.model';
import {Ghost} from '@models/ghost.model';

import {GameService} from '@services/game.service';

import {GameOverModalComponent} from '@components/game-over-modal/game-over-modal.component';
import {ScoreComponent} from '@components/score/score.component';
import {CellType} from '@models/cell.model';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, ScoreComponent, GameOverModalComponent],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.scss'
})
export class GameBoardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') private readonly canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private readonly gameService = inject(GameService);
  private readonly destroyed$ = new Subject<void>();
  
  private ctx!: CanvasRenderingContext2D;
  private animationFrame = 0;
  private cellSize = this.calculateInitialCellSize();
  
  readonly gameOver$ = this.gameService.gameOver$;
  
  pacman!: Pacman;
  ghosts: Ghost[] = [];
  dots: Dot[] = [];

  ngOnInit(): void {
    this.initializeGameEntities();
    this.setupKeyboardControls();
    this.setupWindowResize();
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

  private initializeGameEntities(): void {
    this.dots = GAME_MAP.dots;
    this.initializePacman();
    this.initializeGhosts();
  }

  private initializePacman(): void {
    this.pacman = new Pacman(9, 15, this.cellSize);
    this.pacman.onFirstMove = () => this.ghosts.forEach(ghost => ghost.startMoving());
  }

  private initializeGhosts(): void {
    const ghostConfigs = [
      {x: 9, y: 7, color: '#FF0000'},
      {x: 8, y: 9, color: '#00FF00'},
      {x: 10, y: 9, color: '#0000FF'},
      {x: 9, y: 11, color: '#FF00FF'}
    ];

    this.ghosts = ghostConfigs.map(config => 
      new Ghost(config.x, config.y, config.color, this.cellSize)
    );
  }

  private calculateInitialCellSize(): number {
    const {innerWidth: width, innerHeight: height} = window;
    const gridRatio = GRID_WIDTH / GRID_HEIGHT;
    const windowRatio = width / height;

    return Math.floor(
      windowRatio > gridRatio
        ? (height * 0.95) / GRID_HEIGHT
        : (width * 0.95) / GRID_WIDTH
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
    canvas.width = GRID_WIDTH * this.cellSize;
    canvas.height = GRID_HEIGHT * this.cellSize;
  }

  private checkCollisions(): void {
    this.checkDotCollision();
    this.checkGhostCollision();
  }

  private checkDotCollision(): void {
    const pacmanPosition = {
      x: this.pacman.gridX,
      y: this.pacman.gridY
    };

    this.dots = this.dots.filter(dot => {
      if (dot.gridX === pacmanPosition.x && dot.gridY === pacmanPosition.y) {
        this.gameService.updateScore(dot.type === 0 ? 10 : 50);
        GAME_MAP.setCell(dot.gridX, dot.gridY, CellType.Empty);
        return false;
      }
      return true;
    });

    if (this.dots.length === 0) {
      this.gameService.gameOver();
    }
  }

  private checkGhostCollision(): void {
    const hasCollision = this.ghosts.some(ghost => {
      const gridCollision = 
        Math.round(this.pacman.gridX) === Math.round(ghost.gridX) &&
        Math.round(this.pacman.gridY) === Math.round(ghost.gridY);

      const physicalCollision = this.checkPhysicalCollision(ghost);

      return gridCollision || physicalCollision;
    });

    if (hasCollision) {
      this.gameService.gameOver();
    }
  }

  private checkPhysicalCollision(ghost: Ghost): boolean {
    const dx = (this.pacman.displayX + this.cellSize/2) - (ghost.displayX + this.cellSize/2);
    const dy = (this.pacman.displayY + this.cellSize/2) - (ghost.displayY + this.cellSize/2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < this.cellSize / 2;
  }

  private render(): void {
    this.clearCanvas();
    this.drawMaze();
    this.drawEntities();
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
  }

  private drawMaze(): void {
    GAME_MAP.drawWalls(this.ctx, this.cellSize);
    GAME_MAP.drawDots(this.ctx, this.cellSize);
  }

  private drawEntities(): void {
    this.pacman.draw(this.ctx);
    this.ghosts.forEach(ghost => ghost.draw(this.ctx));
  }

  private startGameLoop(): void {
    const gameLoop = (currentTime: number) => {
      this.updateGameState(currentTime);
      this.render();
      this.animationFrame = requestAnimationFrame(gameLoop);
    };

    this.animationFrame = requestAnimationFrame(gameLoop);
  }

  private updateGameState(currentTime: number): void {
    this.pacman.update(currentTime);
    this.ghosts.forEach(ghost => ghost.update(currentTime));
    this.checkCollisions();
  }
}