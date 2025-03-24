import {BoardComponent} from '@components/board/board.component';
import {GameMap} from '@models/map/game-map';
import {GAME_MAP} from '@models/interfaces';
import {Component} from '@angular/core';

@Component({
  selector: 'app-play-game',
  imports: [BoardComponent],
  templateUrl: './play-game.component.html',
  styleUrl: './play-game.component.scss'
})
export class PlayGameComponent {
  gameMap = new GameMap(GAME_MAP);
}
