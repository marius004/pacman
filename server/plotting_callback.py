from stable_baselines3.common.callbacks import BaseCallback

import matplotlib.pyplot as plt
import numpy as np
import matplotlib
import os

matplotlib.use('Agg')

class PlottingCallback(BaseCallback):
    def __init__(self, save_path: str, verbose=0):
        super().__init__(verbose)
        self.save_path = save_path
        os.makedirs(self.save_path, exist_ok=True)

        self.episode_rewards = []
        self.episode_lengths = []
        self.actions = []

        self.current_rewards = 0.0
        self.current_length = 0

    def _on_step(self) -> bool:
        reward = self.locals["rewards"]
        done = self.locals["dones"]
        action = self.locals["actions"]

        self.current_rewards += reward[0]
        self.current_length += 1
        self.actions.append(action[0])

        if done[0]:
            self.episode_rewards.append(self.current_rewards)
            self.episode_lengths.append(self.current_length)
            self.current_rewards = 0.0
            self.current_length = 0

        return True

    def _on_training_end(self) -> None:
        self._plot_rewards()
        self._plot_lengths()
        self._plot_action_distribution()

    def _plot_rewards(self):
        plt.figure(figsize=(10, 5))
        plt.plot(range(1, len(self.episode_rewards) + 1), self.episode_rewards)
        plt.title("Episode Rewards")
        plt.xlabel("Episode")
        plt.ylabel("Reward")
        plt.grid(True)
        plt.savefig(os.path.join(self.save_path, "rewards_plot.png"))
        plt.close()

    def _plot_lengths(self):
        plt.figure(figsize=(10, 5))
        plt.plot(range(1, len(self.episode_lengths) + 1), self.episode_lengths)
        plt.title("Episode Lengths")
        plt.xlabel("Episode")
        plt.ylabel("Length")
        plt.grid(True)
        plt.savefig(os.path.join(self.save_path, "lengths_plot.png"))
        plt.close()

    def _plot_action_distribution(self):
        plt.figure(figsize=(10, 5))
        unique, counts = np.unique(self.actions, return_counts=True)
        plt.bar(unique, counts, tick_label=[f"Action {a}" for a in unique])
        plt.title("Action Distribution")
        plt.xlabel("Action")
        plt.ylabel("Frequency")
        plt.grid(True)
        plt.savefig(os.path.join(self.save_path, "action_distribution.png"))
        plt.close()
        
    def _plot_action_distribution(self):
        plt.figure(figsize=(10, 5))
        unique, counts = np.unique(self.actions, return_counts=True)

        full_actions = [0, 1, 2, 3]
        full_labels = ["up", "down", "left", "right"]
        full_counts = [counts[unique.tolist().index(i)] if i in unique else 0 for i in full_actions]

        plt.bar(full_actions, full_counts, tick_label=full_labels)
        plt.title("Action Distribution")
        plt.xlabel("Action")
        plt.ylabel("Frequency")
        plt.grid(True)
        plt.savefig(os.path.join(self.save_path, "action_distribution.png"))
        plt.close()
