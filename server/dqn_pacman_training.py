from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecEnv
from pacman_trainer import PacmanTrainer
from stable_baselines3 import DQN
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
        "description": """DQN with learning_rate=0.0001, enhanced network architecture [512, 384, 256],
          gamma=0.99, batch_size=128, train_freq=4, gradient_steps=1, target_update_interval=10000,
         exploration_initial_eps=1.0, exploration_final_eps=0.05, exploration_fraction=0.5,
         learning_starts=50000, max_grad_norm=5.0. The model uses MlpPolicy and is
         trained on vec_env with buffer_size=1,000,000.""",
        "name": "DQN_0.0001_long_training_random",
        "path": "agents/dqn/",
    }
]

model_name = sys.argv[1]
model_conf = next((m for m in models if m["name"] == model_name), None)

if model_conf is None:
    raise ValueError(f"Model with name '{model_name}' not found")

pretrained_model_path = "agents/dqn/DQN_0.0001_long_training_deterministic/best_model.zip"
model = model_conf["model"]
model.load(pretrained_model_path, env=vec_env, device=device)

model_dir = os.path.join(model_conf["path"], model_conf["name"])
os.makedirs(model_dir, exist_ok=True)

trainer = PacmanTrainer(
    model=model,
    total_timesteps=50_000_000,
    model_name=model_conf["name"],
    path=model_dir,
)

trainer.train()