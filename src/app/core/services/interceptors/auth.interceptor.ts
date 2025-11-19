import { inject } from "@angular/core"
import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http"
import { Router } from "@angular/router"
import { AuthService } from "../../services/AuthServices/auth.service"
import { catchError } from "rxjs/operators"
import { throwError } from "rxjs"

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService)
    const router = inject(Router)

    const token = sessionStorage.getItem("token")
    const cloned = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req

    return next(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error && (error.status === 401 || error.status === 403)) {
                // Session likely expired or unauthorized – perform logout and redirect with message
                authService.logout("expired") // navigates to /login?reason=expired
            }
            return throwError(() => error)
        }),
    )
}