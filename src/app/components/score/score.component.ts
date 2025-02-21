import {GameService} from '@services/game.service';
import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-score',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './score.component.html',
  styleUrl: './score.component.scss'
})
export class ScoreComponent {
  private readonly gameService = inject(GameService);

  get score$() {
    return this.gameService.score$;
  }
}
