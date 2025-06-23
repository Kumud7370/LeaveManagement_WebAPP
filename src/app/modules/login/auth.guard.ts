import { Injectable } from "@angular/core"
import { CanActivate, CanActivateChild, Router } from "@angular/router"

@Injectable({
    providedIn: "root",
})
export class AuthGuard implements CanActivate, CanActivateChild {
    constructor(private router: Router) { }
    canActivate(): boolean {
        return this.checkToken();
    }
    canActivateChild(): boolean {
        return this.checkToken();
    }
    private checkToken(): boolean {
        const token = localStorage.getItem('token');
        if (!token) {
            this.router.navigate(['/login']);
            return false;
        }
        return true;
    }
}
