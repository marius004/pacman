import {Direction, GameState} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {GhostType} from '../ghost-type';
import {Ghost} from '../ghost';

export class Pinky extends Ghost {
    constructor(x: number, y: number, gameMap: GameMap, cellSize: number,simulationMode: boolean) {
        super(GhostType.PINKY, x, y, gameMap, cellSize, simulationMode);
    }

    protected selectChaseDirection(gameState: GameState): Direction {
        return this.getDirectionTowards(gameState, {
            x: gameState.pacmanPosition.x + 4,
            y: gameState.pacmanPosition.y
        });
    }
}