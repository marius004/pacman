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
            verbose=1,
            policy_kwargs=dict(net_arch=[512, 384, 256]),  # Larger network as you observed
            learning_rate=0.0001,  # Slightly lower learning rate for stability
            buffer_size=1_000_000,  # Good buffer size already
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            exploration_fraction=0.5,  # Extended exploration period
            learning_starts=50_000,  # Start learning earlier
            max_grad_norm=5.0,  # Lower to prevent explosive gradients
            batch_size=128,  # Larger batch size for better gradient estimates
            gamma=0.99,  # Default but important for long-term rewards
            train_freq=4,  # Update every 4 steps
            gradient_steps=1,
            target_update_interval=10000,  # Update target network less frequently
        ),
        "description": """DQN with learning_rate=0.0001, enhanced network architecture [512, 384, 256], 
            gamma=0.99, batch_size=128, train_freq=4, gradient_steps=1, target_update_interval=10000,
            exploration_initial_eps=1.0, exploration_final_eps=0.05, exploration_fraction=0.5,
            learning_starts=50000, max_grad_norm=5.0. The model uses MlpPolicy and is
            trained on vec_env with buffer_size=1,000,000.""",
        "name": "DQN_0.0001_long_training",
        "path": "agents/dqn/",
    },
    {
        "model": DQN(
            "MlpPolicy",
            vec_env,
            verbose=1,
            policy_kwargs=dict(net_arch=[512, 384, 256]),  # Larger network as you observed
            learning_rate=0.001,  # Higher learning rate
            buffer_size=1_000_000,  # Good buffer size already
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            exploration_fraction=0.5,  # Extended exploration period
            learning_starts=50_000,  # Start learning earlier
            max_grad_norm=5.0,  # Lower to prevent explosive gradients
            batch_size=128,  # Larger batch size for better gradient estimates
            gamma=0.99,  # Default but important for long-term rewards
            train_freq=4,  # Update every 4 steps
            gradient_steps=1,
            target_update_interval=10000,  # Update target network less frequently
        ),
        "description": """DQN with learning_rate=0.001, enhanced network architecture [512, 384, 256], 
            gamma=0.99, batch_size=128, train_freq=4, gradient_steps=1, target_update_interval=10000,
            exploration_initial_eps=1.0, exploration_final_eps=0.05, exploration_fraction=0.5,
            learning_starts=50000, max_grad_norm=5.0. The model uses MlpPolicy and is
            trained on vec_env with buffer_size=1,000,000.""",
        "name": "DQN_0.001_long_training",
        "path": "agents/dqn/",
    },
    {
        "model": PPO(
            "MlpPolicy",
            vec_env,
            verbose=1,
            policy_kwargs=dict(net_arch=[dict(pi=[384, 256], vf=[384, 256])]),
            learning_rate=0.0003,
            n_steps=2048,
            batch_size=128,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            clip_range_vf=0.2,
            normalize_advantage=True,
            ent_coef=0.01,  # Encourage exploration
            max_grad_norm=0.5,
        ),
        "description": """PPO with learning_rate=0.0003, enhanced network architecture with 
            policy [384, 256] and value function [384, 256], gamma=0.99, batch_size=128, 
            n_steps=2048, n_epochs=10, gae_lambda=0.95, clip_range=0.2, clip_range_vf=0.2, 
            normalize_advantage=True, ent_coef=0.01, max_grad_norm=0.5. The model uses MlpPolicy 
            and is trained on vec_env with parallel environments.""",
        "name": "PPO_0.0003_long_training",
        "path": "agents/ppo/",
    },
]

model_name = sys.argv[1]
model_conf = next((m for m in models if m["name"] == model_name), None)

if model_conf is None:
    raise ValueError(f"Model with name '{model_name}' not found")

os.makedirs(os.path.join(model_conf['path'], model_conf['name']), exist_ok=True)
 
trainer = PacmanTrainer(
    model=model_conf['model'],
    total_timesteps=50_000_000,
    model_name=model_conf["name"],
    path=os.path.join(model_conf["path"], model_conf["name"])
)

trainer.train()