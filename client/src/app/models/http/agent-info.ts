export interface AgentInfo {
    plots: number; 
    checkpoints: number;
    
    model_name: string;
    description: Record<string, any>;
}