import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

/**
 * Public self-registration has been removed from this system.
 * All user accounts are created directly by the Admin via the
 * Admin Management panel (POST /api/admin-management/users).
 *
 * This component now simply redirects to the login page.
 * You can safely delete this component and its route if you no longer need it.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:linear-gradient(135deg,#2E3B73 0%,#5A4A7E 50%,#8E4B60 100%);
      font-family:'Inter','Segoe UI',sans-serif;
    ">
      <div style="
        background:#fff;
        border-radius:16px;
        padding:3rem 2.5rem;
        max-width:420px;
        width:100%;
        text-align:center;
        box-shadow:0 25px 50px rgba(0,0,0,0.25);
      ">
        <div style="
          width:64px;height:64px;
          background:linear-gradient(135deg,#2E3B73,#8E4B60);
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 1.5rem;
        ">
          <i class="fas fa-lock" style="color:#fff;font-size:1.5rem;"></i>
        </div>

        <h2 style="font-size:1.5rem;font-weight:700;color:#1e293b;margin:0 0 0.75rem;">
          Registration Disabled
        </h2>

        <p style="color:#64748b;margin:0 0 0.5rem;line-height:1.6;">
          Public registration is not available in this system.
        </p>
        <p style="color:#64748b;margin:0 0 2rem;line-height:1.6;">
          Contact your <strong>Admin</strong> to get your login credentials.
        </p>

        <button
          (click)="goToLogin()"
          style="
            width:100%;padding:0.875rem;
            background:linear-gradient(135deg,#2E3B73,#8E4B60);
            color:#fff;border:none;border-radius:50px;
            font-size:1rem;font-weight:600;cursor:pointer;
            transition:opacity 0.2s;
          "
          onmouseover="this.style.opacity='0.9'"
          onmouseout="this.style.opacity='1'"
        >
          Go to Login
        </button>
      </div>
    </div>
  `
})
export class RegisterComponent implements OnInit {
  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Auto-redirect after 3 seconds
    if (this.isBrowser) {
      setTimeout(() => this.router.navigate(['/login']), 3000);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}