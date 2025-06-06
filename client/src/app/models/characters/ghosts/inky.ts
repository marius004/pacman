import {Direction, GameState} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {GhostType} from '../ghost-type';
import {Ghost} from '../ghost';

export class Inky extends Ghost {
    constructor(x: number, y: number, gameMap: GameMap, cellSize: number, simulationMode: boolean) {
        super(GhostType.INKY, x, y, gameMap, cellSize, simulationMode);
    }

    protected selectChaseDirection(gameState: GameState): Direction {
        const blinky = gameState.ghostsInfo.find(ghost => ghost.type === GhostType.BLINKY);
        if (blinky) {
            const target = {
                x: gameState.pacmanPosition.x + (gameState.pacmanPosition.x - blinky.x),
                y: gameState.pacmanPosition.y + (gameState.pacmanPosition.y - blinky.y)
            };
            return this.getDirectionTowards(gameState, target);
        }

        return this.getValidRandomDirection();        
    }
}