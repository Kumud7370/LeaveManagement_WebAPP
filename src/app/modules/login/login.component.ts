import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api/apiClient';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  loginError = '';
  loginInfo = '';
  showPassword = false;
  deviceId = '';
  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiClient: ApiClientService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Initialize the login form
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    if (this.isBrowser) {
      this.deviceId = this.getOrCreateDeviceId();
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  private getOrCreateDeviceId(): string {
    if (!this.isBrowser) {
      return 'ssr-device-' + Date.now();
    }

    let deviceId = sessionStorage.getItem('deviceId');
    
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('deviceId', deviceId);
    }
    
    return deviceId;
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Navigate to forgot password page
  navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  // Navigate to register page
  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.loginError = '';

      const credentials = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password,
        deviceId: this.deviceId
      };

      this.apiClient.loginUser(credentials).subscribe({
        next: (response: any) => {
          console.log('Login successful:', response);
          
          if (response.accessToken) {
            this.router.navigate(['/dashboard']);
          } else {
            this.loginError = 'Invalid response from server. Please try again.';
          }
          
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Login error:', error);
          this.loginError = error.message || 'Invalid username or password. Please try again.';
          this.isLoading = false;
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}