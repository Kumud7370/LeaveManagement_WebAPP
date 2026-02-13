// import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
// import { isPlatformBrowser, CommonModule } from '@angular/common';
// import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { Router } from '@angular/router';
// import { ApiClientService } from '../../core/services/api/apiClient';

// type Step = 'request' | 'verify' | 'reset' | 'success';

// // Define response interfaces
// interface ApiResponse {
//   success?: boolean;
//   message?: string;
//   data?: any;
// }

// @Component({
//   selector: 'app-forgot-password',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule],
//   templateUrl: './forgot-password.component.html',
//   styleUrls: ['./forgot-password.component.scss']
// })
// export class ForgotPasswordComponent implements OnInit {
//   step: Step = 'request';
//   requestOtpForm!: FormGroup;
//   verifyOtpForm!: FormGroup;
//   resetPasswordForm!: FormGroup;
  
//   isLoading = false;
//   error: string | null = null;
//   success: string | null = null;
//   countdown = 0;
//   showNewPassword = false;
//   showConfirmPassword = false;
  
//   private isBrowser: boolean;
//   private countdownInterval?: any;

//   constructor(
//     private fb: FormBuilder,
//     private router: Router,
//     private apiClient: ApiClientService,
//     @Inject(PLATFORM_ID) private platformId: Object
//   ) {
//     this.isBrowser = isPlatformBrowser(this.platformId);
//   }

//   ngOnInit(): void {
//     this.initializeForms();
//   }

//   ngOnDestroy(): void {
//     if (this.countdownInterval) {
//       clearInterval(this.countdownInterval);
//     }
//   }

//   private initializeForms(): void {
//     this.requestOtpForm = this.fb.group({
//       email: ['', [Validators.required, Validators.email]]
//     });

//     this.verifyOtpForm = this.fb.group({
//       otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
//     });

//     this.resetPasswordForm = this.fb.group({
//       newPassword: ['', [Validators.required, Validators.minLength(6)]],
//       confirmPassword: ['', [Validators.required]]
//     }, { validators: this.passwordMatchValidator });
//   }

//   private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
//     const newPassword = group.get('newPassword')?.value;
//     const confirmPassword = group.get('confirmPassword')?.value;
    
//     return newPassword === confirmPassword ? null : { passwordMismatch: true };
//   }

//   get requestF() {
//     return this.requestOtpForm.controls;
//   }

//   get verifyF() {
//     return this.verifyOtpForm.controls;
//   }

//   get resetF() {
//     return this.resetPasswordForm.controls;
//   }

//   formatTime(seconds: number): string {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   }

//   private startCountdown(seconds: number): void {
//     this.countdown = seconds;
    
//     if (this.countdownInterval) {
//       clearInterval(this.countdownInterval);
//     }

//     this.countdownInterval = setInterval(() => {
//       this.countdown--;
//       if (this.countdown <= 0) {
//         clearInterval(this.countdownInterval);
//       }
//     }, 1000);
//   }

//  async handleRequestOtp(): Promise<void> {
//   this.error = null;
//   this.success = null;

//   if (this.requestOtpForm.invalid) {
//     this.requestOtpForm.markAllAsTouched();
//     return;
//   }

//   this.isLoading = true;

//   try {
//     const email = this.requestOtpForm.value.email.trim().toLowerCase();
    
//     // Change this line to use the correct endpoint
//     const response = await this.apiClient.post('Auth/forgot-password', { 
//       email 
//     }).toPromise() as ApiResponse;

//     if (response && response.success !== false) {
//       this.success = response.message || 'OTP sent to your email';
//       this.startCountdown(180); // 3 minutes
//       this.step = 'verify';
//     } else {
//       throw new Error(response?.message || 'Failed to send OTP');
//     }
//   } catch (err: any) {
//     const errorMsg = err?.message || 'Failed to send OTP. Please try again.';
//     this.error = errorMsg;
//   } finally {
//     this.isLoading = false;
//   }
// }

//   async handleVerifyOtp(): Promise<void> {
//     this.error = null;
//     this.success = null;

//     if (this.verifyOtpForm.invalid) {
//       this.verifyOtpForm.markAllAsTouched();
//       return;
//     }

//     this.isLoading = true;

//     try {
//       const email = this.requestOtpForm.value.email.trim().toLowerCase();
//       const otp = this.verifyOtpForm.value.otp.trim();
      
//       // Call verify OTP endpoint
//       const response = await this.apiClient.post('Auth/forgot-password/verify-otp', { 
//         email, 
//         otp 
//       }).toPromise() as ApiResponse;

//       if (response && response.success !== false) {
//         this.success = response.message || 'OTP verified successfully';
//         this.step = 'reset';
//       } else {
//         throw new Error(response?.message || 'Invalid or expired OTP');
//       }
//     } catch (err: any) {
//       const errorMsg = err?.message || 'Invalid or expired OTP';
//       this.error = errorMsg;
//     } finally {
//       this.isLoading = false;
//     }
//   }

//   async handleResetPassword(): Promise<void> {
//     this.error = null;
//     this.success = null;

//     if (this.resetPasswordForm.invalid) {
//       this.resetPasswordForm.markAllAsTouched();
//       return;
//     }

//     this.isLoading = true;

//     try {
//       const email = this.requestOtpForm.value.email.trim().toLowerCase();
//       const otp = this.verifyOtpForm.value.otp.trim();
//       const newPassword = this.resetPasswordForm.value.newPassword;
      
//       // Call reset password endpoint with correct structure
//       const response = await this.apiClient.post('Auth/forgot-password/reset-password', { 
//         email, 
//         otp,
//         newPassword 
//       }).toPromise() as ApiResponse;

//       if (response && response.success !== false) {
//         this.success = response.message || 'Password reset successful!';
//         this.step = 'success';
        
//         // Auto-redirect after 2 seconds
//         setTimeout(() => {
//           this.router.navigate(['/login']);
//         }, 2000);
//       } else {
//         throw new Error(response?.message || 'Failed to reset password');
//       }
//     } catch (err: any) {
//       const errorMsg = err?.message || 'Failed to reset password';
//       this.error = errorMsg;
//     } finally {
//       this.isLoading = false;
//     }
//   }

//   async handleResendOtp(): Promise<void> {
//     this.verifyOtpForm.reset();
//     await this.handleRequestOtp();
//   }

//   onBackToLogin(): void {
//     this.router.navigate(['/login']);
//   }

//   togglePasswordVisibility(field: 'new' | 'confirm'): void {
//     if (field === 'new') {
//       this.showNewPassword = !this.showNewPassword;
//     } else {
//       this.showConfirmPassword = !this.showConfirmPassword;
//     }
//   }

//   onOtpInput(event: any): void {
//     const value = event.target.value.replace(/\D/g, '');
//     this.verifyOtpForm.patchValue({ otp: value.substring(0, 6) });
//   }
// }

import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ForgotPasswordApiService } from '../../../app/core/services/api/forgotpassword.api';

type Step = 'request' | 'verify' | 'reset' | 'success';

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: any;
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  step: Step = 'request';
  requestOtpForm!: FormGroup;
  verifyOtpForm!: FormGroup;
  resetPasswordForm!: FormGroup;
  
  isLoading = false;
  error: string | null = null;
  success: string | null = null;
  countdown = 0;
  showNewPassword = false;
  showConfirmPassword = false;
  
  private isBrowser: boolean;
  private countdownInterval?: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private forgotPasswordApi: ForgotPasswordApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.initializeForms();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private initializeForms(): void {
    this.requestOtpForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.verifyOtpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  get requestF() {
    return this.requestOtpForm.controls;
  }

  get verifyF() {
    return this.verifyOtpForm.controls;
  }

  get resetF() {
    return this.resetPasswordForm.controls;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private startCountdown(seconds: number): void {
    this.countdown = seconds;
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  async handleRequestOtp(): Promise<void> {
    this.error = null;
    this.success = null;

    if (this.requestOtpForm.invalid) {
      this.requestOtpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const email = this.requestOtpForm.value.email.trim().toLowerCase();
      const response = await this.forgotPasswordApi.requestOtp(email).toPromise() as ApiResponse;

      if (response && response.success !== false) {
        this.success = response.message || 'OTP sent to your email';
        this.startCountdown(180); // 3 minutes
        this.step = 'verify';
      } else {
        throw new Error(response?.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to send OTP. Please try again.';
      this.error = errorMsg;
    } finally {
      this.isLoading = false;
    }
  }

  async handleVerifyOtp(): Promise<void> {
    this.error = null;
    this.success = null;

    if (this.verifyOtpForm.invalid) {
      this.verifyOtpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const email = this.requestOtpForm.value.email.trim().toLowerCase();
      const otp = this.verifyOtpForm.value.otp.trim();
      
      const response = await this.forgotPasswordApi.verifyOtp(email, otp).toPromise() as ApiResponse;

      if (response && response.success !== false) {
        this.success = response.message || 'OTP verified successfully';
        this.step = 'reset';
      } else {
        throw new Error(response?.message || 'Invalid or expired OTP');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Invalid or expired OTP';
      this.error = errorMsg;
    } finally {
      this.isLoading = false;
    }
  }

  async handleResetPassword(): Promise<void> {
    this.error = null;
    this.success = null;

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const email = this.requestOtpForm.value.email.trim().toLowerCase();
      const otp = this.verifyOtpForm.value.otp.trim();
      const newPassword = this.resetPasswordForm.value.newPassword;
      
      const response = await this.forgotPasswordApi.resetPassword(email, otp, newPassword).toPromise() as ApiResponse;

      if (response && response.success !== false) {
        this.success = response.message || 'Password reset successful!';
        this.step = 'success';
        
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        throw new Error(response?.message || 'Failed to reset password');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to reset password';
      this.error = errorMsg;
    } finally {
      this.isLoading = false;
    }
  }

  async handleResendOtp(): Promise<void> {
    this.verifyOtpForm.reset();
    await this.handleRequestOtp();
  }

  onBackToLogin(): void {
    this.router.navigate(['/login']);
  }

  togglePasswordVisibility(field: 'new' | 'confirm'): void {
    if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onOtpInput(event: any): void {
    const value = event.target.value.replace(/\D/g, '');
    this.verifyOtpForm.patchValue({ otp: value.substring(0, 6) });
  }
}