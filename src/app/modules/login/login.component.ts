import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api/apiClient';
import { LanguageService }  from '../../core/services/api/language.api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading   = false;
  loginError  = '';
  loginInfo   = '';
  showPassword = false;
  deviceId    = '';
  private isBrowser: boolean;

  constructor(
    private fb:         FormBuilder,
    private router:     Router,
    private apiClient:  ApiClientService,
    public  langService: LanguageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    if (this.isBrowser) {
      this.deviceId = this.getOrCreateDeviceId();
    }
  }

  get f() { return this.loginForm.controls; }

  private getOrCreateDeviceId(): string {
    if (!this.isBrowser) return 'ssr-device-' + Date.now();
    let deviceId = sessionStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device-' +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }

  navigateToForgotPassword(): void { this.router.navigate(['/forgot-password']); }

  onLogin(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }

    this.isLoading  = true;
    this.loginError = '';

    const credentials = {
      username: this.loginForm.value.username,
      password: this.loginForm.value.password,
      deviceId: this.deviceId
    };

    this.apiClient.loginUser(credentials).subscribe({
      next: (response: any) => {
        if (response.accessToken) {
          sessionStorage.setItem('token',        response.accessToken);
          sessionStorage.setItem('refreshToken', response.refreshToken ?? '');

          const user = response.user;
          if (user) {
            sessionStorage.setItem('UserId',     user.id         ?? '');
            sessionStorage.setItem('username',   user.username   ?? '');
            sessionStorage.setItem('Email',      user.email      ?? '');
            sessionStorage.setItem('FirstName',  user.firstName  ?? '');
            sessionStorage.setItem('LastName',   user.lastName   ?? '');
            if (user.employeeId)   sessionStorage.setItem('EmployeeId',   user.employeeId);
            if (user.departmentId) sessionStorage.setItem('DepartmentId', user.departmentId);
            if (user.roles?.length) sessionStorage.setItem('RoleName',    user.roles[0]);
          }

          this.router.navigate(['/dashboard']);
        } else {
          this.loginError = this.langService.t('login.error.invalidResponse');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        this.loginError = error.message || this.langService.t('login.error.invalidCredentials');
        this.isLoading  = false;
      }
    });
  }
}