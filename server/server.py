from fastapi.middleware.cors import CORSMiddleware
from pacman_player import PacmanPlayer
from fastapi import FastAPI

import uvicorn
import os

player = PacmanPlayer('agents/dqn/DQN_3e-4_128x64_tau0.001_eps1-0.05/best_model.zip')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/dqn")
def get_dqn_results():
    return player.play()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)