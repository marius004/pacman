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
    # DQN
    {
        "model": DQN(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            buffer_size=100_000,
            learning_starts=50_000,
            batch_size=128,
            tau=0.001,
            gamma=0.99,
            train_freq=5,
            gradient_steps=1,
            target_update_interval=10_000,
            exploration_fraction=0.25,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            max_grad_norm=10,
            policy_kwargs=dict(net_arch=[128, 64]),
            device=device,
        ),
        "description": """DQN with learning_rate=3e-4, network architecture [128, 64], tau=0.001,
        gamma=0.99, batch_size=128, train_freq=5, gradient_steps=1, target_update_interval=10_000,
        exploration_initial_eps=1.0, and exploration_final_eps=0.05. The model uses MlpPolicy and is
        trained on vec_env with a buffer_size=100_000.""",
        "name": "DQN_3e-4_128x64_tau0.001_eps1-0.05",
        "path": "agents/dqn/",
    },
    {
        "model": DQN(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            buffer_size=100_000,
            learning_starts=50_000,
            batch_size=128,
            tau=0.001,
            gamma=0.99,
            train_freq=5,
            gradient_steps=1,
            target_update_interval=10_000,
            exploration_fraction=0.25,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            max_grad_norm=10,
            policy_kwargs=dict(net_arch=[256, 128]),
            device=device,
        ),
        "description": """DQN with learning_rate=3e-4, network architecture [256, 128], tau=0.001,
        gamma=0.99, batch_size=128, train_freq=5, gradient_steps=1, target_update_interval=10_000,
        exploration_initial_eps=1.0, and exploration_final_eps=0.05. The model uses MlpPolicy and is
        trained on vec_env with a buffer_size=100_000.""",
        "name": "DQN_3e-4_256x128_tau0.001_eps1-0.05",
        "path": "agents/dqn/",
    },
    {
        "model": DQN(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            buffer_size=100_000,
            learning_starts=50_000,
            batch_size=128,
            tau=0.001,
            gamma=0.99,
            train_freq=5,
            gradient_steps=1,
            target_update_interval=10_000,
            exploration_fraction=0.25,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            max_grad_norm=10,
            policy_kwargs=dict(net_arch=[256, 128, 64]),
            device=device,
        ),
        "description": """DQN with learning_rate=3e-4, network architecture [256, 128, 64], tau=0.001,
        gamma=0.99, batch_size=128, train_freq=5, gradient_steps=1, target_update_interval=10_000,
        exploration_initial_eps=1.0, and exploration_final_eps=0.05. The model uses MlpPolicy and is
        trained on vec_env with a buffer_size=100_000.""",
        "name": "DQN_3e-4_256x128x64_tau0.001_eps1-0.05",
        "path": "agents/dqn/",
    },
    {
        "model": DQN(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            buffer_size=100_000,
            learning_starts=50_000,
            batch_size=128,
            tau=0.001,
            gamma=0.99,
            train_freq=5,
            gradient_steps=1,
            target_update_interval=10_000,
            exploration_fraction=0.25,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            max_grad_norm=10,
            policy_kwargs=dict(net_arch=[512, 256, 128]),
            device=device,
        ),
        "description": """DQN with learning_rate=3e-4, network architecture [512, 256, 128], tau=0.001,
        gamma=0.99, batch_size=128, train_freq=5, gradient_steps=1, target_update_interval=10_000,
        exploration_initial_eps=1.0, and exploration_final_eps=0.05. The model uses MlpPolicy and is
        trained on vec_env with a buffer_size=100_000.""",
        "name": "DQN_3e-4_512x256x128_tau0.001_eps1-0.05",
        "path": "agents/dqn/",
    },
    {
        "model": DQN(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            buffer_size=100_000,
            learning_starts=50_000,
            batch_size=128,
            tau=0.001,
            gamma=0.99,
            train_freq=5,
            gradient_steps=1,
            target_update_interval=10_000,
            exploration_fraction=0.25,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            max_grad_norm=10,
            policy_kwargs=dict(net_arch=[1024, 512, 256, 128]),
            device=device,
        ),
        "description": "DQN with learning_rate=3e-4, network architecture [1024, 512, 256, 128], tau=0.001, gamma=0.99, batch_size=128, train_freq=5, gradient_steps=1, target_update_interval=10_000, exploration_initial_eps=1.0, and exploration_final_eps=0.05. The model uses MlpPolicy and is trained on vec_env with a buffer_size=100_000.",
        "name": "DQN_3e-4_1024x512x256x128_tau0.001_eps1-0.05",
        "path": "agents/dqn/",
    },
    
    # PPO
    {
        "model": PPO(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            batch_size=128,
            n_steps=2048,
            policy_kwargs=dict(net_arch=[128, 64]),
            device=device,
        ),
        "description": """PPO with learning_rate=3e-4, network architecture [128, 64].""",
        "name": "PPO_3e-4_128x64",
        "path": "agents/ppo/",
    },
    {
        "model": PPO(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            batch_size=128,
            n_steps=2048,
            policy_kwargs=dict(net_arch=[256, 128]),
            device=device,
        ),
        "description": """PPO with learning_rate=3e-4, network architecture [256, 128].""",
        "name": "PPO_3e-4_256x128",
        "path": "agents/ppo/",
    },
    {
        "model": PPO(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            batch_size=128,
            n_steps=2048,
            policy_kwargs=dict(net_arch=[256, 128, 64]),
            device=device,
        ),
        "description": """PPO with learning_rate=3e-4, network architecture [256, 128, 64].""",
        "name": "PPO_3e-4_256x128x64",
        "path": "agents/ppo/",
    },
    {
        "model": PPO(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            batch_size=128,
            n_steps=2048,
            policy_kwargs=dict(net_arch=[512, 256, 128]),
            device=device,
        ),
        "description": """PPO with learning_rate=3e-4, network architecture [512, 256, 128].""",
        "name": "PPO_3e-4_512x256x128",
        "path": "agents/ppo/",
    },
    {
        "model": PPO(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=3e-4,
            batch_size=128,
            n_steps=2048,
            policy_kwargs=dict(net_arch=[1024, 512, 256, 128]),
            device=device,
        ),
        "description": """PPO with learning_rate=3e-4, network architecture [1024, 512, 256, 128].""",
        "name": "PPO_3e-4_1024x512x256x128",
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
    total_timesteps=70_000,
    model_name=model_conf["name"],
    path=os.path.join(model_conf["path"], model_conf["name"])
)

trainer.train()