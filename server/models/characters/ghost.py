from models.interfaces import Direction, CellType
from pacman_constants import DIRECTION_MAP
from models.map.game_map import GameMap
from typing import Tuple
from enum import Enum

import numpy as np

class GhostType(Enum):
    BLINKY = 0
    PINKY = 1
    CLYDE = 2
    INKY = 3

class GhostState(Enum):
    FRIGHTENED = 0
    SCATTER = 1
    CHASE = 2

class Ghost:
    def __init__(self, ghost_type: GhostType, x: int, y: int, game_map: GameMap, cell_size: int):
        self.state = GhostState.SCATTER
        self.type = ghost_type
        
        self.cell_size = cell_size
        self.is_game_over = False
        self.game_map = game_map
        
        self.gridX = x
        self.gridY = y
        
        self.displayX = x * cell_size
        self.displayY = y * cell_size
        
        self.next_direction = Direction(0, 0)
        self.direction = Direction(0, 0)
        self.is_moving = False
        
        self.move_interval = 225 * 1.3
        self.last_state_change = 0
        self.last_move_time = 0
        
        self.scatter_target = self._get_scatter_target()
        self.exited_room = False
        self.cycle_index = 0
    
    def update(self, current_time: int, game_state: dict):
        if self.is_game_over:
            return
        
        if not self._update_position(current_time):
            return
        
        self._handle_state_transition(current_time)
        self._update_speed(current_time)
        self._check_door_exit()
        
        self._determine_move_direction(game_state)
        
        self._move_ghost(current_time)
    
    def _update_position(self, current_time: int) -> bool:
        if self.is_game_over:
            return False
        
        targetX = self.gridX * self.cell_size
        targetY = self.gridY * self.cell_size
        
        self.is_moving = (
            abs(self.displayX - targetX) > 0.1 or 
            abs(self.displayY - targetY) > 0.1 or 
            (self.direction.x != 0 or self.direction.y != 0)
        )
        
        if current_time - self.last_move_time < self.move_interval:
            self.displayX += (targetX - self.displayX) * 0.1
            self.displayY += (targetY - self.displayY) * 0.1
            return False
            
        return True
    
    def _check_door_exit(self):
        if self.game_map.get_cell(self.gridX, self.gridY) == CellType.Door:
            next_cell = self.game_map.get_cell(
                self.gridX + self.direction.x, 
                self.gridY + self.direction.y
            )
            self.exited_room = next_cell != CellType.GhostCell
    
    def _determine_move_direction(self, game_state: dict):
        if self.state == GhostState.SCATTER:
            self.direction = self._get_direction_towards(game_state, self.scatter_target)
        elif self.state == GhostState.CHASE:
            self.direction = self._select_chase_direction(game_state)
        else:  # FRIGHTENED
            self.direction = self._get_valid_random_direction()
        
        # If direction is invalid, choose a random valid one
        if not self._is_valid_position(self.gridX + self.direction.x, self.gridY + self.direction.y):
            self.direction = self._get_valid_random_direction()
    
    def _is_valid_position(self, x: int, y: int) -> bool:
        if not (0 <= x < self.game_map.width and 0 <= y < self.game_map.height):
            return False
        
        if not self.game_map.is_walkable(x, y, self._can_pass_door()):
            return False
        
        valid_directions = [
            d for d in DIRECTION_MAP 
            if self.game_map.is_walkable(self.gridX + d.x, self.gridY + d.y, self._can_pass_door())
        ]
        
        # If only one valid direction, allow it even if it's going back
        if len(valid_directions) == 1:
            return True
        
        # Prevent turning around
        is_opposite_direction = (
            x == self.gridX - self.direction.x and 
            y == self.gridY - self.direction.y
        )
        
        return not is_opposite_direction
    
    def _can_pass_door(self) -> bool:
        return not self.exited_room
    
    def _move_ghost(self, current_time: int):
        newX = self.gridX + self.direction.x
        newY = self.gridY + self.direction.y
        
        if self._is_valid_position(newX, newY):
            self.last_move_time = current_time
            self.gridX = newX
            self.gridY = newY
    
    def _handle_state_transition(self, current_time: int):
        scatter_chase_cycle = [7000, 20000, 7000, 20000, 5000, 20000, 5000, float('inf')]
        since_last_change = current_time - self.last_state_change
        
        if self.state == GhostState.FRIGHTENED and since_last_change > 7000:
            self.state = GhostState.CHASE
            self.last_state_change = current_time
            return
        
        if since_last_change > scatter_chase_cycle[self.cycle_index]:
            self.state = GhostState.SCATTER if self.state == GhostState.CHASE else GhostState.CHASE
            self.cycle_index = min(self.cycle_index + 1, len(scatter_chase_cycle) - 1)
            self.last_state_change = current_time
    
    def _update_speed(self, current_time: int):
        if self.state == GhostState.FRIGHTENED:
            self.move_interval = 225 * 1.3 * 0.8  # Slower when frightened
            return
        
        # Increase speed over time
        speed_increase_interval = 10000
        speed_increase = min(np.floor(current_time / speed_increase_interval) * 0.05, 0.15)
        self.move_interval = 225 * max(1.3 - speed_increase, 1.15)
    
    def _get_scatter_target(self) -> Tuple[int, int]:
        scatter_targets = {
            GhostType.INKY: (self.game_map.width - 1, self.game_map.height - 1),
            GhostType.BLINKY: (self.game_map.width - 1, 0),
            GhostType.CLYDE: (0, self.game_map.height - 1),
            GhostType.PINKY: (0, 0)
        }
        return scatter_targets[self.type]
    
    def _get_direction_towards(self, game_state: dict, target: Tuple[int, int]) -> Direction:
        width, height = self.game_map.width, self.game_map.height
        targetX, targetY = target
        
        targetX = max(0, min(targetX, width - 1))
        targetY = max(0, min(targetY, height - 1))
        
        queue = [(self.gridX, self.gridY)]
        cost = [[None for _ in range(height)] for _ in range(width)]
        cost[self.gridX][self.gridY] = {'distance': 0, 'parent': None}
        
        closest = {
            'x': self.gridX,
            'y': self.gridY,
            'distance': abs(self.gridX - targetX) + abs(self.gridY - targetY)
        }
        
        while queue:
            x, y = queue.pop(0)
            distance = abs(x - targetX) + abs(y - targetY)
            
            if distance < closest['distance']:
                closest = {'x': x, 'y': y, 'distance': distance}
            
            if x == targetX and y == targetY:
                break
            
            for direction in DIRECTION_MAP:
                nx, ny = x + direction.x, y + direction.y
                
                if not self._is_valid_position(nx, ny) or cost[nx][ny] is not None:
                    continue
                
                cost[nx][ny] = {
                    'distance': cost[x][y]['distance'] + 1,
                    'parent': (-direction.x, -direction.y)
                }
                queue.append((nx, ny))
        
        return self._trace_back_direction(cost, closest['x'], closest['y'])
    
    def _trace_back_direction(self, cost, x: int, y: int) -> Direction:
        while cost[x][y] and cost[x][y]['parent']:
            parent_dx, parent_dy = cost[x][y]['parent']
            px, py = x + parent_dx, y + parent_dy
            
            if px == self.gridX and py == self.gridY:
                return Direction(x - px, y - py)
            
            x, y = px, py
        
        return self._get_valid_random_direction()
    
    def _get_valid_random_direction(self) -> Direction:
        valid_directions = [
            direction for direction in DIRECTION_MAP
            if self._is_valid_position(self.gridX + direction.x, self.gridY + direction.y)
        ]
        
        if valid_directions:
            return valid_directions[np.random.choice(len(valid_directions))]
        return self.direction
    
    def _select_chase_direction(self, game_state: dict) -> Direction:
        return self._get_valid_random_direction()
    
    def enter_frightened_state(self, current_time: int):
        self.state = GhostState.FRIGHTENED
        self.last_state_change = current_time
    
    def on_eaten(self, current_time: int):
        self.last_state_change = current_time
        self.state = GhostState.SCATTER
        
        respawn_points = {
            GhostType.BLINKY: (9, 9),
            GhostType.PINKY: (9, 9),
            GhostType.INKY: (10, 9),
            GhostType.CLYDE: (8, 9)
        }
        
        self.gridX, self.gridY = respawn_points[self.type]
        self.exited_room = False
    
    def is_frightened(self) -> bool:
        return self.state == GhostState.FRIGHTENED
    
    def set_game_over(self):
        self.is_game_over = True
        self.next_direction = Direction(0, 0)


class Blinky(Ghost):
    def __init__(self, x: int, y: int, game_map: GameMap, cell_size: int):
        super().__init__(GhostType.BLINKY, x, y, game_map, cell_size)
    
    def _select_chase_direction(self, game_state: dict) -> Direction:
        pacman_pos = game_state['pacman_position']
        return self._get_direction_towards(game_state, (pacman_pos['x'], pacman_pos['y']))


class Pinky(Ghost):
    def __init__(self, x: int, y: int, game_map: GameMap, cell_size: int):
        super().__init__(GhostType.PINKY, x, y, game_map, cell_size)
    
    def _select_chase_direction(self, game_state: dict) -> Direction:
        pacman_pos = game_state['pacman_position']
        return self._get_direction_towards(game_state, (pacman_pos['x'] + 4, pacman_pos['y']))


class Inky(Ghost):
    def __init__(self, x: int, y: int, game_map: GameMap, cell_size: int):
        super().__init__(GhostType.INKY, x, y, game_map, cell_size)
    
    def _select_chase_direction(self, game_state: dict) -> Direction:
        pacman_pos = game_state['pacman_position']
        ghost_positions = game_state['ghost_positions']
        
        blinky = next((g for g in ghost_positions if g['type'] == GhostType.BLINKY), None)
        if blinky:
            target = (
                pacman_pos['x'] + (pacman_pos['x'] - blinky['x']),
                pacman_pos['y'] + (pacman_pos['y'] - blinky['y'])
            )
            return self._get_direction_towards(game_state, target)
        
        return self._get_valid_random_direction()


class Clyde(Ghost):
    def __init__(self, x: int, y: int, game_map: GameMap, cell_size: int):
        super().__init__(GhostType.CLYDE, x, y, game_map, cell_size)
    
    def _select_chase_direction(self, game_state: dict) -> Direction:
        pacman_pos = game_state['pacman_position']
        
        distance = np.sqrt(
            (self.gridX - pacman_pos['x'])**2 + 
            (self.gridY - pacman_pos['y'])**2
        )
        
        if distance > 8:
            return self._get_direction_towards(game_state, (pacman_pos['x'], pacman_pos['y']))
        else:
            return self._get_direction_towards(game_state, self.scatter_target)