// import { isPlatformBrowser } from "@angular/common";
// import { Inject, Injectable, PLATFORM_ID } from "@angular/core"
// import { CanActivate, CanActivateChild, Router } from "@angular/router"

// @Injectable({
//     providedIn: "root",
// })
// export class AuthGuard implements CanActivate, CanActivateChild {
//   constructor(
//     private router: Router,
//     @Inject(PLATFORM_ID) private platformId: Object
//   ) {}

//   canActivate(): boolean {
//     return this.checkToken();
//   }

//   canActivateChild(): boolean {
//     return this.checkToken();
//   }

//   private checkToken(): boolean {
//     // ✅ Check if running in the browser
//     if (isPlatformBrowser(this.platformId)) {
//       const token = localStorage.getItem('token');
//       if (!token) {
//         this.router.navigate(['/login']);
//         return false;
//       }
//       return true;
//     }

//     // On the server: Assume user is unauthenticated
//     return false;
//   }
// }
import { isPlatformBrowser } from "@angular/common"
import { Injectable, Inject, PLATFORM_ID } from "@angular/core"
import { CanActivate, CanActivateChild, Router } from "@angular/router"
import { SessionService } from "../../core/services/session.service"

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private session: SessionService
  ) {}

  canActivate(): boolean {
    return this.checkToken()
  }

  canActivateChild(): boolean {
    return this.checkToken()
  }

  private checkToken(): boolean {
    // ✅ Run only in browser environment
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem("token")

      // No token → redirect to login
      if (!token) {
        this.router.navigate(["/login"])
        return false
      }

      // Token exists → reset idle timer
      this.session.resetIdleTimer()
      return true
    }

    // Not in browser (e.g., SSR) → block access
    return false
  }
}