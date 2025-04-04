import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private gameOverSubject = new BehaviorSubject<boolean>(false);
  private scoreSubject = new BehaviorSubject<number>(0);
  private livesSubject = new BehaviorSubject<number>(3);

  private ghostStreak = 200;

  score$ = this.scoreSubject.asObservable();
  gameOver$ = this.gameOverSubject.asObservable();
  lives$ = this.livesSubject.asObservable();

  private updateScore(points: number) {
    this.scoreSubject.next(this.scoreSubject.value + points);
  }

  get currentLives(): number {
    return this.livesSubject.value;
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

  loseLife() {
    const livesLeft = this.livesSubject.value - 1;
    this.livesSubject.next(Math.max(livesLeft, 0));

    if (livesLeft <= 0) {
      this.gameOverSubject.next(true);
    }
  }

  resetGame() {
    window.location.reload();
  }
}
