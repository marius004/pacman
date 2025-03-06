import {Direction, GameState} from '@models/interfaces';
import {GameMap} from '@models/map/game-map';
import {GhostType} from '../ghost-type';
import {Ghost} from '../ghost';

export class Pinky extends Ghost {
    constructor(x: number, y: number, gameMap: GameMap, cellSize: number) {
        super(GhostType.PINKY, x, y, gameMap, cellSize);
    }

    protected selectChaseDirection(gameState: GameState): Direction {
        return this.getDirectionTowards({
            x: gameState.pacmanPosition.x + 4,
            y: gameState.pacmanPosition.y
        });
    }

    override canPassDoor(): boolean {
        return !this.exitedRoom;
    }
}