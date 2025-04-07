from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.env_util import make_vec_env
from gymnasium.wrappers import FlattenObservation
from pacman_env import PacmanEnv

import numpy as np
import json
import sys
import os

class PacmanTrainer:
    def __init__(self, model, total_timesteps: int, path: str, model_name: str):
        self.eval_env = FlattenObservation(PacmanEnv())
        
        self.total_timesteps = total_timesteps
        self.model_name = model_name
        self.model = model
        self.path = path
        
        os.makedirs(self.path, exist_ok=True)

    def train(self):
        eval_callback = EvalCallback(
            self.eval_env,
            eval_freq=5_000,
            best_model_save_path=self.path,
            verbose=1,
            n_eval_episodes=100,
            deterministic=True
        )
        
        checkpoint_callback = CheckpointCallback(
            save_freq=20_000,
            save_path=os.path.join(self.path, "checkpoints"),
            name_prefix="model",
            verbose=1
        )
        
        self.model.learn(
            total_timesteps=self.total_timesteps,
            callback=[eval_callback, checkpoint_callback],
            progress_bar=True,
            log_interval=100
        )
        
        self.model.save(os.path.join(self.path, self.model_name + ".zip"))