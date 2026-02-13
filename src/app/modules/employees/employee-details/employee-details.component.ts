import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { EmployeeService } from '../../../../app/core/services/api/employee.api';
import {
  EmployeeResponseDto,
  EmployeeStatus,
  EmploymentType,
  Gender
} from '../../../../app/core/Models/employee.model';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-details.component.html',
  styleUrls: ['./employee-details.component.scss']
})
export class EmployeeDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  employee: EmployeeResponseDto | null = null;
  isLoading = true;
  employeeId: string = '';

  // Enums for display
  EmployeeStatus = EmployeeStatus;
  EmploymentType = EmploymentType;
  Gender = Gender;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.employeeId = params['id'];
      if (this.employeeId) {
        this.loadEmployeeDetails();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmployeeDetails(): void {
    this.isLoading = true;
    this.employeeService.getEmployeeById(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.employee = employee;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading employee details:', error);
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load employee details.',
            confirmButtonColor: '#1a2a6c'
          }).then(() => {
            this.router.navigate(['/employees']);
          });
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/employees']);
  }

  editEmployee(): void {
    this.router.navigate(['/employees', 'edit', this.employeeId]);
  }

  deleteEmployee(): void {
    if (!this.employee) return;

    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete employee "${this.employee.fullName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b21f1f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performDelete();
      }
    });
  }

  private performDelete(): void {
    this.employeeService.deleteEmployee(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Employee has been deleted successfully.',
            timer: 2000,
            showConfirmButton: false
          });
          this.router.navigate(['/employees']);
        },
        error: (error) => {
          console.error('Error deleting employee:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to delete employee.',
            confirmButtonColor: '#1a2a6c'
          });
        }
      });
  }

  changeStatus(newStatus: EmployeeStatus): void {
    if (!this.employee) return;

    Swal.fire({
      title: 'Change Employee Status?',
      text: `Change status to ${EmployeeStatus[newStatus]}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1a2a6c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, change it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performStatusChange(newStatus);
      }
    });
  }

  private performStatusChange(newStatus: EmployeeStatus): void {
    this.employeeService.changeEmployeeStatus(this.employeeId, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Employee status updated successfully.',
            timer: 2000,
            showConfirmButton: false
          });
          this.loadEmployeeDetails();
        },
        error: (error) => {
          console.error('Error changing status:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update employee status.',
            confirmButtonColor: '#1a2a6c'
          });
        }
      });
  }

  // Helper methods
  getStatusBadgeClass(status: EmployeeStatus): string {
    switch (status) {
      case EmployeeStatus.Active:
        return 'badge-success';
      case EmployeeStatus.Inactive:
        return 'badge-secondary';
      case EmployeeStatus.OnLeave:
        return 'badge-info';
      case EmployeeStatus.Suspended:
        return 'badge-warning';
      case EmployeeStatus.Terminated:
      case EmployeeStatus.Resigned:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getEmploymentTypeBadgeClass(type: EmploymentType): string {
    switch (type) {
      case EmploymentType.FullTime:
        return 'badge-primary';
      case EmploymentType.PartTime:
        return 'badge-info';
      case EmploymentType.Contract:
        return 'badge-warning';
      case EmploymentType.Intern:
        return 'badge-secondary';
      case EmploymentType.Temporary:
        return 'badge-light';
      default:
        return 'badge-secondary';
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getGenderIcon(gender: Gender): string {
    switch (gender) {
      case Gender.Male:
        return 'fas fa-mars';
      case Gender.Female:
        return 'fas fa-venus';
      default:
        return 'fas fa-genderless';
    }
  }

  getFullAddress(): string {
    if (!this.employee?.address) return 'N/A';
    const addr = this.employee.address;
    return `${addr.street}, ${addr.city}, ${addr.state}, ${addr.country} - ${addr.postalCode}`;
  }

  printEmployeeDetails(): void {
    window.print();
  }

  downloadEmployeeCard(): void {
    Swal.fire({
      icon: 'info',
      title: 'Coming Soon',
      text: 'Employee card download feature will be available soon.',
      confirmButtonColor: '#1a2a6c'
    });
  }
}