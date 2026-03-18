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

  isLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    const token = sessionStorage.getItem('token') || localStorage.getItem('accessToken');
    return !!token;
  }

  getRole(): string {
    if (!this.isBrowser) return '';
    return sessionStorage.getItem('RoleName') || '';
  }


  isAdmin(): boolean {
    return this.getRole() === 'Admin';
  }

  isTehsildar(): boolean {
    return this.getRole() === 'Tehsildar';
  }

  isNayabTehsildar(): boolean {
    return this.getRole() === 'NayabTehsildar';
  }

  isEmployee(): boolean {
    return this.getRole() === 'Employee';
  }

  isHR(): boolean {
  return this.getRole() === 'HR';
}

getDepartmentId(): string {
  if (!this.isBrowser) return '';
  return sessionStorage.getItem('DepartmentId') || '';
}

  departmentId?: string;  
  departmentName?: string;

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