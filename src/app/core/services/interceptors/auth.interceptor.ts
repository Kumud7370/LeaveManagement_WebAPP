import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  let token: string | null = null;
  
  if (isBrowser) {
    token = sessionStorage.getItem('token') || localStorage.getItem('accessToken');
  }

  // Don't add auth to login/register endpoints
  const isAuthEndpoint = req.url.includes('/Auth/') 
                      || req.url.includes('/auth/')
                      || req.url.includes('/login') 
                      || req.url.includes('/register');

  let authReq = req;
  
  if (token && !isAuthEndpoint) {
    console.log(`🔑 Adding token to ${req.method} ${req.url}`);
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else if (!token && !isAuthEndpoint) {
    console.warn(`⚠️  No token for protected route: ${req.method} ${req.url}`);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        console.error('❌ 401 Unauthorized - Token invalid or expired');
        
        if (isBrowser) {
          // Clear everything
          sessionStorage.clear();
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          
          router.navigate(['/login'], { 
            queryParams: { 
              returnUrl: router.url,
              reason: 'session-expired' 
            } 
          });
        }
      } else if (error.status === 0) {
        console.error('❌ Network Error - API server not reachable');
      } else {
        console.error(`❌ HTTP Error ${error.status}:`, error.message);
      }
      
      return throwError(() => error);
    })
  );
};