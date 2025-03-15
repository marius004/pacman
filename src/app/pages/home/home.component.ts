import {Component, inject} from '@angular/core';
import {Router, RouterModule} from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterModule],
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private router = inject(Router);

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
