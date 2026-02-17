import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AttendanceRegularizationService } from '../../../core/services/api/attendance-regularization.api';
import { RegularizationResponseDto } from '../../../core/Models/attendance-regularization.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-regularization-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './regularization-details.component.html',
  styleUrls: ['./regularization-details.component.scss']
})
export class RegularizationDetailsComponent implements OnInit {
  regularization: RegularizationResponseDto | null = null;
  loading = false;
  error: string | null = null;
  regularizationId: string | null = null;

  constructor(
    private regularizationService: AttendanceRegularizationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.regularizationId = this.route.snapshot.paramMap.get('id');
    if (this.regularizationId) {
      this.loadRegularizationDetails();
    }
  }

  loadRegularizationDetails(): void {
    if (!this.regularizationId) return;

    this.loading = true;
    this.error = null;

    this.regularizationService.getById(this.regularizationId).subscribe({
      next: (response) => {
        if (response.success) {
          this.regularization = response.data;
        } else {
          this.error = response.message || 'Failed to load regularization details';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'An error occurred';
        this.loading = false;
      }
    });
  }

  async approveRegularization(): Promise<void> {
    if (!this.regularizationId || !this.regularization) return;

    const result = await Swal.fire({
      title: 'Approve Request?',
      text: `Approve regularization request for ${this.regularization.employeeName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, approve it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.regularizationService.approveRegularization(this.regularizationId, {
        isApproved: true
      }).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({
              title: 'Success!',
              text: 'Regularization request has been approved successfully.',
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              timer: 2000
            });
            this.loadRegularizationDetails();
          } else {
            Swal.fire({
              title: 'Error!',
              text: response.message || 'Failed to approve request',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error!',
            text: err.error?.message || 'An error occurred',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  }

  async rejectRegularization(): Promise<void> {
    if (!this.regularizationId || !this.regularization) return;

    const { value: reason } = await Swal.fire({
      title: 'Reject Request',
      input: 'textarea',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter reason for rejection...',
      inputAttributes: {
        'aria-label': 'Enter reason for rejection'
      },
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason for rejection!';
        }
        return null;
      }
    });

    if (reason) {
      this.regularizationService.approveRegularization(this.regularizationId, {
        isApproved: false,
        rejectionReason: reason
      }).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({
              title: 'Success!',
              text: 'Regularization request has been rejected.',
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              timer: 2000
            });
            this.loadRegularizationDetails();
          } else {
            Swal.fire({
              title: 'Error!',
              text: response.message || 'Failed to reject request',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error!',
            text: err.error?.message || 'An error occurred',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  }

  async cancelRegularization(): Promise<void> {
    if (!this.regularizationId || !this.regularization) return;

    const result = await Swal.fire({
      title: 'Cancel Request?',
      text: 'Are you sure you want to cancel this regularization request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      this.regularizationService.cancelRegularization(this.regularizationId).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({
              title: 'Success!',
              text: 'Regularization request has been cancelled.',
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              timer: 2000
            }).then(() => {
              this.router.navigate(['/regularization']);
            });
          } else {
            Swal.fire({
              title: 'Error!',
              text: response.message || 'Failed to cancel request',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error!',
            text: err.error?.message || 'An error occurred',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/regularization']);
  }

  formatTime(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}