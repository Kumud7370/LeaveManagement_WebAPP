import { isPlatformBrowser } from "@angular/common";
import { Inject, Injectable, PLATFORM_ID } from "@angular/core"
import { CanActivate, CanActivateChild, Router } from "@angular/router"

@Injectable({
    providedIn: "root",
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(): boolean {
    return this.checkToken();
  }

  canActivateChild(): boolean {
    return this.checkToken();
  }

  private checkToken(): boolean {
    // ✅ Check if running in the browser
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (!token) {
        this.router.navigate(['/login']);
        return false;
      }
      return true;
    }

    // On the server: Assume user is unauthenticated
    return false;
  }
}
