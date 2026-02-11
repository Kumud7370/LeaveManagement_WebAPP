import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take, Observable } from 'rxjs';
import { ApiClientService } from '../api/apiClient';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiClient = inject(ApiClientService);
  const router = inject(Router);

  // Check both sessionStorage and localStorage for token
  const token = sessionStorage.getItem('token') || localStorage.getItem('accessToken');
  const isAuthEndpoint = req.url.includes('/Auth/');

  let authReq = req;
  if (token && !isAuthEndpoint) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        return handle401Error(authReq, next, apiClient, router);
      }

      return throwError(() => error);
    })
  );
};

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  apiClient: ApiClientService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');

    if (refreshToken) {
      return apiClient.refreshToken().pipe(
        switchMap((response: any) => {
          isRefreshing = false;
          const newToken = response.accessToken || response.token;
          refreshTokenSubject.next(newToken);

          const clonedRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`
            }
          });
          return next(clonedRequest);
        }),
        catchError((err) => {
          isRefreshing = false;
          apiClient.clearTokens();
          router.navigate(['/login']);
          return throwError(() => err);
        })
      );
    } else {
      isRefreshing = false;
      apiClient.clearTokens();
      router.navigate(['/login']);
      return throwError(() => new Error('No refresh token available'));
    }
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        const clonedRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(clonedRequest);
      })
    );
  }
}