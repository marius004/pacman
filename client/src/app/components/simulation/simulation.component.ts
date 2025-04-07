import {GAME_MAP, GhostPosition} from '@models/interfaces';
import {Subject, takeUntil, Observable} from 'rxjs';
import {GameMap} from '@models/map/game-map';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {
  ElementRef, OnDestroy,
  Component, ViewChild, OnInit, inject,
  Input, NgZone
} from '@angular/core';

import {ReinforcementLearningAgentService} from '@services/reinforcement-learning-agent.service';
import {EpisodeSample} from '@models/http/episode-sample';
import {Blinky} from '@models/characters/ghosts/blinky';
import {Clyde} from '@models/characters/ghosts/clyde';
import {Pinky} from '@models/characters/ghosts/pinky';
import {Inky} from '@models/characters/ghosts/inky';
import {GameService} from '@services/game.service';
import {AgentInfo} from '@models/http/agent-info';
import {Pacman} from '@models/characters/pacman';
import {CellType} from '@models/map/cell-type';
import {Ghost} from '@models/characters/ghost';
import {Dot} from '@models/interfaces';

@Component({
  selector: 'app-simulation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './simulation.component.html',
  styleUrls: ['./simulation.component.scss']
})
export class SimulationComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas') private readonly canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() gameMap!: GameMap;

  private readonly rlAgentService = inject(ReinforcementLearningAgentService);
  private readonly gameService = inject(GameService);
  private readonly ngZone = inject(NgZone);
  readonly router = inject(Router);

  private readonly destroyed$ = new Subject<void>();
  readonly gameOver$ = this.gameService.gameOver$;
  private gameOverSubscription: any;

  private ctx!: CanvasRenderingContext2D;
  private animationFrame = 0;
  private cellSize = 0;

  private episodeSamples: EpisodeSample[] = [];
  private currentSampleIndex = 0;

  private readonly MOVE_DELAY_MS = 225;
  private isTransitioning = false;
  gameStarted: boolean = false;
  private lastMoveTime = 0;

  ghosts: Ghost[] = [];
  dots: Dot[] = [];
  pacman!: Pacman;

  selectedAgent: AgentInfo | null = null;
  checkpointsLoaded: boolean = false;
  agentList: AgentInfo[] = [];
  currentCheckpoint: number = 0;

  ngOnInit(): void {
    if (!this.gameMap) {
      this.gameMap = new GameMap(GAME_MAP);
    }
    
    this.cellSize = this.calculateInitialCellSize();
    this.initializeGameEntities();
    this.loadAgentList();
    
    this.gameOverSubscription = this.gameOver$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe(isGameOver => {
      if (isGameOver && !this.isTransitioning && this.gameStarted) {
        this.isTransitioning = true;

        setTimeout(() => {
          if (this.selectedAgent && this.currentCheckpoint < this.selectedAgent.checkpoints - 1)
            this.loadNextCheckpoint();
        }, 2000);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.complete();
    this.destroyed$.next();
    this.stopGameLoop();
    
    if (this.gameOverSubscription) this.gameOverSubscription.unsubscribe();
  }

  get score$(): Observable<number> {
    return this.gameService.score$;
  }

  startSimulation(): void {
    if (this.selectedAgent) {
      this.gameStarted = true;
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.initializeCanvas();
          this.loadAllCheckpoints();
        });
      });
    }
  }

  private loadAgentList(): void {
    this.rlAgentService.getAvailableAgents().pipe(
      takeUntil(this.destroyed$)
    ).subscribe({
      next: (agents: AgentInfo[]) => {
        this.agentList = agents;
        if (this.agentList.length > 0) {
          this.selectedAgent = this.agentList[0];
        }
      },
      error: (error) => {
        console.error('Error loading agents:', error);
      }
    });
  }

  private loadAllCheckpoints(): void {
    if (this.selectedAgent) {
      this.currentCheckpoint = 0;
      this.checkpointsLoaded = false;

      if (this.selectedAgent.checkpoints > 0) {
        this.resetGameState();
        this.loadCheckpointData(0);
        this.checkpointsLoaded = true;
      } else {
        console.error('No checkpoints found for this agent');
      }
    }
  }

  loadPreviousCheckpoint(): void {
    if (this.selectedAgent && this.currentCheckpoint > 0) {
      this.stopGameLoop();
      this.resetGameState();

      this.currentCheckpoint--;
      this.loadCheckpointData(this.currentCheckpoint);
    }
  }

  loadNextCheckpoint(): void {
    this.currentCheckpoint++;
    this.stopGameLoop();
    
    if (this.selectedAgent && this.currentCheckpoint < this.selectedAgent.checkpoints) {
      this.resetGameState();
      this.loadCheckpointData(this.currentCheckpoint);
    }
  }

  private resetGameState(): void {
    this.gameMap = new GameMap(GAME_MAP);
    
    this.gameService.resetGame();
    this.initializeGameEntities();
    
    this.currentSampleIndex = 0;
    this.isTransitioning = false;
  }

  private loadCheckpointData(checkpoint: number): void {
    if (!this.selectedAgent) return;
    
    this.rlAgentService.getEpisode(this.selectedAgent.model_name, checkpoint).pipe(
      takeUntil(this.destroyed$)
    ).subscribe({
      next: (samples: EpisodeSample[]) => {
        this.episodeSamples = samples;
        this.currentSampleIndex = 0;
        
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.lastMoveTime = performance.now();
            this.startGameLoop();
          }, 500);
        });
      },
      error: (error) => {
        console.error(`Error loading checkpoint ${checkpoint}:`, error);
        this.isTransitioning = false;
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
  }

  private calculateInitialCellSize(): number {
    const {innerWidth: width, innerHeight: height} = window;
    const gridRatio = this.gameMap.width / this.gameMap.height;
    const windowRatio = width / height;

    return Math.floor(
      windowRatio > gridRatio
        ? (height * 0.75) / this.gameMap.height
        : (width * 0.75) / this.gameMap.width
    );
  }

  private initializeCanvas(): void {
    if (!this.canvasRef) {
      setTimeout(() => this.initializeCanvas(), 100);
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    this.resizeCanvas(canvas);
    
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = true;
  }

  private resizeCanvas(canvas: HTMLCanvasElement): void {
    canvas.width = this.gameMap.width * this.cellSize;
    canvas.height = this.gameMap.height * this.cellSize;
  }

  private checkCollisions(currentTime: number): void {
    if (this.isTransitioning || this.gameService.isGameOver) return;
    
    this.checkDotCollision(currentTime);
    this.checkGhostCollision(currentTime);
    
    if (this.currentSampleIndex >= this.episodeSamples.length && !this.isTransitioning)
      this.gameService.gameOver();
  }

  private checkDotCollision(currentTime: number): void {
    const pacmanPosition = {
      x: Math.round(this.pacman.gridX),
      y: Math.round(this.pacman.gridY)
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

      if ((gridCollision || physicalCollision) && !this.isTransitioning && !this.gameService.isGameOver) {
        if (ghost.isFrightened()) {
          this.gameService.eatGhost();
          ghost.onEaten(currentTime);
        } else {
          this.stopGameLoop();
          this.gameService.gameOver();
        }
      }
    });
  }

  private checkPhysicalCollision(ghost: Ghost): boolean {
    const dx = (this.pacman.displayX + this.cellSize / 2) - (ghost.displayX + this.cellSize / 2);
    const dy = (this.pacman.displayY + this.cellSize / 2) - (ghost.displayY + this.cellSize / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < this.cellSize / 2;
  }

  private render(currentTime: number): void {
    if (!this.ctx) return;
    
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
    this.stopGameLoop();
    
    const gameLoop = (timestamp: number) => {
      if (this.gameService.isGameOver && !this.isTransitioning) {
        // Render one last frame to ensure game state is visible, but don't schedule another animation frame 
        this.render(timestamp);
        return;
      }
      
      this.updateGameState(timestamp);
      this.render(timestamp);

      this.animationFrame = requestAnimationFrame(gameLoop);
    };
  
    this.lastMoveTime = performance.now();
    this.animationFrame = requestAnimationFrame(gameLoop);
  }

  private stopGameLoop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
  }

  private updateGameState(currentTime: number): void {
    if (this.gameService.isGameOver && !this.isTransitioning) return;

    if (this.episodeSamples.length > 0 && this.currentSampleIndex < this.episodeSamples.length) {
      if (currentTime - this.lastMoveTime >= this.MOVE_DELAY_MS) {
        const sample = this.episodeSamples[this.currentSampleIndex];
  
        this.pacman.nextDirection = {
          x: sample.pacman[0] - this.pacman.gridX,
          y: sample.pacman[1] - this.pacman.gridY
        };
  
        sample.ghosts.forEach(ghostData => {
          const ghost = this.ghosts.find(ghost => Number(ghost.type) === ghostData[2]);
          if (ghost) {
            ghost.direction = {
              x: ghostData[0] - ghost.gridX,
              y: ghostData[1] - ghost.gridY,
            };
          }
        });
  
        this.currentSampleIndex++;
        this.lastMoveTime = currentTime;
      }
    }
  
    this.pacman.update(currentTime);
    this.ghosts.forEach(ghost => ghost.update(currentTime, {
      pacmanPosition: {x: this.pacman.gridX, y: this.pacman.gridY},
      ghostPositions: this.ghosts.map(g => ({ x: g.gridX, y: g.gridY, type: g.type} as GhostPosition)),
      gameMap: this.gameMap,
    }));
  
    this.checkCollisions(currentTime);
  }

  compareAgents(a: AgentInfo | null, b: AgentInfo | null): boolean {
    return (
      a?.model_name === b?.model_name &&
      a?.checkpoints === b?.checkpoints &&
      JSON.stringify(a?.description) === JSON.stringify(b?.description)
    );
  }

  continueSimulation() {
    this.gameMap = new GameMap(GAME_MAP);

    this.initializeGameEntities();
    this.gameService.resetGame();
  }

  formatDescription(description?: Record<string, any>): string {
    if (!description || Object.keys(description).length === 0) {
      return '{}';
    }
  
    try {
      return JSON.stringify(description, null, 2);
    } catch (error) {
      console.error('Error formatting description:', error);
      return '{}';
    }
  }
}