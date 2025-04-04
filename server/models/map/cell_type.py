from enum import IntEnum

class CellType(IntEnum):
    Dot = 0
    Wall = 1
    Empty = 2
    PowerPellet = 3
    Door = 4
    GhostCell = 5