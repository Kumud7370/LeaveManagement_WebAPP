import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminInvitationService } from '../../../core/services/api/admin-invitation.api';
import { ValidateTokenResponse, AcceptInvitationDto } from '../../../core/Models/admin-invitation.model';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './accept-invitation.component.html',
  styleUrls: ['./accept-invitation.component.scss']
})
export class AcceptInvitationComponent implements OnInit {
  acceptForm!: FormGroup;
  loading = true;
  submitting = false;
  error: string | null = null;
  success = false;

  token = '';
  invitationData: ValidateTokenResponse['data'] | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private invitationService: AdminInvitationService
  ) {}

  ngOnInit(): void {
    // Get token from URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.validateToken(this.token);
      } else {
        this.error = 'Invalid invitation link - missing token';
        this.loading = false;
      }
    });

    this.initializeForm();
  }

  initializeForm(): void {
    this.acceptForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  validateToken(token: string): void {
    this.loading = true;
    this.error = null;

    this.invitationService.validateToken(token).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.invitationData = response.data;
          
          // Pre-fill form with invitation data
          this.acceptForm.patchValue({
            firstName: response.data.firstName,
            lastName: response.data.lastName
          });
          
          this.error = null;
        } else {
          this.error = response.message || 'Invalid invitation token';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Invalid or expired invitation link';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.acceptForm.invalid) {
      this.markFormGroupTouched(this.acceptForm);
      return;
    }

    this.submitting = true;
    this.error = null;

    const formValue = this.acceptForm.value;
    const acceptData: AcceptInvitationDto = {
      token: this.token,
      username: formValue.username,
      password: formValue.password,
      firstName: formValue.firstName,
      lastName: formValue.lastName
    };

    this.invitationService.acceptInvitation(acceptData).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = true;
          
          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.error = response.message || 'Failed to accept invitation';
          this.submitting = false;
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to accept invitation. Token may be invalid, expired, or username already exists.';
        this.submitting = false;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.acceptForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Minimum length is ${minLength} characters`;
    }
    if (fieldName === 'confirmPassword' && this.acceptForm.hasError('mismatch')) {
      return 'Passwords do not match';
    }
    
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.acceptForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}