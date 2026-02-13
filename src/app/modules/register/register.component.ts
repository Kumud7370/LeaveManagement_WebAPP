import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api/apiClient';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  error: string | null = null;
  success: string | null = null;
  showPassword = false;
  showConfirmPassword = false;
  
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
    this.initializeForm();
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  get f() {
    return this.registerForm.controls;
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  async onRegister(): Promise<void> {
    this.error = null;
    this.success = null;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const { confirmPassword, ...userData } = this.registerForm.value;
      
      const response = await this.apiClient.register(userData).toPromise();

      if (response && (response.success !== false)) {
        this.success = response.message || 'Registration successful! Redirecting to login...';
        this.registerForm.reset();
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        throw new Error(response?.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error('[Register] Error:', err);
      const errorMsg = err?.message || 'Registration failed. Please try again.';
      this.error = errorMsg;
    } finally {
      this.isLoading = false;
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}