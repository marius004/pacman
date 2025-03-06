import {Direction, GameState} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {GhostType} from '../ghost-type';
import {Ghost} from '../ghost';

export class Inky extends Ghost {
    constructor(x: number, y: number, gameMap: GameMap, cellSize: number) {
        super(GhostType.INKY, x, y, gameMap, cellSize);
    }

    protected selectChaseDirection(gameState: GameState): Direction {
        const blinky = gameState.ghostPositions.find(ghost => ghost.type === GhostType.BLINKY);
        if (blinky) {
            const target = {
                x: gameState.pacmanPosition.x + (gameState.pacmanPosition.x - blinky.x),
                y: gameState.pacmanPosition.y + (gameState.pacmanPosition.y - blinky.y)
            };
            return this.getDirectionTowards(target);
        }

        return this.getRandomDirection();        
    }

    override canPassDoor(): boolean {
        return !this.exitedRoom;
    }
}