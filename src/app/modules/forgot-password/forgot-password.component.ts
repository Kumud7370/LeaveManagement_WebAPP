import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ForgotPasswordApiService } from '../../../app/core/services/api/forgotpassword.api';
import { LanguageService }          from '../../../app/core/services/api/language.api';

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
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  step: Step = 'request';
  requestOtpForm!:   FormGroup;
  verifyOtpForm!:    FormGroup;
  resetPasswordForm!: FormGroup;

  isLoading           = false;
  error:  string | null = null;
  success: string | null = null;
  countdown           = 0;
  showNewPassword     = false;
  showConfirmPassword = false;

  private isBrowser: boolean;
  private countdownInterval?: any;

  constructor(
    private fb:                 FormBuilder,
    private router:             Router,
    private forgotPasswordApi:  ForgotPasswordApiService,
    public  langService:        LanguageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit():  void { this.initializeForms(); }
  ngOnDestroy(): void { if (this.countdownInterval) clearInterval(this.countdownInterval); }

  private initializeForms(): void {
    this.requestOtpForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
    this.verifyOtpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
    this.resetPasswordForm = this.fb.group({
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np === cp ? null : { passwordMismatch: true };
  }

  get requestF() { return this.requestOtpForm.controls; }
  get verifyF()  { return this.verifyOtpForm.controls; }
  get resetF()   { return this.resetPasswordForm.controls; }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private startCountdown(seconds: number): void {
    this.countdown = seconds;
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) clearInterval(this.countdownInterval);
    }, 1000);
  }

  async handleRequestOtp(): Promise<void> {
    this.error = null; this.success = null;
    if (this.requestOtpForm.invalid) { this.requestOtpForm.markAllAsTouched(); return; }
    this.isLoading = true;
    try {
      const email    = this.requestOtpForm.value.email.trim().toLowerCase();
      const response = await this.forgotPasswordApi.requestOtp(email).toPromise() as ApiResponse;
      if (response && response.success !== false) {
        this.success = response.message || this.langService.t('fp.otpSent');
        this.startCountdown(180);
        this.step = 'verify';
      } else {
        throw new Error(response?.message || this.langService.t('fp.error.sendFailed'));
      }
    } catch (err: any) {
      this.error = err?.message || this.langService.t('fp.error.sendFailed');
    } finally { this.isLoading = false; }
  }

  async handleVerifyOtp(): Promise<void> {
    this.error = null; this.success = null;
    if (this.verifyOtpForm.invalid) { this.verifyOtpForm.markAllAsTouched(); return; }
    this.isLoading = true;
    try {
      const email    = this.requestOtpForm.value.email.trim().toLowerCase();
      const otp      = this.verifyOtpForm.value.otp.trim();
      const response = await this.forgotPasswordApi.verifyOtp(email, otp).toPromise() as ApiResponse;
      if (response && response.success !== false) {
        this.success = response.message || this.langService.t('fp.otpVerified');
        this.step    = 'reset';
      } else {
        throw new Error(response?.message || this.langService.t('fp.error.otpInvalid'));
      }
    } catch (err: any) {
      this.error = err?.message || this.langService.t('fp.error.otpInvalid');
    } finally { this.isLoading = false; }
  }

  async handleResetPassword(): Promise<void> {
    this.error = null; this.success = null;
    if (this.resetPasswordForm.invalid) { this.resetPasswordForm.markAllAsTouched(); return; }
    this.isLoading = true;
    try {
      const email       = this.requestOtpForm.value.email.trim().toLowerCase();
      const otp         = this.verifyOtpForm.value.otp.trim();
      const newPassword = this.resetPasswordForm.value.newPassword;
      const response    = await this.forgotPasswordApi.resetPassword(email, otp, newPassword).toPromise() as ApiResponse;
      if (response && response.success !== false) {
        this.success = response.message || this.langService.t('fp.resetSuccess');
        this.step    = 'success';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      } else {
        throw new Error(response?.message || this.langService.t('fp.error.resetFailed'));
      }
    } catch (err: any) {
      this.error = err?.message || this.langService.t('fp.error.resetFailed');
    } finally { this.isLoading = false; }
  }

  async handleResendOtp(): Promise<void> {
    this.verifyOtpForm.reset();
    await this.handleRequestOtp();
  }

  onBackToLogin(): void { this.router.navigate(['/login']); }

  togglePasswordVisibility(field: 'new' | 'confirm'): void {
    if (field === 'new') this.showNewPassword = !this.showNewPassword;
    else this.showConfirmPassword = !this.showConfirmPassword;
  }

  onOtpInput(event: any): void {
    const value = event.target.value.replace(/\D/g, '');
    this.verifyOtpForm.patchValue({ otp: value.substring(0, 6) });
  }
}