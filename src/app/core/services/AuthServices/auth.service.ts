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
}
