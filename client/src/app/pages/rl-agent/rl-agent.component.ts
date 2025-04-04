import {SimulationComponent} from '@components/simulation/simulation.component';
import {Component} from '@angular/core';
import {GameMap} from '@models/map/game-map';
import {GAME_MAP} from '@models/interfaces';

@Component({
  selector: 'app-rl-agent',
  imports: [SimulationComponent],
  templateUrl: './rl-agent.component.html',
  styleUrl: './rl-agent.component.scss'
})
export class RLAgentComponent {
  gameMap = new GameMap(GAME_MAP);
}
