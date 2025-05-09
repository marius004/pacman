import {GAME_MAP, GhostInfo} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
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
  private lastFrameTime: number = 0;
  private animationFrame = 0;
  private cellSize = 0;

  private episodeSamples: EpisodeSample[] = [];
  private currentSampleIndex = 0;

  private readonly MOVE_DELAY_MS = 225;
  private isTransitioning = false;
  private lastMoveTime = 0;
  
  ghosts: Ghost[] = [];
  dots: Dot[] = [];
  pacman!: Pacman;
  
  gameStarted: boolean = false;
  isLoading: boolean = false;
  
  currentCheckpoint: number = 0;
  currentPlotIndex: number = 0;
  currentScore: number = 0;

  selectedAgent: AgentInfo | null = null;
  checkpointsLoaded: boolean = false;
  agentList: AgentInfo[] = [];

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
    
    if (this.gameOverSubscription)
      this.gameOverSubscription.unsubscribe();
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
        if (this.agentList.length > 0)
          this.selectedAgent = this.agentList[0];
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
    
    this.isLoading = true;

    this.rlAgentService.getEpisode(this.selectedAgent.model_name, checkpoint).pipe(
      takeUntil(this.destroyed$)
    ).subscribe({
      next: (samples: EpisodeSample[]) => {
        this.episodeSamples = samples;
        this.currentSampleIndex = 0;
        
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.isLoading = false;
            this.lastMoveTime = performance.now();
            this.startGameLoop();
          }, 500);
        });
      },
      error: (error) => {
        console.error(`Error loading checkpoint ${checkpoint}:`, error);
        this.isTransitioning = false;
        this.isLoading = false;
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
      if (!this.lastFrameTime) this.lastFrameTime = timestamp;
      this.lastFrameTime = timestamp;

      if (this.gameService.isGameOver && !this.isTransitioning) {
        this.render(timestamp);
        return;
      }
      
      this.updateGameState(timestamp);
      this.render(timestamp);

      this.animationFrame = requestAnimationFrame(gameLoop);
    };
    
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
    
    this.pacman.updatePosition(currentTime);
    this.ghosts.forEach(ghost => ghost.updatePosition(currentTime));
    
    if (this.episodeSamples.length > 0 && this.currentSampleIndex < this.episodeSamples.length) {
      const sample = this.episodeSamples[this.currentSampleIndex];
        
      if (currentTime - this.lastMoveTime >= this.MOVE_DELAY_MS) {
        this.pacman.updateFromServerData(
          sample.pacman.x,
          sample.pacman.y,
          {
            x: sample.pacman.x - this.pacman.gridX,
            y: sample.pacman.y - this.pacman.gridY
          },
          currentTime
        );

        sample.ghosts.forEach(ghostData => {
          const ghost = this.ghosts.find(ghost => Number(ghost.type) === ghostData.type);
          if (ghost) {
            ghost.update(currentTime, {
              pacmanPosition: {x: sample.pacman.x, y: sample.pacman.y},
              ghostsInfo: sample.ghosts as GhostInfo[],
              gameMap: this.gameMap,
            });
          }
        });

        this.dots = this.dots.filter(dot => {
          if (dot.gridX === this.pacman.gridX && dot.gridY === this.pacman.gridY) {
            this.gameMap.setCell(dot.gridX, dot.gridY, CellType.Empty);
            return false;
          }
          return true;
        });

        this.lastMoveTime = currentTime;
        this.currentSampleIndex++;

        this.ngZone.run(() => {
          this.currentScore = sample.score;
        });

        if (this.dots.length === 0) {
          this.gameMap = new GameMap(GAME_MAP);
          this.initializeGameEntities();
        } else if (sample.game_over) {
          this.gameService.gameOver();
        }
      }
    }
  }

  compareAgents(a: AgentInfo | null, b: AgentInfo | null): boolean {
    return a?.model_name === b?.model_name;
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

  getPlotImageUrl(): string {
    if (!this.selectedAgent) return '';
    return this.rlAgentService.getPlot(this.selectedAgent.model_name, this.currentPlotIndex);
  }

  nextPlot(): void {
    if (this.selectedAgent && this.currentPlotIndex < this.selectedAgent.plots - 1) {
      this.currentPlotIndex++;
    }
  }
  
  prevPlot(): void {
    if (this.currentPlotIndex > 0) {
      this.currentPlotIndex--;
    }
  }
}