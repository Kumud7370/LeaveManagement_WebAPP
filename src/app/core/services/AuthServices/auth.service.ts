// import { Injectable, NgZone } from "@angular/core";
// import { Router } from "@angular/router";

// @Injectable({
//   providedIn: "root",
// })
// export class AuthService {
//   private isAuthenticated = false;
//   private idleTimer: any;
//   private idleTimeout = 30 * 1000; // 10 minutes

//   constructor(private router: Router, private ngZone: NgZone) {
//     this.setupIdleTimer();
//   }

//   login(username: string, password: string): boolean {
//     if (username === "admin" && password === "password") {
//       this.isAuthenticated = true;
//       this.resetIdleTimer();
//       return true;
//     }
//     return false;
//   }

//   isLoggedIn(): boolean {
//     return this.isAuthenticated;
//   }

//   logout(): void {
//     this.isAuthenticated = false;
//     this.clearIdleTimer();
//     this.router.navigate(["/login"]);
//   }

//   redirectToLogin(): void {
//     if (!this.isAuthenticated) {
//       this.router.navigate(["/login"]);
//     }
//   }

//   redirectToDashboard(): void {
//     if (this.isAuthenticated) {
//       this.router.navigate(["/dashboard"]);
//     }
//   }

//   // -----------------------
//   // Idle Timer Management
//   // -----------------------
//   private setupIdleTimer(): void {
//     this.ngZone.runOutsideAngular(() => {
//       ["mousemove", "keydown", "click"].forEach((event) => {
//         window.addEventListener(event, () => this.resetIdleTimer());
//       });
//     });
//   }

//   private resetIdleTimer(): void {
//     this.clearIdleTimer();
//     if (this.isAuthenticated) {
//       this.idleTimer = setTimeout(() => {
//         this.ngZone.run(() => this.logout()); // ensure Angular zone
//       }, this.idleTimeout);
//     }
//   }

//   private clearIdleTimer(): void {
//     if (this.idleTimer) {
//       clearTimeout(this.idleTimer);
//       this.idleTimer = null;
//     }
//   }
// }
import { Injectable } from "@angular/core"
import { Router } from "@angular/router"

@Injectable({
    providedIn: "root",
})
export class AuthService {
    // In-memory flag that persists only during the current application session
    private isAuthenticated = false

    constructor(private router: Router) { }

    login(username: string, password: string): boolean {
        // Static credentials check
        if (username === "admin" && password === "password") {
            this.isAuthenticated = true
            return true
        }
        return false
    }

    isLoggedIn(): boolean {
        return this.isAuthenticated
    }

    redirectToLogin(): void {
        if (!this.isAuthenticated) {
            this.router.navigate(["/login"])
        }
    }

    redirectToDashboard(): void {
        if (this.isAuthenticated) {
            this.router.navigate(["/dashboard"])
        }
    }

    logout(reason?: "idle" | "expired" | "manual"): void {
        try {
            // Clear session/local storage keys used by login flow
            sessionStorage.removeItem("UserId")
            sessionStorage.removeItem("SiteName")
            sessionStorage.removeItem("RoleName")
            sessionStorage.removeItem("token")
            sessionStorage.removeItem('deviceId');
            // localStorage.removeItem("token")
            // localStorage.removeItem("username")
            // localStorage.removeItem("role")
        } catch (_) {
            // ignore storage errors
        }

        this.isAuthenticated = false

        const queryParams: any = {}
        if (reason) queryParams["reason"] = reason

        // Avoid duplicate navigations: always route user back to login
        this.router.navigate(["/login"], { queryParams })
    }
}