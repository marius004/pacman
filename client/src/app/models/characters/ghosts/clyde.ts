import {Direction, GameState} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {GhostType} from '../ghost-type';
import {Ghost} from '../ghost';

export class Clyde extends Ghost {
    constructor(x: number, y: number, gameMap: GameMap, cellSize: number, simulationMode: boolean) {
        super(GhostType.CLYDE, x, y, gameMap, cellSize, simulationMode);
    }

    protected selectChaseDirection(gameState: GameState): Direction {
        const distanceToPacman = Math.sqrt(
            Math.pow(this.gridX - gameState.pacmanPosition.x, 2) + 
            Math.pow(this.gridY - gameState.pacmanPosition.y, 2)
        );

        return distanceToPacman > 8 
            ? this.getDirectionTowards(gameState, gameState.pacmanPosition) 
            : this.getDirectionTowards(gameState, this.scatterTarget);
    }
}