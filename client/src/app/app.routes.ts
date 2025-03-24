import {PlayGameComponent} from '@pages/play-game/play-game.component';
import {RLAgentComponent} from '@pages/rl-agent/rl-agent.component';
import {HomeComponent} from '@pages/home/home.component';
import {Routes} from '@angular/router';

export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'play-game', component: PlayGameComponent},
    {path: 'rl-agent', component: RLAgentComponent}
];
