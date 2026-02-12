import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartmentService } from '../../../core/services/api/department.api';
import { DepartmentDetail } from '../../../../app/core/Models/department.model';

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
    if (confirm(`Are you sure you want to ${action} this department?`)) {
      this.departmentService.toggleDepartmentStatus(this.departmentId).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadDepartmentDetails();
          } else {
            alert(response.message || 'Failed to update status');
          }
        },
        error: (err) => {
          alert(err.error?.message || 'An error occurred');
        }
      });
    }
  }

  async deleteDepartment(): Promise<void> {
    if (!this.departmentId || !this.department) return;

    // Check if can delete
    this.departmentService.canDeleteDepartment(this.departmentId).subscribe({
      next: (canDeleteResponse) => {
        if (canDeleteResponse.success && canDeleteResponse.data) {
          if (confirm(`Are you sure you want to delete "${this.department?.departmentName}"? This action cannot be undone.`)) {
            this.departmentService.deleteDepartment(this.departmentId!).subscribe({
              next: (response) => {
                if (response.success) {
                  this.router.navigate(['/departments']);
                } else {
                  alert(response.message || 'Failed to delete department');
                }
              },
              error: (err) => {
                alert(err.error?.message || 'An error occurred');
              }
            });
          }
        } else {
          alert('Cannot delete this department. It has employees or child departments.');
        }
      },
      error: (err) => {
        alert(err.error?.message || 'An error occurred');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/departments']);
  }

  setActiveTab(tab: 'overview' | 'employees' | 'children' | 'audit'): void {
    this.activeTab = tab;
  }

  viewChildDepartment(childId: string): void {
    this.router.navigate(['/departments', childId]);
  }

  viewEmployee(employeeId: string): void {
    this.router.navigate(['/employees', employeeId]);
  }

  get formattedCreatedDate(): string {
    return this.department?.createdAt 
      ? new Date(this.department.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : '';
  }

  get formattedUpdatedDate(): string {
    return this.department?.updatedAt 
      ? new Date(this.department.updatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : '';
  }
}