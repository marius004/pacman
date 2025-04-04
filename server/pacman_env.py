from models.characters.ghost import Ghost, Blinky, Inky, Pinky, Clyde
from pacman_constants import GAME_MAP, DIRECTION_MAP
from models.interfaces import CellType, Direction
from models.characters.ghost import GhostState
from models.characters.pacman import Pacman
from models.map.game_map import GameMap

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
            
            # Ghost: [x, y, type, state, frightened timer] for 4 ghosts  
            'ghosts': spaces.Box(
                low=np.array([[0, 0, 0, 0, 0]] * 4),
                high=np.array([[19, 19, 3, 2, 7000]] * 4),
                shape=(4, 5), 
                dtype=np.int32
            ),
            
            # Power pellet positions [x, y]  
            'power_pellets': spaces.Box(low=0, high=19, shape=(4,2), dtype=np.int32),
            
            # Closest dots/power pellets to Pac-Man [x, y, dist]   
            'nearest_dots': spaces.Box(low=0, high=19, shape=(4,3), dtype=np.int32),
            'nearest_power_pellets': spaces.Box(low=0, high=19, shape=(2,3), dtype=np.int32),
            
            # Distances from each ghost to Pac-Man (normalized)  
            'ghost_distances': spaces.Box(low=0, high=1, shape=(4,2), dtype=np.float32),
            
            # Remaining dots and percentage of dots eaten  
            'dots_left': spaces.Box(low=0, high=240, shape=(1,), dtype=np.int32),
            'dots_eaten_percentage': spaces.Box(low=0, high=1, shape=(1,), dtype=np.float32),
            
            # Lives remaining
            'lives': spaces.Box(low=0, high=3, shape=(1,), dtype=np.int32),
            
            # Ghost proximity (1 or 2 steps away)  
            'chasing_ghost_one_step_away': spaces.Box(low=0, high=1, shape=(1,), dtype=np.int32), 
            'chasing_ghost_two_steps_away': spaces.Box(low=0, high=1, shape=(1,), dtype=np.int32),
            
            'scatter_ghost_one_step_away': spaces.Box(low=0, high=1, shape=(1,), dtype=np.int32), 
            'scatter_ghost_two_steps_away': spaces.Box(low=0, high=1, shape=(1,), dtype=np.int32),

            'frightened_ghost_one_step_away': spaces.Box(low=0, high=1, shape=(1,), dtype=np.int32), 
            'frightened_ghost_two_steps_away': spaces.Box(low=0, high=1, shape=(1,), dtype=np.int32),
            
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
        self.pacman = Pacman(self.game_map, 9, 15, 20)
        
        self.ghosts = [
            Blinky(9, 8, self.game_map, 20),
            Clyde(8, 9, self.game_map, 20),
            Inky(10, 9, self.game_map, 20),
            Pinky(9, 9, self.game_map, 20)
        ]
        
        self.dots = self.game_map.get_dots()
        self.game_over = False
        self.lives = 3
        self.score = 0
        
        self.last_pellet_eaten_time = 0
        self.last_ghost_eaten_time = 0
        self.last_dot_eaten_time = 0

        self.ghost_streak = 200
        self.current_time = 0
        
        self.previous_dots_count = len(self.dots)
        self.previous_lives = 3
        self.previous_score = 0
        
        obs = self._flatten_observation(self._get_obs())
        return obs, self._get_info()
    
    def reset(self, **kwargs):
        self.game_map = GameMap(deepcopy(GAME_MAP))
        self.pacman = Pacman(self.game_map, 9, 15, 20)
        
        self.total_initial_dots = sum([
            self.game_map.get_cell(i, j) in [CellType.Dot, CellType.PowerPellet]
            for i in range(self.game_map.height)
            for j in range(self.game_map.width)
        ])
        
        self.ghosts = [
            Blinky(9, 8, self.game_map, 20),
            Clyde(8, 9, self.game_map, 20),
            Inky(10, 9, self.game_map, 20),
            Pinky(9, 9, self.game_map, 20)
        ]
        
        self.dots = self.game_map.get_dots()
        self.game_over = False
        self.lives = 3
        self.score = 0
        
        self.last_pellet_eaten_time = 0
        self.last_ghost_eaten_time = 0
        self.last_dot_eaten_time = 0

        self.ghost_streak = 200
        self.current_time = 0
        
        self.previous_dots_count = len(self.dots)
        self.previous_lives = 3
        self.previous_score = 0
        
        return self._flatten_observation(self._get_obs()), self._get_info()
    
    def _flatten_observation(self, obs_dict):
        return np.array([val for key in obs_dict for val in obs_dict[key].flatten()], dtype=np.float32)
    
    def step(self, action: int):
        if self.game_over:
            return self._flatten_observation(self._get_obs()), -250, True, False, self._get_info()
        
        dots_before = len(self.dots)
        
        if 0 <= action < len(DIRECTION_MAP):
            self.pacman.next_direction = DIRECTION_MAP[action]
        
        self.current_time += 225
        self.pacman.update(self.current_time)
        
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
            self.pacman = Pacman(self.game_map, 9, 15, 20)
            self.ghosts = [
                Blinky(9, 8, self.game_map, 20),
                Clyde(8, 9, self.game_map, 20),
                Inky(10, 9, self.game_map, 20),
                Pinky(9, 9, self.game_map, 20)
            ]
            self.dots = self.game_map.get_dots()
            self.previous_dots_count = len(self.dots)
        
        reward = self._calculate_reward(dots_before, ghost_collision, ghost_eaten, terminated)
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
        
        ghosts_data = np.zeros((4, 5), dtype=np.int32)
        ghost_distances = np.zeros((4,2), dtype=np.float32)
        
        for i, ghost in enumerate(self.ghosts):
            frightened_timer = max(0, 7000 - (self.current_time - ghost.last_state_change)) if ghost.state == GhostState.FRIGHTENED else 0
            ghosts_data[i] = [ghost.gridX, ghost.gridY, ghost.type.value, ghost.state.value, frightened_timer]
            
            manhattan_dist = abs(ghost.gridX - self.pacman.gridX) + abs(ghost.gridY - self.pacman.gridY)
            max_possible_dist = self.game_map.width + self.game_map.height
            
            ghost_distances[i] = [
                min(1.0, manhattan_dist / max_possible_dist),
                ghost.type.value
            ]
        
        power_pellets = np.zeros((4, 2), dtype=np.int32)
        power_pellet_count = 0
        
        for dot in self.dots:
            if dot.type == CellType.PowerPellet and power_pellet_count < 4:
                power_pellets[power_pellet_count] = [dot.gridX, dot.gridY]
                power_pellet_count += 1
        
        dot_distances = []
        power_pellet_distances = []
        
        for dot in self.dots:
            manhattan_dist = abs(dot.gridX - self.pacman.gridX) + abs(dot.gridY - self.pacman.gridY)
            if dot.type == CellType.Dot:
                dot_distances.append((dot.gridX, dot.gridY, manhattan_dist))
            else:
                power_pellet_distances.append((dot.gridX, dot.gridY, manhattan_dist))
        
        dot_distances.sort(key=lambda x: x[2])
        power_pellet_distances.sort(key=lambda x: x[2])
        
        nearest_dots = np.zeros((4, 3), dtype=np.int32)
        for i in range(min(4, len(dot_distances))):
            nearest_dots[i] = dot_distances[i]
        
        nearest_power_pellets = np.zeros((2, 3), dtype=np.int32)
        for i in range(min(2, len(power_pellet_distances))):
            nearest_power_pellets[i] = power_pellet_distances[i]
        
        
        lives = np.array([self.lives], dtype=np.int32)
        dots_left = np.array([len(self.dots)], dtype=np.int32)
        dots_eaten_percentage = np.array([1 - len(self.dots) / self.total_initial_dots], dtype=np.float32)
        
        chasing_ghost_one_step_away = np.array([0], dtype=np.int32)
        chasing_ghost_two_steps_away = np.array([0], dtype=np.int32)
        scatter_ghost_one_step_away = np.array([0], dtype=np.int32)
        scatter_ghost_two_steps_away = np.array([0], dtype=np.int32)
        frightened_ghost_one_step_away = np.array([0], dtype=np.int32)
        frightened_ghost_two_steps_away = np.array([0], dtype=np.int32)
        
        for ghost in self.ghosts:
            manhattan_dist = abs(ghost.gridX - self.pacman.gridX) + abs(ghost.gridY - self.pacman.gridY)
            
            if ghost.state == GhostState.CHASE:
                if manhattan_dist <= 1:
                    chasing_ghost_one_step_away[0] = 1
                elif manhattan_dist <= 2:
                    chasing_ghost_two_steps_away[0] = 1
            elif ghost.state == GhostState.SCATTER:
                if manhattan_dist <= 1:
                    scatter_ghost_one_step_away[0] = 1
                elif manhattan_dist <= 2:
                    scatter_ghost_two_steps_away[0] = 1
            elif ghost.state == GhostState.FRIGHTENED:
                if manhattan_dist <= 1:
                    frightened_ghost_one_step_away[0] = 1
                elif manhattan_dist <= 2:
                    frightened_ghost_two_steps_away[0] = 1
        
        return {
            'pacman': pacman_pos,
            'ghosts': ghosts_data,
            'power_pellets': power_pellets,

            'nearest_dots': nearest_dots,
            'nearest_power_pellets': nearest_power_pellets,
            'ghost_distances': ghost_distances,

            'dots_left': dots_left,
            'dots_eaten_percentage': dots_eaten_percentage,
            'lives': lives,

            'chasing_ghost_one_step_away': chasing_ghost_one_step_away,
            'chasing_ghost_two_steps_away': chasing_ghost_two_steps_away,

            'scatter_ghost_one_step_away': scatter_ghost_one_step_away,
            'scatter_ghost_two_steps_away': scatter_ghost_two_steps_away,

            'frightened_ghost_one_step_away': frightened_ghost_one_step_away,
            'frightened_ghost_two_steps_away': frightened_ghost_two_steps_away,

            'pacman_legal_moves': pacman_legal_moves,
            'ghosts_legal_moves': ghosts_legal_moves,
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
                    self.last_dot_eaten_time = self.current_time
                else:
                    self.score += 50
                    pellet_eaten = True
                    self.last_pellet_eaten_time = self.current_time
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
            grid_collision = (
                round(self.pacman.gridX) == round(ghost.gridX) and
                round(self.pacman.gridY) == round(ghost.gridY))
            
            dx = (self.pacman.displayX + self.pacman.cell_size/2) - (ghost.displayX + ghost.cell_size/2)
            dy = (self.pacman.displayY + self.pacman.cell_size/2) - (ghost.displayY + ghost.cell_size/2)
            distance = np.sqrt(dx*dx + dy*dy)
            physical_collision = distance < self.pacman.cell_size / 2
            
            if grid_collision or physical_collision:
                ghost_collision = True
                if ghost.is_frightened():
                    self.score += self.ghost_streak
                    self.ghost_streak *= 2
                    self.last_ghost_eaten_time = self.current_time
                    ghost.on_eaten(self.current_time)
                    ghost_eaten = True
                else:
                    self.lives -= 1
                    if self.lives <= 0:
                        self.game_over = True
                        self.pacman.set_game_over()
                        for g in self.ghosts:
                            g.set_game_over()
                    else:
                        self.pacman = Pacman(self.game_map, 9, 15, 20)
                        self.ghosts = [
                            Blinky(9, 8, self.game_map, 20),
                            Clyde(8, 9, self.game_map, 20),
                            Inky(10, 9, self.game_map, 20),
                            Pinky(9, 9, self.game_map, 20)
                        ]
        
        return ghost_collision, ghost_eaten
    
    def _calculate_reward(self, dots_before, ghost_collision, ghost_eaten, terminated):
        reward = 0
        
        dots_eaten = dots_before - len(self.dots)
        
        if dots_eaten > 0:
            reward += dots_eaten * 10
        else:
            reward -= 0.1
        
        closest_food_dist = float('inf')
        for dot in self.dots:
            dist = abs(dot.gridX - self.pacman.gridX) + abs(dot.gridY - self.pacman.gridY)
            closest_food_dist = min(closest_food_dist, dist)
        
        if closest_food_dist != float('inf'):
            reward += 1.0 / max(1, closest_food_dist)
        
        if ghost_collision:
            if ghost_eaten:
                reward += 100
            else:
                reward -= 250
    
        if terminated and len(self.dots) == 0:
            reward += 500
        
        return reward
    
    def _get_info(self) -> dict:
        return {
            "pacman": [self.pacman.gridX, self.pacman.gridY],
            "ghosts": [[ghost.gridX, ghost.gridY, ghost.type.value] for ghost in self.ghosts],
            "timestamp": self.current_time,
            "game_over": self.game_over,
            "lives": self.lives,
            "score": self.score,
        }