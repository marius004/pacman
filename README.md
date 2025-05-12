## Reinforcement Learning in Pac-Man

This project implements a full Pac-Man environment where you can play the game yourself or watch AI agents learn and play in real time. Multiple reinforcement learning algorithms are compared:
- **QRDQN** achieves the best performance (7,000–8,000 points)  
- **DQN with random ghosts** scores 5,000–6,000  
- **DQN with deterministic ghosts** reaches ~3,500  
- **PPO** performs poorly (below 2,000) due to instability in discrete action spaces

### How to Run the Project

#### Backend
```bash
python3 server.py
```

### Frontend 
```
npm install
npm start
```
