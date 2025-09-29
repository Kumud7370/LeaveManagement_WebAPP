import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Router } from "@angular/router"
import { DbCallingService } from "src/app/core/services/db-calling.service"


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  isLoading = false;
  loginError = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dbService: DbCallingService
  ) { }
  getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  ngOnInit() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required]],
      rememberMe: [false],
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { username, password } = this.loginForm.value;
    const deviceId = this.getDeviceId();
    this.dbService.loginUser({ username, password, deviceId }).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          // Login successful
          sessionStorage.setItem('UserId', res.data.userId);
          sessionStorage.setItem('SiteName', res.data.locationName);
             sessionStorage.setItem('RoleName', res.data.roleName);
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('username', username);
          localStorage.setItem('role', res.data.role);
          this.router.navigate(['/app/dashboard']);
        } else {
          this.loginError = 'Invalid username or password';
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        this.loginError = 'Login failed. Please try again.';
        this.isLoading = false;
      },
    });
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    console.log('Forgot password clicked');
  }

  onSignUp(event: Event) {
    event.preventDefault();
    console.log('Sign up clicked');
  }
}