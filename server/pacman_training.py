from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecEnv
from pacman_trainer import PacmanTrainer
from stable_baselines3 import DQN, PPO
from pacman_env import PacmanEnv

import torch
import os
import sys

vec_env = make_vec_env(lambda: PacmanEnv(), n_envs=4)
device = 'cuda' if torch.cuda.is_available() else 'cpu'

models = [

    {
        "model": DQN(
            "MlpPolicy",
            vec_env,
            learning_rate=0.001,
            device=device,
        ),
        "description": """DQN with learning_rate=3e-4, network architecture [256, 128], tau=0.001,
        gamma=0.99, batch_size=128, train_freq=4, gradient_steps=1, target_update_interval=10_000,
        exploration_initial_eps=1.0, and exploration_final_eps=0.05. The model uses MlpPolicy and is
        trained on vec_env with a buffer_size=500_000.""",
        "name": "DQN_3e-4_256x128_tau0.001_eps1-0.05",
        "path": "agents/dqn/",
    },
]

model_name = sys.argv[1]
model_conf = next((m for m in models if m["name"] == model_name), None)

if model_conf is None:
    raise ValueError(f"Model with name '{model_name}' not found")

os.makedirs(os.path.join(model_conf['path'], model_conf['name']), exist_ok=True) 

trainer = PacmanTrainer(
    model=model_conf['model'],
    total_timesteps=250_000,
    model_name=model_conf["name"],
    path=os.path.join(model_conf["path"], model_conf["name"])
)

trainer.train()