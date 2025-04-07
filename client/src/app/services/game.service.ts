import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private gameOverSubject = new BehaviorSubject<boolean>(false);
  private scoreSubject = new BehaviorSubject<number>(0);

  private ghostStreak = 200;

  score$ = this.scoreSubject.asObservable();
  gameOver$ = this.gameOverSubject.asObservable();

  private updateScore(points: number) {
    this.scoreSubject.next(this.scoreSubject.value + points);
  }

  get isGameOver(): boolean {
    return this.gameOverSubject.value;
  }

  eatDot() {
    this.updateScore(10);
  }

  eatPowerPellet() {
    this.updateScore(50);
    this.resetGhostStreak();
  }

  eatGhost() {
    this.updateScore(this.ghostStreak);
    this.ghostStreak *= 2;
  }

  resetGhostStreak() {
    this.ghostStreak = 200;
  }

  gameOver() {
    this.gameOverSubject.next(true);
  }

  resetGame() {
    this.gameOverSubject.next(false);
    this.scoreSubject.next(0);
    this.ghostStreak = 200;
  }
}