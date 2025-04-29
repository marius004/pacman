from stable_baselines3.common.env_util import make_vec_env
from gymnasium.wrappers import FlattenObservation
from stable_baselines3 import DQN
from sb3_contrib import QRDQN
from pacman_env import PacmanEnv

import numpy as np
import json
import os

class PacmanPlayer:
    def __init__(self, model_path: str):
        self.eval_env = FlattenObservation(PacmanEnv())
        self.model_path = model_path if model_path.endswith('.zip') else model_path + '.zip'
        self.model = QRDQN.load(self.model_path) if 'qrdqn' in self.model_path.lower() else DQN.load(self.model_path)
        
    def play(self, num_episodes=1):
        results = []

        for _ in range(num_episodes):
            obs, info = self.eval_env.reset()
            done, terminated = False, False
            episode_result = [info]

            while not done and not terminated:
                action, _ = self.model.predict(obs, deterministic=True)
                obs, _, done, terminated, info = self.eval_env.step(action)
                episode_result.append(info)

            results.append(episode_result)

        best_result_index = np.argmax([episode[-1]["score"] for episode in results])
        return results[best_result_index]
