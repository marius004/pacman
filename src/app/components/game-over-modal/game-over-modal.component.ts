import {GameService} from '@services/game.service';
import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-game-over-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-over-modal.component.html',
  styleUrls: ['./game-over-modal.component.scss']
})
export class GameOverModalComponent {
  private readonly gameService = inject(GameService);

  get score$() {
    return this.gameService.score$;
  }

  restartGame(): void {
    this.gameService.resetGame();
  }
}
