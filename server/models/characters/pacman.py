from models.map.game_map import GameMap
from models.interfaces import Direction

import numpy as np

class Pacman:
    def __init__(self, game_map: GameMap, x: int, y: int, cell_size: int):
        self.game_map = game_map
        self.cell_size = cell_size
        self.is_game_over = False
        
        self.gridX = x
        self.gridY = y
        
        self.displayX = x * cell_size
        self.displayY = y * cell_size
        
        self.next_direction = Direction(0, 0)
        self.direction = Direction(0, 0)

        self.is_moving = False
        self.moved = False
        
        self.last_move_time = 0
        self.angle = 0
    
    def update(self, current_time: int, move_interval: int = 225) -> bool:
        if self.is_game_over:
            return False
        
        movement_made = self._update_display_position()
        
        if current_time - self.last_move_time < move_interval:
            return False
        
        if self._try_change_direction():
            pass
        elif self._handle_teleport():
            self.last_move_time = current_time + 250
            return True
        
        return self._move_in_current_direction(current_time)
    
    def _update_display_position(self) -> bool:
        targetX = self.gridX * self.cell_size
        targetY = self.gridY * self.cell_size
        
        self.is_moving = (
            abs(self.displayX - targetX) > 0.1 or
            abs(self.displayY - targetY) > 0.1 or
            (self.direction.x != 0 or self.direction.y != 0)
        )
        
        self.displayX += (targetX - self.displayX) * 0.1
        self.displayY += (targetY - self.displayY) * 0.1
        
        return self.is_moving
    
    def _try_change_direction(self) -> bool:
        nextX = self.gridX + self.next_direction.x
        nextY = self.gridY + self.next_direction.y
        
        if self.game_map.is_walkable(nextX, nextY):
            self.direction = Direction(self.next_direction.x, self.next_direction.y)
            return True
        
        return False
    
    def _move_in_current_direction(self, current_time: int) -> bool:
        newX = self.gridX + self.direction.x
        newY = self.gridY + self.direction.y
        
        if self.game_map.is_walkable(newX, newY):
            self.last_move_time = current_time
            self.gridX = newX
            self.gridY = newY
            
            if not self.moved and (self.direction.x != 0 or self.direction.y != 0):
                self.moved = True
            
            self._update_angle()            
            return True

        return False
    
    def _update_angle(self):
        if self.direction.x == 1:
            self.angle = 0
        elif self.direction.x == -1:
            self.angle = np.pi
        elif self.direction.y == 1:
            self.angle = np.pi / 2
        elif self.direction.y == -1:
            self.angle = -np.pi / 2
    
    def _handle_teleport(self) -> bool:
        teleport_points = self.game_map.get_teleport_points()
        if not teleport_points or len(teleport_points) < 2:
            return False
        
        point_a, point_b = teleport_points[0], teleport_points[1]
        
        if (self.gridX, self.gridY) == (point_a[0], point_a[1]):
            self.gridX, self.gridY = point_b[0], point_b[1]
            return True
        elif (self.gridX, self.gridY) == (point_b[0], point_b[1]):
            self.gridX, self.gridY = point_a[0], point_a[1]
            return True
            
        return False
    
    def set_direction(self, direction: Direction):
        self.next_direction = direction
    
    def set_game_over(self):
        self.next_direction = Direction(0, 0)
        self.is_game_over = True