from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecEnv
from pacman_trainer import PacmanTrainer
from pacman_env import PacmanEnv
from sb3_contrib import QRDQN

import torch
import os
import sys

vec_env = make_vec_env(lambda: PacmanEnv(), n_envs=4)
device = 'cuda' if torch.cuda.is_available() else 'cpu'

models = [
    {
        "model": QRDQN(
            "MlpPolicy",
            vec_env,
            verbose=1,
            policy_kwargs=dict(net_arch=[512, 384, 256]),
            learning_rate=0.0001,
            buffer_size=1_000_000,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            exploration_fraction=0.5,
            learning_starts=50_000,
            max_grad_norm=5.0,
            batch_size=128,
            gamma=0.99,
            train_freq=4,
            gradient_steps=1,
            target_update_interval=10000,
        ),
        "description": """QRDQN with learning_rate=0.0001, net_arch=[512, 384, 256],
        gamma=0.99, batch_size=128, train_freq=4, gradient_steps=1, target_update_interval=10000,
        exploration_initial_eps=1.0, final_eps=0.05, fraction=0.5, learning_starts=50000.""",
        "name": "QRDQN_0.0001_long_training",
        "path": "agents/qrdqn/",
    },
]

model_name = sys.argv[1]
model_conf = next((m for m in models if m["name"] == model_name), None)

if model_conf is None:
    raise ValueError(f"Model with name '{model_name}' not found")

model = model_conf["model"]

model_dir = os.path.join(model_conf["path"], model_conf["name"])
os.makedirs(model_dir, exist_ok=True)

trainer = PacmanTrainer(
    model=model,
    total_timesteps=50_000_000,
    model_name=model_conf["name"],
    path=model_dir,
)

trainer.train()