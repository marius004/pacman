import {Direction, GameState} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {GhostType} from '../ghost-type';
import {Ghost} from '../ghost';

export class Blinky extends Ghost {
    constructor(x: number, y: number, gameMap: GameMap, cellSize: number, simulationMode: boolean) {
        super(GhostType.BLINKY, x, y, gameMap, cellSize, simulationMode);
    }

    protected selectChaseDirection(gameState: GameState): Direction {
        return this.getDirectionTowards(gameState, gameState.pacmanPosition);
    }
}