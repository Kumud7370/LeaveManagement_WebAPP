import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from "./core/services/AuthServices/auth.service"
// @Component({
//   selector: 'app-root',
//   standalone: true,         // Add this line
//   imports: [RouterOutlet, HttpClientModule],
//   templateUrl: './app.component.html',
//   styleUrls: ['./app.component.scss'],
//   template: "<router-outlet></router-outlet>",
// })
// export class AppComponent {
//   title = 'SWMWNS19';
// }
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, HttpClientModule],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  template: "<router-outlet></router-outlet>",
})
export class AppComponent implements OnInit {
  title = "SWMWNS19"

  constructor(private authService: AuthService) { }

  ngOnInit() {
    // Check if user is already authenticated in this session
    if (!this.authService.isLoggedIn()) {
      this.authService.redirectToLogin()
    }
  }
}

