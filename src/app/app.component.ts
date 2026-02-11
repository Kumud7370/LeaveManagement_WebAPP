import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from "./core/services/api/auth.api"

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, HttpClientModule],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  template: "<router-outlet></router-outlet>",
})
export class AppComponent {
  title = "SWM-WMS" 
}

