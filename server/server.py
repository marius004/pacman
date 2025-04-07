from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pacman_player import PacmanPlayer

import uvicorn
import json
import os
import re

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/agents")
def list_trained_agents():
    root = "agents"
    agents = []

    for algo in os.listdir(root):
        algo_path = os.path.join(root, algo)
        if not os.path.isdir(algo_path):
            continue

        for model in os.listdir(algo_path):
            model_path = os.path.join(algo_path, model)
            ckpt_path = os.path.join(model_path, "checkpoints")

            if not os.path.isdir(ckpt_path):
                continue

            checkpoint_files = [
                f for f in os.listdir(ckpt_path)
                if re.match(r"model_(\d+)_steps\.zip", f)
            ]
            
            if not checkpoint_files:
                continue

            description_path = os.path.join(model_path, "description.json")
            description = ""
            if os.path.exists(description_path):
                with open(description_path, 'r') as f:
                    try:
                        description = json.load(f)
                    except json.JSONDecodeError:
                        description = ""

            agents.append({
                "model_name": f"{algo}/{model}",
                "checkpoints": len(checkpoint_files),
                "description": description
            })

    return agents

@app.get("/{agent}/{model_name}/{checkpoint}")
def get_agent_results(agent: str, model_name: str, checkpoint: int):
    model_base_path = f"agents/{agent}/{model_name}"

    if not os.path.exists(model_base_path):
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")

    checkpoints_dir = os.path.join(model_base_path, "checkpoints")
    if not os.path.exists(checkpoints_dir):
        raise HTTPException(status_code=404, detail=f"No checkpoints directory found for model {model_name}")

    checkpoints = []
    pattern = re.compile(r"model_(\d+)_steps\.zip")
    
    for filename in os.listdir(checkpoints_dir):
        match = pattern.match(filename)
        if match:
            steps = int(match.group(1))
            checkpoints.append((steps, filename))

    if not checkpoints or checkpoint >= len(checkpoints):
        raise HTTPException(status_code=404, detail=f"Checkpoint {checkpoint} not found for model {model_name}")
    
    checkpoints.sort(key=lambda x: x[0])
    _, checkpoint_file = checkpoints[checkpoint]

    player = PacmanPlayer(os.path.join(checkpoints_dir, checkpoint_file))
    return player.play()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)