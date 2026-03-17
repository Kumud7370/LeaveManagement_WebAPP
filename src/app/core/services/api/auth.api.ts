// import { Injectable, Inject, PLATFORM_ID } from "@angular/core"
// import { Router } from "@angular/router"
// import { isPlatformBrowser } from "@angular/common"

// @Injectable({
//     providedIn: "root",
// })
// export class AuthService {
//     private isBrowser: boolean

//     constructor(
//         private router: Router,
//         @Inject(PLATFORM_ID) private platformId: Object
//     ) {
//         this.isBrowser = isPlatformBrowser(this.platformId)
//     }

//     login(username: string, password: string): boolean {
//         // Static credentials check
//         if (username === "admin" && password === "password") {
//             return true
//         }
//         return false
//     }

//     isLoggedIn(): boolean {
//         if (!this.isBrowser) return false
        
//         const token = sessionStorage.getItem("token") || localStorage.getItem("accessToken")
//         return !!token
//     }

//     redirectToLogin(): void {
//         if (!this.isLoggedIn()) {
//             this.router.navigate(["/login"])
//         }
//     }

//     redirectToDashboard(): void {
//         if (this.isLoggedIn()) {
//             this.router.navigate(["/dashboard"])
//         }
//     }

//     logout(reason?: "idle" | "expired" | "manual"): void {
//         if (!this.isBrowser) return

//         try {
//             sessionStorage.removeItem("UserId")
//             sessionStorage.removeItem("EmployeeId") 
//             sessionStorage.removeItem("SiteName")
//             sessionStorage.removeItem("RoleName")
//             sessionStorage.removeItem("token")
//             sessionStorage.removeItem("refreshToken")
//             sessionStorage.removeItem("username")
//             sessionStorage.removeItem("role")
//             sessionStorage.removeItem("deviceId")
            
//             localStorage.removeItem("accessToken")
//             localStorage.removeItem("refreshToken")
//         } catch (_) {
//         }

//         const queryParams: any = {}
//         if (reason) queryParams["reason"] = reason

//         this.router.navigate(["/login"], { queryParams })
//     }
// }


import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Returns true if a valid access token exists in storage.
   * The actual credential validation happens on the backend via ApiClientService.loginUser().
   */
  isLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    const token = sessionStorage.getItem('token') || localStorage.getItem('accessToken');
    return !!token;
  }

  /**
   * Returns the current user's role from session storage.
   * Possible values: "Admin" | "Tehsildar" | "NayabTehsildar" | "Employee"
   */
  getRole(): string {
    if (!this.isBrowser) return '';
    return sessionStorage.getItem('RoleName') || '';
  }

  /** Returns true if the current user is an Admin. */
  isAdmin(): boolean {
    return this.getRole() === 'Admin';
  }

  /** Returns true if the current user is a Tehsildar. */
  isTehsildar(): boolean {
    return this.getRole() === 'Tehsildar';
  }

  /** Returns true if the current user is a NayabTehsildar. */
  isNayabTehsildar(): boolean {
    return this.getRole() === 'NayabTehsildar';
  }

  /** Returns true if the current user is an Employee. */
  isEmployee(): boolean {
    return this.getRole() === 'Employee';
  }

  redirectToLogin(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
    }
  }

  redirectToDashboard(): void {
    if (this.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  logout(reason?: 'idle' | 'expired' | 'manual'): void {
    if (!this.isBrowser) return;

    try {
      sessionStorage.removeItem('UserId');
      sessionStorage.removeItem('EmployeeId');
      sessionStorage.removeItem('SiteName');
      sessionStorage.removeItem('RoleName');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('deviceId');
      sessionStorage.removeItem('Email');
      sessionStorage.removeItem('FirstName');
      sessionStorage.removeItem('LastName');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (_) {}

    const queryParams: any = {};
    if (reason) queryParams['reason'] = reason;
    this.router.navigate(['/login'], { queryParams });
  }
}