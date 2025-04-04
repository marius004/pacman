import {Subject, takeUntil, Observable, map} from 'rxjs';
import {GAME_MAP, GhostPosition} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {CommonModule} from '@angular/common';
import {
  AfterViewInit, ElementRef, OnDestroy, 
  Component, ViewChild, OnInit, inject,
  Input
} from '@angular/core';

import {Pacman} from '@models/characters/pacman';
import {Dot} from '@models/interfaces';
import {Ghost} from '@models/characters/ghost';

import {ReinforcementLearningAgentService} from '@services/reinforcement-learning-agent.service';
import {Blinky} from '@models/characters/ghosts/blinky';
import {Clyde} from '@models/characters/ghosts/clyde';
import {Pinky} from '@models/characters/ghosts/pinky';
import {Inky} from '@models/characters/ghosts/inky';
import {GameService} from '@services/game.service';
import {CellType} from '@models/map/cell-type';
import {EpisodeSample} from '@models/http/episode-sample';

@Component({
  selector: 'app-simulation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './simulation.component.html',
  styleUrl: './simulation.component.scss'
})
export class SimulationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') private readonly canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() gameMap!: GameMap;

  private readonly gameService = inject(GameService);
  private readonly rlAgentService = inject(ReinforcementLearningAgentService);
  private readonly destroyed$ = new Subject<void>();
  
  private ctx!: CanvasRenderingContext2D;
  private animationFrame = 0;
  private cellSize = 0;
  private episodeSamples: EpisodeSample[] = [];
  private currentSampleIndex = 0;
  
  readonly gameOver$ = this.gameService.gameOver$;
  readonly lives$ = this.gameService.lives$;
  
  pacman!: Pacman;
  ghosts: Ghost[] = [];
  dots: Dot[] = [];

  ngOnInit(): void {
    this.cellSize = this.calculateInitialCellSize();
    this.initializeGameEntities();
    this.loadEpisodeSamples("dqn");
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

  get livesArray$(): Observable<number[]> {
    return this.lives$.pipe(map(lives => new Array(lives).fill(0)));
  }

  restartGame(): void {
    this.gameService.resetGame();
  }

  private loadEpisodeSamples(agent: string): void {
    this.rlAgentService.getEpisode(agent).pipe(
      takeUntil(this.destroyed$)
    ).subscribe({
      next: (samples: EpisodeSample[]) => {
        this.episodeSamples = samples;
        this.currentSampleIndex = 0;
      }
    });
  }

  private initializeGameEntities(): void {
    this.dots = this.gameMap.dots;
    this.initializePacman();
    this.initializeGhosts();
  }

  private initializePacman(): void {
    this.pacman = new Pacman(this.gameMap, 9, 15, this.cellSize, true);
  }

  private initializeGhosts(): void {
    this.ghosts = [
      new Blinky(9, 8, this.gameMap, this.cellSize, true),
      new Clyde(8, 9, this.gameMap, this.cellSize, true),
      new Inky(10, 9, this.gameMap, this.cellSize, true),
      new Pinky(9, 9, this.gameMap, this.cellSize, true)
    ];

    this.ghosts.forEach(ghost => {
      console.log(ghost.direction);
    })
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
    
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = true;
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
      const gridCollision =
        Math.round(this.pacman.gridX) === Math.round(ghost.gridX) &&
        Math.round(this.pacman.gridY) === Math.round(ghost.gridY);
      const physicalCollision = this.checkPhysicalCollision(ghost);
      
      if (gridCollision || physicalCollision) {
        if (ghost.isFrightened()) {
          this.gameService.eatGhost();
          ghost.onEaten(currentTime);
        } else {
          this.gameService.loseLife();
          if (this.gameService.currentLives > 0) {
            this.initializeGameEntities();
          }
        }
      }
    });
  }

  private checkPhysicalCollision(ghost: Ghost): boolean {
    const dx = (this.pacman.displayX + this.cellSize/2) - (ghost.displayX + this.cellSize/2);
    const dy = (this.pacman.displayY + this.cellSize/2) - (ghost.displayY + this.cellSize/2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < this.cellSize / 2;
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
    if (this.episodeSamples.length > 0 && this.currentSampleIndex < this.episodeSamples.length) {
      const sample = this.episodeSamples[this.currentSampleIndex];
      
      if (currentTime - sample.timestamp >= 225) {
        this.pacman.nextDirection = {
          x: sample.pacman[0] - this.pacman.gridX,
          y: sample.pacman[1] - this.pacman.gridY
        };

        sample.ghosts.forEach(ghostData => {
          const ghost = this.ghosts.find(ghost => Number(ghost.type) === ghostData[2]);
          
          if (ghost) {
            ghost.direction = {
              x: ghostData[0] - ghost.gridX,
              y: ghostData[1] - ghost.gridY
            }
          }
        });
        
        this.currentSampleIndex++;
      }
    }

    this.pacman.update(currentTime);
    this.ghosts.forEach(ghost => ghost.update(currentTime, {
      pacmanPosition: {x: this.pacman.gridX, y: this.pacman.gridY},
      ghostPositions: this.ghosts.map(g => ({ x: g.gridX, y: g.gridY, type: g.type } as GhostPosition)),
      gameMap: this.gameMap,
    }));
    
    this.checkCollisions(currentTime);
  }
}