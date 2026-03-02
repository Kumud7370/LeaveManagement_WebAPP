import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartmentService } from '../../../core/services/api/department.api';
import { DepartmentDetail } from '../../../../app/core/Models/department.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-department-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './department-details.component.html',
  styleUrls: ['./department-details.component.scss']
})
export class DepartmentDetailsComponent implements OnInit {
  department: DepartmentDetail | null = null;
  loading = false;
  error: string | null = null;
  departmentId: string | null = null;

  activeTab: 'overview' | 'employees' | 'children' | 'audit' = 'overview';

  constructor(
    private departmentService: DepartmentService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.departmentId = this.route.snapshot.paramMap.get('id');
    if (this.departmentId) {
      this.loadDepartmentDetails();
    }
  }

  loadDepartmentDetails(): void {
    if (!this.departmentId) return;
    this.loading = true;
    this.error = null;

    this.departmentService.getDepartmentDetails(this.departmentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.department = response.data;
        } else {
          this.error = response.message || 'Failed to load department details';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'An error occurred';
        this.loading = false;
      }
    });
  }

  editDepartment(): void {
    if (this.departmentId) {
      this.router.navigate(['/departments', 'edit', this.departmentId]);
    }
  }

  async toggleStatus(): Promise<void> {
    if (!this.department || !this.departmentId) return;

    const action = this.department.isActive ? 'deactivate' : 'activate';
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${action} this department?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#3b82f6', cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`
    });

    if (result.isConfirmed) {
      const previousStatus = this.department.isActive;
      this.department = { ...this.department, isActive: !previousStatus };

      this.departmentService.toggleDepartmentStatus(this.departmentId).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({
              title: 'Success!',
              text: `Department has been ${action}d successfully.`,
              icon: 'success', timer: 1500, showConfirmButton: false
            });
          } else {
            this.department = { ...this.department!, isActive: previousStatus };
            Swal.fire({ title: 'Error!', text: response.message || 'Failed to update status', icon: 'error', confirmButtonColor: '#ef4444' });
          }
        },
        error: (err) => {
          this.department = { ...this.department!, isActive: previousStatus };
          Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error', confirmButtonColor: '#ef4444' });
        }
      });
    }
  }

  async deleteDepartment(): Promise<void> {
    if (!this.departmentId || !this.department) return;

    this.departmentService.canDeleteDepartment(this.departmentId).subscribe({
      next: async (canDeleteResponse) => {
        if (canDeleteResponse.success && canDeleteResponse.data) {
          const result = await Swal.fire({
            title: 'Are you sure?',
            html: `You are about to delete <strong>"${this.department?.departmentName}"</strong>.<br>This action cannot be undone.`,
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
          });

          if (result.isConfirmed) {
            this.router.navigate(['/departments']);

            this.departmentService.deleteDepartment(this.departmentId!).subscribe({
              next: (response) => {
                if (!response.success) {
                  Swal.fire({ title: 'Error!', text: response.message || 'Failed to delete department', icon: 'error', confirmButtonColor: '#ef4444' });
                }
              },
              error: (err) => {
                Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error', confirmButtonColor: '#ef4444' });
              }
            });
          }
        } else {
          Swal.fire({
            title: 'Cannot Delete',
            text: 'This department cannot be deleted. It has employees assigned.',
            icon: 'warning', confirmButtonColor: '#3b82f6'
          });
        }
      },
      error: (err) => {
        Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error', confirmButtonColor: '#ef4444' });
      }
    });
  }

  goBack(): void { this.router.navigate(['/departments']); }
  setActiveTab(tab: 'overview' | 'employees' | 'children' | 'audit'): void { this.activeTab = tab; }
  viewChildDepartment(childId: string): void { this.router.navigate(['/departments', childId]); }
  viewEmployee(employeeId: string): void { this.router.navigate(['/employees', employeeId]); }

  get formattedCreatedDate(): string {
    return this.department?.createdAt
      ? new Date(this.department.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
  }

  get formattedUpdatedDate(): string {
    return this.department?.updatedAt
      ? new Date(this.department.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
  }
}