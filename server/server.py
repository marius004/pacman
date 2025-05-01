from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi import FastAPI, HTTPException
from pacman_player import PacmanPlayer

import uvicorn
import json
import os
import re

app = FastAPI()

CHECKPOINT_STEP = 20

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
            plots_path = os.path.join(model_path, "plots")

            if not os.path.isdir(ckpt_path):
                continue

            checkpoint_files = [
                f for f in os.listdir(ckpt_path)
                if re.match(r"model_(\d+)_steps\.zip", f)
            ]
            
            if not checkpoint_files:
                continue

            special_files_count = 0
            if os.path.exists(os.path.join(model_path, "best_model.zip")):
                special_files_count += 1
                
            if os.path.exists(os.path.join(model_path, f"{model}.zip")):
                special_files_count += 1
            
            checkpoint_count = (len(checkpoint_files) + CHECKPOINT_STEP - 1) // CHECKPOINT_STEP
            total_files = special_files_count + checkpoint_count

            description_path = os.path.join(model_path, "description.json")
            description = ""
            if os.path.exists(description_path):
                with open(description_path, 'r') as f:
                    try:
                        description = json.load(f)
                    except json.JSONDecodeError:
                        description = ""
                        
            num_plots = 0
            if os.path.isdir(plots_path):
                num_plots = len([f for f in os.listdir(plots_path) if f.endswith(".png")])

            agents.append({
                "model_name": f"{algo}/{model}",
                "checkpoints": total_files,
                "description": description,
                "plots": num_plots,
            })

    return agents

@app.get("/plots/{agent}/{model_name}/{plot_index}")
def get_plot(agent: str, model_name: str, plot_index: int):
    plots_dir = os.path.join("agents", agent, model_name, "plots")

    if not os.path.exists(plots_dir):
        raise HTTPException(status_code=404, detail=f"Plots directory not found for model {model_name}")

    plot_files = sorted([f for f in os.listdir(plots_dir) if f.endswith(".png")])
    if not plot_files or plot_index >= len(plot_files):
        raise HTTPException(status_code=404, detail=f"Plot index {plot_index} out of range")

    plot_path = os.path.join(plots_dir, plot_files[plot_index])
    return FileResponse(plot_path, media_type="image/png")

@app.get("/{agent}/{model_name}/{checkpoint}")
def get_agent_results(agent: str, model_name: str, checkpoint: int):
    model_base_path = f"agents/{agent}/{model_name}"

    if not os.path.exists(model_base_path):
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")

    special_files = []
    checkpoint_files = []

    checkpoints_dir = os.path.join(model_base_path, "checkpoints")
    if os.path.exists(checkpoints_dir):
        pattern = re.compile(r"model_(\d+)_steps\.zip")
        checkpoints = []

        for filename in os.listdir(checkpoints_dir):
            match = pattern.match(filename)
            if match:
                steps = int(match.group(1))
                checkpoints.append((steps, os.path.join(checkpoints_dir, filename)))

        checkpoints.sort(key=lambda x: x[0])
        checkpoint_files = [path for _, path in checkpoints]

    model_zip_path = os.path.join(model_base_path, f"{model_name}.zip")
    if os.path.exists(model_zip_path):
        special_files.append(model_zip_path)

    best_model_path = os.path.join(model_base_path, "best_model.zip")
    if os.path.exists(best_model_path):
        special_files.append(best_model_path)

    checkpoint_count = (len(checkpoint_files) + CHECKPOINT_STEP - 1) // CHECKPOINT_STEP
    if checkpoint < checkpoint_count:
        checkpoint_index = checkpoint * CHECKPOINT_STEP
        if checkpoint_index >= len(checkpoint_files):
            checkpoint_index = len(checkpoint_files) - 1

        model_file_path = checkpoint_files[checkpoint_index]
    else:
        special_index = checkpoint - checkpoint_count
        model_file_path = special_files[special_index]
    
    player = PacmanPlayer(model_file_path)
    return player.play()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)