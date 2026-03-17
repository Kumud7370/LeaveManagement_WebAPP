import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  ViewEncapsulation, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef, GridApi, GridReadyEvent,
  ModuleRegistry, AllCommunityModule
} from 'ag-grid-community';

import { UserManagementService } from '../../core/services/api/user-management.api';
import { EmployeeService } from '../../core/services/api/employee.api';
import { AdminCreatableRole, CreateUserDto, UserResponseDto } from '../../core/Models/admin-management.model';
import { EmployeeResponseDto } from '../../core/Models/employee.model';
import { UserActionCellRendererComponent } from './user-action-cell-renderer.component';

ModuleRegistry.registerModules([AllCommunityModule]);

type ModalMode = 'createEmployee' | 'createSenior' | 'resetPassword' | 'viewDetails' | null;

@Component({
  selector: 'app-user-management',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AgGridAngular, UserActionCellRendererComponent],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  gridApi!: GridApi;
  context = { componentParent: this };

  users: UserResponseDto[] = [];
  unlinkedEmployees: EmployeeResponseDto[] = [];
  rowData: UserResponseDto[] = [];   // ← stable array fed to grid, never a getter

  loading = false;
  error: string | null = null;

  stats = { total: 0, active: 0, inactive: 0, tehsildar: 0 };

  searchTerm = '';
  private searchTimer: any = null;

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;
  pages: number[] = [];
  Math = Math;

  modalMode: ModalMode = null;
  submitting = false;
  modalError: string | null = null;
  targetUser: UserResponseDto | null = null;
  generatedCredentials: { username: string; password: string; role: string } | null = null;

  employeeUserForm!: FormGroup;
  seniorUserForm!: FormGroup;
  resetPasswordForm!: FormGroup;

  private resizeTimer: any = null;

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true, resizable: true, minWidth: 80,
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      width: 148, minWidth: 148, maxWidth: 148,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellRenderer: UserActionCellRendererComponent,
      suppressSizeToFit: true,
    },
    { headerName: 'Username', field: 'username', minWidth: 140 },
    {
      headerName: 'Full Name', minWidth: 160,
      valueGetter: (p: any) => `${p.data?.firstName ?? ''} ${p.data?.lastName ?? ''}`.trim() || '—',
    },
    { headerName: 'Email', field: 'email', minWidth: 190 },
    {
      headerName: 'Role', minWidth: 155,
      valueGetter: (p: any) => {
        const r = p.data?.roles;
        return Array.isArray(r) ? (r[0] ?? '—') : (r ?? '—');
      },
      cellRenderer: (p: any) => {
        const role = p.value || '—';
        const map: Record<string, [string, string]> = {
          Admin: ['#dbeafe', '#1d4ed8'], Tehsildar: ['#f3e8ff', '#7c3aed'],
          NayabTehsildar: ['#e0e7ff', '#4338ca'], Employee: ['#d1fae5', '#065f46'],
        };
        const [bg, color] = map[role] ?? ['#f3f4f6', '#374151'];
        return `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;
  background:${bg};color:${color};font-size:12px;font-weight:600;line-height:1.4;">${role}</span>`;
      }
    },
    {
      headerName: 'Status', width: 110,
      valueGetter: (p: any) => p.data?.isActive ? 'Active' : 'Inactive',
      cellRenderer: (p: any) => p.value === 'Active'
        ? `<span style="display:inline-block;padding:2px 12px;border-radius:9999px;font-size:12px;font-weight:600;background:#dcfce7;color:#166534;line-height:1.4;">● Active</span>`
        : `<span style="display:inline-block;padding:2px 12px;border-radius:9999px;font-size:12px;font-weight:600;background:#fee2e2;color:#991b1b;line-height:1.4;">● Inactive</span>`
    },
    {
      headerName: 'Created', minWidth: 120,
      valueGetter: (p: any) => p.data?.createdAt || '',
      valueFormatter: (p: any) => {
        const v = p.data?.createdAt;
        if (!v) return '—';
        const d = new Date(v);
        const day = d.getDate();
        const month = d.toLocaleString('en-GB', { month: 'short' });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      }
    }
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserManagementService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void { this.initForms(); this.loadUsers(); }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    clearTimeout(this.resizeTimer); clearTimeout(this.searchTimer);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this.scheduleFit(); }
  private scheduleFit(ms = 300): void {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.gridApi?.sizeColumnsToFit(), ms);
  }

  onGridReady(e: GridReadyEvent): void {
    this.gridApi = e.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  // ── Forms ──────────────────────────────────────────────────────

  private initForms(): void {
    this.employeeUserForm = this.fb.group({
      employeeId: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
    this.seniorUserForm = this.fb.group({
      role: ['Tehsildar', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  // ── Data ───────────────────────────────────────────────────────

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.userService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
        this.computeStats();
        this.applyPage();          // sets rowData, totalCount, totalPages, pages
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load users. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private computeStats(): void {
    this.stats.total = this.users.length;
    this.stats.active = this.users.filter(u => u.isActive).length;
    this.stats.inactive = this.users.filter(u => !u.isActive).length;
    this.stats.tehsildar = this.users.filter(u =>
      u.roles?.some(r => r === 'Tehsildar' || r === 'NayabTehsildar')
    ).length;
  }

  /**
   * Single source of truth for pagination state.
   * Always call this instead of touching rowData / totalCount / pages directly.
   */
  private applyPage(): void {
    const filtered = this.filteredUsers();
    this.totalCount = filtered.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
    // clamp currentPage
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    const start = (this.currentPage - 1) * this.pageSize;
    this.rowData = filtered.slice(start, start + this.pageSize);

    // page number buttons (max 5)
    const max = 5;
    let s = Math.max(1, this.currentPage - Math.floor(max / 2));
    const e = Math.min(this.totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    this.pages = Array.from({ length: e - s + 1 }, (_, i) => s + i);

    // push to grid if ready
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
    }
  }

  private filteredUsers(): UserResponseDto[] {
    if (!this.searchTerm.trim()) return this.users;
    const q = this.searchTerm.toLowerCase();
    return this.users.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.roles?.some(r => r.toLowerCase().includes(q))
    );
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.applyPage();
      this.cdr.detectChanges();
    }, 350);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.applyPage();
    this.cdr.detectChanges();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.applyPage();
    this.cdr.detectChanges();
  }

  onPageSizeChange(e: Event): void {
    this.pageSize = +(e.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.applyPage();
    this.cdr.detectChanges();
  }

  private loadUnlinkedEmployees(): void {
    this.employeeService.getActiveEmployees().pipe(takeUntil(this.destroy$)).subscribe({
      next: (emps) => {
        // Filter out employees that already have a login account.
        // Cross-reference against the loaded users list using employeeId.
        const linkedIds = new Set(
          this.users
            .filter(u => u.employeeId)
            .map(u => u.employeeId)
        );
        this.unlinkedEmployees = emps.filter((e: any) => !linkedIds.has(e.id));
        this.cdr.detectChanges();
      },
      error: () => { }
    });
  }

  // ── Modals ─────────────────────────────────────────────────────

  viewUserDetails(user: UserResponseDto): void {
    this.targetUser = user; this.modalMode = 'viewDetails';
    this.modalError = null; this.generatedCredentials = null;
  }

  openCreateEmployeeUserModal(): void {
    this.modalMode = 'createEmployee'; this.modalError = null;
    this.generatedCredentials = null; this.employeeUserForm.reset();
    this.loadUnlinkedEmployees();
  }

  openCreateSeniorModal(): void {
    this.modalMode = 'createSenior'; this.modalError = null;
    this.generatedCredentials = null; this.seniorUserForm.reset({ role: 'Tehsildar' });
  }

  openResetModal(user: UserResponseDto): void {
    this.targetUser = user; this.modalMode = 'resetPassword';
    this.modalError = null; this.generatedCredentials = null;
    this.resetPasswordForm.reset();
  }

  closeModal(): void {
    this.modalMode = null; this.targetUser = null;
    this.modalError = null; this.generatedCredentials = null;
  }

  // ── CRUD ───────────────────────────────────────────────────────

  submitCreateEmployeeUser(): void {
    if (this.employeeUserForm.invalid) { this.employeeUserForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = null;
    const fv = this.employeeUserForm.value;
    const emp = this.unlinkedEmployees.find(e => e.id === fv.employeeId);
    const dto: CreateUserDto = {
      username: fv.username, password: fv.password,
      firstName: emp?.firstName ?? '', lastName: emp?.lastName ?? '',
      email: emp?.email ?? '', role: 'Employee' as AdminCreatableRole,
      employeeId: fv.employeeId
    };
    this.userService.createUser(dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.submitting = false;
        this.generatedCredentials = { username: fv.username, password: fv.password, role: 'Employee' };
        this.loadUsers();
      },
      error: (err: any) => { this.submitting = false; this.modalError = err.error?.message || 'Failed to create user'; }
    });
  }

  submitCreateSeniorUser(): void {
    if (this.seniorUserForm.invalid) { this.seniorUserForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = null;
    const fv = this.seniorUserForm.value;
    const dto: CreateUserDto = {
      username: fv.username, password: fv.password,
      firstName: fv.firstName, lastName: fv.lastName,
      email: fv.email, role: fv.role as AdminCreatableRole
    };
    this.userService.createUser(dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.submitting = false;
        this.generatedCredentials = { username: fv.username, password: fv.password, role: fv.role };
        this.loadUsers();
      },
      error: (err: any) => { this.submitting = false; this.modalError = err.error?.message || 'Failed to create user'; }
    });
  }

  submitResetPassword(): void {
    if (this.resetPasswordForm.invalid || !this.targetUser) { this.resetPasswordForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = null;
    const newPassword = this.resetPasswordForm.value.newPassword;
    this.userService.resetUserPassword(this.targetUser.id, { newPassword })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.submitting = false;
          this.generatedCredentials = {
            username: this.targetUser!.username, password: newPassword, role: this.targetUser!.roles?.[0] ?? ''
          };
        },
        error: (err: any) => { this.submitting = false; this.modalError = err.error?.message || 'Failed to reset password'; }
      });
  }

  async toggleStatus(user: UserResponseDto): Promise<void> {
    const action = user.isActive ? 'deactivate' : 'activate';
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} user?`,
      text: `Are you sure you want to ${action} "${user.username}"?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: user.isActive ? '#ef4444' : '#10b981',
      confirmButtonText: `Yes, ${action}`
    });
    if (!result.isConfirmed) return;
    this.userService.setUserStatus(user.id, !user.isActive).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { Swal.fire({ icon: 'success', title: 'Done!', timer: 1500, showConfirmButton: false }); this.loadUsers(); },
      error: () => Swal.fire('Error', 'Failed to update status', 'error')
    });
  }

  async deleteUser(user: UserResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete User?',
      html: `<p>Delete account for <strong>${user.username}</strong>?</p>
             <p style="color:#ef4444;padding:10px;background:#fee2e2;border-radius:6px;margin-top:10px;">
               <strong>Warning:</strong> This cannot be undone.</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, delete'
    });
    if (!result.isConfirmed) return;
    this.userService.deleteUser(user.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false }); this.loadUsers(); },
      error: () => Swal.fire('Error', 'Failed to delete user', 'error')
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() =>
      Swal.fire({ icon: 'success', title: 'Copied!', timer: 1000, showConfirmButton: false })
    );
  }

  getRoleBadgeStyle(role: string): string {
    const map: Record<string, string> = {
      Admin: 'background:#dbeafe;color:#1d4ed8', Tehsildar: 'background:#f3e8ff;color:#7c3aed',
      NayabTehsildar: 'background:#e0e7ff;color:#4338ca', Employee: 'background:#d1fae5;color:#065f46',
    };
    return map[role] ?? 'background:#f3f4f6;color:#374151';
  }
}