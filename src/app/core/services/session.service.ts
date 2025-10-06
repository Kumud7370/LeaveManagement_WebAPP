import { Injectable, NgZone } from "@angular/core"
import { Router } from "@angular/router"
import { AuthService } from "../services/AuthServices/auth.service"

@Injectable({ providedIn: "root" })
export class SessionService {
    private idleTimeoutMs = 15 * 60 * 1000 // 15 minutes
    private idleTimer: any = null

    constructor(
        private ngZone: NgZone,
        private authService: AuthService,
        private router: Router,
    ) {
        this.startIdleWatch()
    }

    // Public API to reset timer (if any other module wants to ping)
    public resetIdleTimer(): void {
        if (!this.hasValidToken()) return
        this.setupTimer()
    }

    private startIdleWatch(): void {
        // Attach activity listeners
        const events = ["mousemove", "keydown", "click", "touchstart", "scroll"]
        events.forEach((evt) => {
            window.addEventListener(evt, () => this.resetIdleTimer(), { passive: true })
        })

        // Initialize timer if already logged in
        if (this.hasValidToken()) {
            this.setupTimer()
        }
    }

    private setupTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer)
        }

        // Run timer outside Angular to avoid unnecessary change detection
        this.ngZone.runOutsideAngular(() => {
            this.idleTimer = setTimeout(() => {
                // Back to Angular zone for navigation / state updates
                this.ngZone.run(() => {
                    if (this.hasValidToken()) {
                        this.authService.logout("idle") // will navigate to /login?reason=idle
                    }
                })
            }, this.idleTimeoutMs)
        })
    }

    private hasValidToken(): boolean {
        const token = localStorage.getItem("token")
        return !!token
    }
}