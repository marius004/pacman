from models.map.game_map import GameMap
from models.interfaces import Direction

import numpy as np

class Pacman:
    def __init__(self, game_map: GameMap, x: int, y: int):
        self.is_game_over = False
        self.game_map = game_map
        self.last_move_time = 0
        
        self.gridX = x
        self.gridY = y
        
        self.next_direction = Direction(0, 0)
        self.direction = Direction(0, 0)
    
    def update(self, current_time: int, move_interval: int = 225) -> bool:
        if self.is_game_over:
            return False
        
        if current_time - self.last_move_time < move_interval:
            return False

        if self.game_map.is_walkable(self.gridX + self.next_direction.x, self.gridY + self.next_direction.y):
            self.direction = Direction(self.next_direction.x, self.next_direction.y)
        else:
            teleport_points = self.game_map.get_teleport_points()
            if not teleport_points or len(teleport_points) < 2:
                return False
        
            point_a, point_b = teleport_points[0], teleport_points[1]
            if (self.gridX, self.gridY) == (point_a[0], point_a[1]):
                self.gridX, self.gridY = point_b[0], point_b[1]
                self.last_move_time = current_time + 250    
                return True
            elif (self.gridX, self.gridY) == (point_b[0], point_b[1]):
                self.gridX, self.gridY = point_a[0], point_a[1]
                self.last_move_time = current_time + 250
                return True
            
        nextX = self.gridX + self.direction.x
        nextY = self.gridY + self.direction.y
        if self.game_map.is_walkable(nextX, nextY):
            self.last_move_time = current_time
    
            self.gridX = nextX
            self.gridY = nextY
        
            return True
        
        return False
    
    def set_direction(self, direction: Direction):
        self.next_direction = direction
    
    def set_game_over(self):
        self.next_direction = Direction(0, 0)
        self.is_game_over = True