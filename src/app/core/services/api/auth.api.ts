
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