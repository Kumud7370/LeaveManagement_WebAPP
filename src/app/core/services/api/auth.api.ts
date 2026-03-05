import { Injectable, Inject, PLATFORM_ID } from "@angular/core"
import { Router } from "@angular/router"
import { isPlatformBrowser } from "@angular/common"

@Injectable({
    providedIn: "root",
})
export class AuthService {
    private isBrowser: boolean

    constructor(
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(this.platformId)
    }

    login(username: string, password: string): boolean {
        // Static credentials check
        if (username === "admin" && password === "password") {
            return true
        }
        return false
    }

    isLoggedIn(): boolean {
        if (!this.isBrowser) return false
        
        const token = sessionStorage.getItem("token") || localStorage.getItem("accessToken")
        return !!token
    }

    redirectToLogin(): void {
        if (!this.isLoggedIn()) {
            this.router.navigate(["/login"])
        }
    }

    redirectToDashboard(): void {
        if (this.isLoggedIn()) {
            this.router.navigate(["/dashboard"])
        }
    }

    logout(reason?: "idle" | "expired" | "manual"): void {
        if (!this.isBrowser) return

        try {
            sessionStorage.removeItem("UserId")
            sessionStorage.removeItem("EmployeeId") 
            sessionStorage.removeItem("SiteName")
            sessionStorage.removeItem("RoleName")
            sessionStorage.removeItem("token")
            sessionStorage.removeItem("refreshToken")
            sessionStorage.removeItem("username")
            sessionStorage.removeItem("role")
            sessionStorage.removeItem("deviceId")
            
            localStorage.removeItem("accessToken")
            localStorage.removeItem("refreshToken")
        } catch (_) {
        }

        const queryParams: any = {}
        if (reason) queryParams["reason"] = reason

        this.router.navigate(["/login"], { queryParams })
    }
}