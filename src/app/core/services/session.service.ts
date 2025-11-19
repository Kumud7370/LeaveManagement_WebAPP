import { Injectable, NgZone, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Router } from "@angular/router";
import { AuthService } from "../services/AuthServices/auth.service";

@Injectable({ providedIn: "root" })
export class SessionService {
    private idleTimeoutMs = 5 * 60 * 1000; // 15 minutes
    private idleTimer: any = null;
    private isBrowser: boolean;

    constructor(
        private ngZone: NgZone,
        private authService: AuthService,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(this.platformId);

        if (this.isBrowser) {
            this.startIdleWatch();
        }
    }

    public resetIdleTimer(): void {
        if (!this.isBrowser || !this.hasValidToken()) return;
        this.setupTimer();
    }

    private startIdleWatch(): void {
        if (!this.isBrowser) return;

        const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
        events.forEach((evt) => {
            window.addEventListener(evt, () => this.resetIdleTimer(), { passive: true });
        });

        if (this.hasValidToken()) {
            this.setupTimer();
        }
    }

    private setupTimer(): void {
        if (!this.isBrowser) return;

        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }

        this.ngZone.runOutsideAngular(() => {
            this.idleTimer = setTimeout(() => {
                this.ngZone.run(() => {
                    if (this.hasValidToken()) {
                        this.authService.logout("idle");
                    }
                });
            }, this.idleTimeoutMs);
        });
    }

    private hasValidToken(): boolean {
        if (!this.isBrowser) return false;
        const token = sessionStorage.getItem("token");
        return !!token;
    }
}
