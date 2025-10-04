import { Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private isAuthenticated = false;
  private idleTimer: any;
  private idleTimeout = 30 * 1000; // 10 minutes

  constructor(private router: Router, private ngZone: NgZone) {
    this.setupIdleTimer();
  }

  login(username: string, password: string): boolean {
    if (username === "admin" && password === "password") {
      this.isAuthenticated = true;
      this.resetIdleTimer();
      return true;
    }
    return false;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  logout(): void {
    this.isAuthenticated = false;
    this.clearIdleTimer();
    this.router.navigate(["/login"]);
  }

  redirectToLogin(): void {
    if (!this.isAuthenticated) {
      this.router.navigate(["/login"]);
    }
  }

  redirectToDashboard(): void {
    if (this.isAuthenticated) {
      this.router.navigate(["/dashboard"]);
    }
  }

  // -----------------------
  // Idle Timer Management
  // -----------------------
  private setupIdleTimer(): void {
    this.ngZone.runOutsideAngular(() => {
      ["mousemove", "keydown", "click"].forEach((event) => {
        window.addEventListener(event, () => this.resetIdleTimer());
      });
    });
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    if (this.isAuthenticated) {
      this.idleTimer = setTimeout(() => {
        this.ngZone.run(() => this.logout()); // ensure Angular zone
      }, this.idleTimeout);
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
