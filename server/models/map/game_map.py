from models.interfaces import CellType, Dot
from typing import List, Optional, Tuple

class GameMap:
    def __init__(self, map_data: List[List[int]]):
        self.grid = [[CellType(cell) for cell in row] for row in map_data]
        self.width = len(self.grid[0]) if self.grid else 0
        self.height = len(self.grid)
    
    def get_cell(self, x: int, y: int) -> Optional[CellType]:
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.grid[y][x]
        return None
    
    def set_cell(self, x: int, y: int, cell_type: CellType):
        if 0 <= x < self.width and 0 <= y < self.height:
            self.grid[y][x] = cell_type
    
    def is_walkable(self, x: int, y: int, can_pass_door: bool = False) -> bool:
        cell = self.get_cell(x, y)
        
        if cell == CellType.Door:
            return can_pass_door
            
        return cell != CellType.Wall
    
    def get_dots(self) -> List[Dot]:
        dots = []
        
        for y in range(self.height):
            for x in range(self.width):
                cell = self.grid[y][x]
                
                if cell in [CellType.Dot, CellType.PowerPellet]:
                    dots.append(Dot(x, y, cell))
                    
        return dots
    
    def get_teleport_points(self) -> List[Tuple[int, int]]:
        points = []
        
        for y in range(self.height):
            for x in [0, self.width - 1]:
                cell = self.get_cell(x, y)
                
                if cell in [CellType.Empty, CellType.Dot, CellType.PowerPellet]:
                    points.append((x, y))
                    
        return points