from models.map.cell_type import CellType
from dataclasses import dataclass

class Direction:
    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y
    
    def __eq__(self, other):
        return self.x == other.x and self.y == other.y
    
    def __hash__(self):
        return hash((self.x, self.y))
    
@dataclass
class Dot:
    gridX: int
    gridY: int
    type: CellType