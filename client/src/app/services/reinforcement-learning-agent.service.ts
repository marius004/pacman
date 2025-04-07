import {EpisodeSample} from '@models/http/episode-sample';
import {AgentInfo} from '@models/http/agent-info';
import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReinforcementLearningAgentService {
  private readonly apiUrl = 'http://localhost:8000';
  private http = inject(HttpClient);
  
  getAvailableAgents(): Observable<AgentInfo[]> {
    return this.http.get<AgentInfo[]>(`${this.apiUrl}/agents`);
  }

  getEpisode(agent: string, checkpoint: number = 0): Observable<EpisodeSample[]> {
    return this.http.get<EpisodeSample[]>(`${this.apiUrl}/${agent}/${checkpoint}`);
  }
}