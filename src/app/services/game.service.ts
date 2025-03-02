import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private gameOverSubject = new BehaviorSubject<boolean>(false);
  private scoreSubject = new BehaviorSubject<number>(0);

  score$ = this.scoreSubject.asObservable();
  gameOver$ = this.gameOverSubject.asObservable();

  updateScore(points: number) {
    this.scoreSubject.next(this.scoreSubject.value + points);
  }

  gameOver() {
    this.gameOverSubject.next(true);
  }

  resetGame() {
    window.location.reload();
  }
}
