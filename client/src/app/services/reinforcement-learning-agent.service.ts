import {EpisodeSample} from '@models/http/episode-sample';
import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReinforcementLearningAgentService {
    private readonly apiUrl = 'http://localhost:8000/';
    private http = inject(HttpClient);

    getEpisode(agent: string): Observable<EpisodeSample[]> {
        return this.http.get<EpisodeSample[]>(this.apiUrl + agent);
    }
}