from models.characters.ghost import Ghost, Blinky, Inky, Pinky, Clyde
from pacman_constants import GAME_MAP, DIRECTION_MAP
from models.interfaces import CellType, Direction
from models.characters.ghost import GhostState
from models.characters.pacman import Pacman
from models.map.game_map import GameMap

from collections import deque
from gymnasium import spaces
from copy import deepcopy

import gymnasium as gym
import numpy as np

class PacmanEnv(gym.Env):
    def __init__(self):
        super(PacmanEnv, self).__init__()
        
        # Action space: 4 possible moves [up, down, left, right] 
        self.action_space = spaces.Discrete(4)
        
        self._dict_observation_space = spaces.Dict({
            # Pac-Man's position [x, y]  
            'pacman': spaces.Box(low=0, high=19, shape=(2,), dtype=np.int32),
            
            # Ghost: [x, y, type, state, frightened timer, normalized_distance]
            'ghosts': spaces.Box(
                low=np.array([[0, 0, 0, 0, 0, 0]] * 4),
                high=np.array([[19, 19, 3, 2, 7000, 1]] * 4),
                shape=(4, 6),
                dtype=np.float32
            ),
            
            # Power pellet positions [x, y, normalized_distance]  
            'power_pellets': spaces.Box(low=0, high=19, shape=(4,3), dtype=np.float32),
            
            # Closest dots to Pac-Man [x, y, dist]   
            'nearest_dots': spaces.Box(low=0, high=19, shape=(4,3), dtype=np.int32),
            
            # Remaining dots and percentage of dots eaten  
            'dots_left': spaces.Box(low=0, high=240, shape=(1,), dtype=np.int32),
            'dots_eaten_percentage': spaces.Box(low=0, high=1, shape=(1,), dtype=np.float32),
            
            'pacman_legal_moves': spaces.Box(low=0, high=1, shape=(4,), dtype=np.int32),
            'ghost_legal_moves': spaces.Box(
                low=np.array([[0, 0, 0, 0, 0]] * 4),
                high=np.array([[1, 1, 1, 1, 3]] * 4),
                shape=(4,5),
                dtype=np.int32
            ),
        })
        
        flattened_size = spaces.flatten_space(self._dict_observation_space).shape[0]
        self.observation_space = spaces.Box(
            low=-float('inf'), 
            high=float('inf'), 
            shape=(flattened_size,), 
            dtype=np.float32
        )
        
        self.reset()
    
    def reset(self, **kwargs):
        self.game_map = GameMap(deepcopy(GAME_MAP))
        self.pacman = Pacman(self.game_map, 9, 15)
        
        self.total_initial_dots = sum([
            self.game_map.get_cell(i, j) in [CellType.Dot, CellType.PowerPellet]
            for i in range(self.game_map.height)
            for j in range(self.game_map.width)
        ])
        
        self.ghosts = [
            Blinky(9, 8, self.game_map),
            Clyde(8, 9, self.game_map),
            Inky(10, 9, self.game_map),
            Pinky(9, 9, self.game_map)
        ]
        
        self.dots = self.game_map.get_dots()
        self.game_over = False
        self.score  = 0

        self.ghost_streak = 200
        self.current_time = 0
        
        # Store previous position for position change penalty
        self.prev_pacman_pos = (self.pacman.gridX, self.pacman.gridY)
        
        # For detecting oscillation
        self.position_history = deque(maxlen=8)  # Track the last 6 positions
        self.action_history = deque(maxlen=8)    # Track the last 6 actions
        
        return self._flatten_observation(self._get_obs()), self._get_info()
    
    def _flatten_observation(self, obs_dict):
        return np.array([val for key in obs_dict for val in obs_dict[key].flatten()], dtype=np.float32)
    
    def step(self, action: int):
        if self.game_over:
            return self._flatten_observation(self._get_obs()), -250, True, False, self._get_info()
        
        old_score = self.score
        dots_before = len(self.dots)
        
        # Store previous position for position change penalty
        self.prev_pacman_pos = (self.pacman.gridX, self.pacman.gridY)
        
        # Add current action to history
        self.action_history.append(action)
        
        if 0 <= action < len(DIRECTION_MAP):
            self.pacman.next_direction = DIRECTION_MAP[action]
        
        self.current_time += 225
        self.pacman.update(self.current_time)
        
        # Add new position to history
        self.position_history.append((self.pacman.gridX, self.pacman.gridY))
        
        game_state = self._get_game_state()
        for ghost in self.ghosts:
            ghost.update(self.current_time, game_state)
        
        ghost_eaten = False
        self._check_dot_collision()
        ghost_collision, ghost_eaten = self._check_ghost_collision()
        
        level_completed = len(self.dots) == 0
        terminated = self.game_over or level_completed
        truncated = (self.current_time / 225) > 10000
        
        # Reset level if completed
        if level_completed:
            self.game_map = GameMap(deepcopy(GAME_MAP))
            self.pacman = Pacman(self.game_map, 9, 15)
            self.ghosts = [
                Blinky(9, 8, self.game_map),
                Clyde(8, 9, self.game_map),
                Inky(10, 9, self.game_map),
                Pinky(9, 9, self.game_map)
            ]
            self.dots = self.game_map.get_dots()
            self.prev_pacman_pos = (self.pacman.gridX, self.pacman.gridY)
            self.position_history.clear()
            self.action_history.clear()
        
        reward = self._calculate_reward(old_score, ghost_collision, ghost_eaten, terminated)
        obs = self._flatten_observation(self._get_obs())
        
        return obs, reward, terminated, truncated, self._get_info()
    
    def _get_obs(self):
        pacman_pos = np.array([self.pacman.gridX, self.pacman.gridY], dtype=np.int32)
        
        pacman_legal_moves = np.zeros(4, dtype=np.int32)
        for i, direction in enumerate(DIRECTION_MAP):
            next_x = self.pacman.gridX + direction.x
            next_y = self.pacman.gridY + direction.y
            
            teleport_points, is_teleport = self.game_map.get_teleport_points(), False            
            if teleport_points and len(teleport_points) >= 2:
                current_pos = (self.pacman.gridX, self.pacman.gridY)
                if (next_x < 0 or next_x >= self.game_map.width) and current_pos in teleport_points:
                    is_teleport = True
            
            if not self.game_map.get_cell(next_x, next_y) == CellType.Wall or is_teleport:
                pacman_legal_moves[i] = 1
        
        ghosts_legal_moves = np.zeros((4, 5), dtype=np.int32)
        for i, ghost in enumerate(self.ghosts):
            for j, direction in enumerate(DIRECTION_MAP):
                next_x = ghost.gridX + direction.x
                next_y = ghost.gridY + direction.y
                
                if ghost._is_valid_position(next_x, next_y):
                    ghosts_legal_moves[i][j] = 1
        
            ghosts_legal_moves[i][4] = ghost.type.value
        
        ghosts_data = np.zeros((4, 6), dtype=np.float32)
        
        for i, ghost in enumerate(self.ghosts):
            frightened_timer = max(0, 7000 - (self.current_time - ghost.last_state_change)) if ghost.state == GhostState.FRIGHTENED else 0
            
            manhattan_dist = abs(ghost.gridX - self.pacman.gridX) + abs(ghost.gridY - self.pacman.gridY)
            max_possible_dist = self.game_map.width + self.game_map.height
            normalized_dist = min(1.0, manhattan_dist / max_possible_dist)
            
            ghosts_data[i] = [
                ghost.gridX,
                ghost.gridY,
                ghost.type.value,
                ghost.state.value,
                frightened_timer,
                normalized_dist
            ]
        
        power_pellets = np.zeros((4, 3), dtype=np.float32)
        power_pellet_count = 0
        max_possible_dist = self.game_map.width + self.game_map.height
        
        for dot in self.dots:
            if dot.type == CellType.PowerPellet and power_pellet_count < 4:
                manhattan_dist = abs(dot.gridX - self.pacman.gridX) + abs(dot.gridY - self.pacman.gridY)
                normalized_dist = min(1.0, manhattan_dist / max_possible_dist)
                power_pellets[power_pellet_count] = [dot.gridX, dot.gridY, normalized_dist]
                power_pellet_count += 1
        
        dot_distances = []
        
        for dot in self.dots:
            if dot.type == CellType.Dot:
                manhattan_dist = abs(dot.gridX - self.pacman.gridX) + abs(dot.gridY - self.pacman.gridY)
                dot_distances.append((dot.gridX, dot.gridY, manhattan_dist))
        
        dot_distances.sort(key=lambda x: x[2])
        
        nearest_dots = np.zeros((4, 3), dtype=np.int32)
        for i in range(min(4, len(dot_distances))):
            nearest_dots[i] = dot_distances[i]
        
        dots_left = np.array([len(self.dots)], dtype=np.int32)
        dots_eaten_percentage = np.array([1 - len(self.dots) / self.total_initial_dots], dtype=np.float32)
        
        return {
            'pacman': pacman_pos,
            'ghosts': ghosts_data,
            'power_pellets': power_pellets,
            'nearest_dots': nearest_dots,
            'dots_left': dots_left,
            'dots_eaten_percentage': dots_eaten_percentage,
            'pacman_legal_moves': pacman_legal_moves,
            'ghost_legal_moves': ghosts_legal_moves,
        }
        
    def _get_game_state(self):
        return {
            'pacman_position': {
                'x': self.pacman.gridX,
                'y': self.pacman.gridY
            },
            'ghost_positions': [
                {
                    'x': ghost.gridX,
                    'y': ghost.gridY,
                    'type': ghost.type
                }
                for ghost in self.ghosts
            ],
            'game_map': self.game_map
        }
        
    def _check_dot_collision(self):
        pacman_pos = (self.pacman.gridX, self.pacman.gridY)
        
        new_dots = []
        dot_eaten = False
        pellet_eaten = False
        
        for dot in self.dots:
            if (dot.gridX, dot.gridY) == pacman_pos:
                if dot.type == CellType.Dot:
                    self.score += 10
                    dot_eaten = True
                else:
                    self.score += 50
                    pellet_eaten = True
                    self.ghost_streak = 200
                    for ghost in self.ghosts:
                        ghost.enter_frightened_state(self.current_time)
                self.game_map.set_cell(dot.gridX, dot.gridY, CellType.Empty)
            else:
                new_dots.append(dot)
        
        self.dots = new_dots
        
    def _check_ghost_collision(self):
        ghost_collision = False
        ghost_eaten = False
        
        for ghost in self.ghosts:
            if (self.pacman.gridX == ghost.gridX and self.pacman.gridY == ghost.gridY):
                if ghost.is_frightened():
                    self.score += self.ghost_streak
                    self.ghost_streak *= 2
                    ghost.on_eaten(self.current_time)
                    ghost_eaten = True
                else:
                    self.game_over = True
                    self.pacman.set_game_over()
                    for g in self.ghosts:
                        g.set_game_over()
        
        return ghost_collision, ghost_eaten
    
    def _is_oscillation(self):
        if len(self.action_history) < 2:
            return False
            
        opposite_pairs = [(0, 1), (1, 0), (2, 3), (3, 2)]        
        for oscillation_len in range(2, 9, 2):
            if oscillation_len > len(self.action_history):
                return False
            
            last_actions = list(self.action_history)[-oscillation_len:]
            
            first_half  = last_actions[:oscillation_len // 2]
            second_half = last_actions[:oscillation_len // 2:]
            
            is_oscillation = True
            for i in range(len(first_half)): 
                if (first_half[i], second_half[i]) not in opposite_pairs:
                    is_oscillation = False
                    break
                
            if is_oscillation:
                return True
        
        return False
    
    def _calculate_reward(self, old_score, ghost_collision, ghost_eaten, terminated):
        delta = max(self.score - old_score, 0)
        reward = delta
        
        if (self.pacman.gridX, self.pacman.gridY) == self.prev_pacman_pos or self._is_oscillation():
            reward -= 25
        
        if delta == 0:
            reward -= 10
        elif len(self.dots) == 0:
            reward += 250
        
        # Penalize being close to chasing ghosts
        # Encourage chasing frightened ghosts
        for ghost in self.ghosts:
            ghost_dist = abs(ghost.gridX - self.pacman.gridX) + abs(ghost.gridY - self.pacman.gridY)
            if ghost.state == GhostState.CHASE and ghost_dist < 3:
                reward -= (3 - ghost_dist) * 10
            elif ghost.state == GhostState.FRIGHTENED and ghost_dist < 8:
                reward += (8 - ghost_dist) * 3
        
        return reward
    
    def _get_info(self) -> dict:
        return {
            "pacman": {"x": self.pacman.gridX, "y": self.pacman.gridY},
            "ghosts": [
                {
                    "x": ghost.gridX,
                    "y": ghost.gridY,
                    "type": ghost.type.value,
                    "state": ghost.state,
                } for ghost in self.ghosts
            ],
            "timestamp": self.current_time,
            "game_over": self.game_over,
            "score": self.score,
        }