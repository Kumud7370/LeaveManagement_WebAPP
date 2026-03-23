
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
import { DepartmentService } from '../../core/services/api/department.api';
import { Department } from '../../core/Models/department.model';
import { LanguageService } from '../../core/services/api/language.api';

ModuleRegistry.registerModules([AllCommunityModule]);

type ModalMode = 'createEmployee' | 'createSenior' | 'resetPassword' | 'viewDetails' | null;

@Component({
  selector: 'app-user-management',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  // UserActionCellRendererComponent removed from imports — it's used inside cellRenderer
  // not directly in the template, so it was causing TS-998113 warning
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AgGridAngular],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  gridApi!: GridApi;
  context = { componentParent: this };

  users: UserResponseDto[] = [];
  unlinkedEmployees: EmployeeResponseDto[] = [];
  rowData: UserResponseDto[] = [];

  loading = false;
  error: string | null = null;
  activeDepartments: Department[] = [];

  stats = { total: 0, active: 0, inactive: 0, tehsildar: 0, hr: 0 };

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

  columnDefs: ColDef[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserManagementService,
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private cdr: ChangeDetectorRef,
    public  langService: LanguageService
  ) { }

  ngOnInit(): void {
    this.initForms();
    this.buildColumnDefs();
    this.loadUsers();

    // Rebuild column headers when language switches
    this.langService.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.buildColumnDefs();
      if (this.gridApi) this.gridApi.setGridOption('columnDefs', this.columnDefs);
      this.cdr.detectChanges();
    });
  }

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

  // ── Column Definitions ──────────────────────────────────────────

  buildColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: this.langService.t('um.col.actions'),
        width: 148, minWidth: 148, maxWidth: 148,
        sortable: false, filter: false, floatingFilter: false,
        suppressFloatingFilterButton: true,
        cellRenderer: UserActionCellRendererComponent,
        suppressSizeToFit: true,
      },
      {
        headerName: this.langService.t('um.col.username'),
        field: 'username', minWidth: 140
      },
      {
        headerName: this.langService.t('um.col.fullName'),
        minWidth: 160,
        valueGetter: (p: any) => `${p.data?.firstName ?? ''} ${p.data?.lastName ?? ''}`.trim() || '—',
      },
      {
        headerName: this.langService.t('um.col.email'),
        field: 'email', minWidth: 190
      },
      {
        headerName: this.langService.t('um.col.role'),
        minWidth: 155,
        valueGetter: (p: any) => {
          const r = p.data?.roles;
          return Array.isArray(r) ? (r[0] ?? '—') : (r ?? '—');
        },
        cellRenderer: (p: any) => {
          const role = p.value || '—';
          const map: Record<string, [string, string]> = {
            Admin:          ['#dbeafe', '#1d4ed8'],
            Tehsildar:      ['#f3e8ff', '#7c3aed'],
            NayabTehsildar: ['#e0e7ff', '#4338ca'],
            Employee:       ['#d1fae5', '#065f46'],
            HR:             ['#fef9c3', '#854d0e'],
          };
          const [bg, color] = map[role] ?? ['#f3f4f6', '#374151'];
          return `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;
            background:${bg};color:${color};font-size:12px;font-weight:600;line-height:1.4;">${role}</span>`;
        }
      },
      {
        headerName: this.langService.t('um.col.status'),
        width: 110,
        valueGetter: (p: any) => p.data?.isActive
          ? this.langService.t('um.status.active')
          : this.langService.t('um.status.inactive'),
        cellRenderer: (p: any) => {
          const isActive = p.data?.isActive;
          return isActive
            ? `<span style="display:inline-block;padding:2px 12px;border-radius:9999px;font-size:12px;font-weight:600;background:#dcfce7;color:#166534;line-height:1.4;">● ${this.langService.t('um.status.active')}</span>`
            : `<span style="display:inline-block;padding:2px 12px;border-radius:9999px;font-size:12px;font-weight:600;background:#fee2e2;color:#991b1b;line-height:1.4;">● ${this.langService.t('um.status.inactive')}</span>`;
        }
      },
      {
        headerName: this.langService.t('um.col.created'),
        minWidth: 120,
        valueGetter: (p: any) => p.data?.createdAt || '',
        valueFormatter: (p: any) => {
          const v = p.data?.createdAt;
          if (!v) return '—';
          const d = new Date(v);
          const locale = this.langService.currentLang === 'mr' ? 'mr-IN'
                       : this.langService.currentLang === 'hi' ? 'hi-IN' : 'en-GB';
          return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
        }
      }
    ];
  }

  // ── Forms ────────────────────────────────────────────────────────

  private initForms(): void {
    this.employeeUserForm = this.fb.group({
      employeeId: ['', Validators.required],
      username:   ['', [Validators.required, Validators.minLength(3)]],
      password:   ['', [Validators.required, Validators.minLength(6)]],
    });
    this.seniorUserForm = this.fb.group({
      role:         ['Tehsildar', Validators.required],
      firstName:    ['', Validators.required],
      lastName:     ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
      username:     ['', [Validators.required, Validators.minLength(3)]],
      password:     ['', [Validators.required, Validators.minLength(6)]],
      departmentId: ['']
    });
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  // ── Data ─────────────────────────────────────────────────────────

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.userService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
        this.computeStats();
        this.applyPage();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = this.langService.t('um.loadError');
        this.cdr.detectChanges();
      }
    });
  }

  private computeStats(): void {
    this.stats.total    = this.users.length;
    this.stats.active   = this.users.filter(u => u.isActive).length;
    this.stats.inactive = this.users.filter(u => !u.isActive).length;
    this.stats.tehsildar = this.users.filter(u =>
      u.roles?.some(r => r === 'Tehsildar' || r === 'NayabTehsildar')
    ).length;
    this.stats.hr = this.users.filter(u => u.roles?.some(r => r === 'HR')).length;
  }

  private applyPage(): void {
    const filtered = this.filteredUsers();
    this.totalCount = filtered.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    const start = (this.currentPage - 1) * this.pageSize;
    this.rowData = filtered.slice(start, start + this.pageSize);

    const max = 5;
    let s = Math.max(1, this.currentPage - Math.floor(max / 2));
    const e = Math.min(this.totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    this.pages = Array.from({ length: e - s + 1 }, (_, i) => s + i);

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
      this.currentPage = 1; this.applyPage(); this.cdr.detectChanges();
    }, 350);
  }

  clearFilters(): void {
    this.searchTerm = ''; this.currentPage = 1; this.applyPage(); this.cdr.detectChanges();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page; this.applyPage(); this.cdr.detectChanges();
  }

  onPageSizeChange(e: Event): void {
    this.pageSize = +(e.target as HTMLSelectElement).value;
    this.currentPage = 1; this.applyPage(); this.cdr.detectChanges();
  }

  private loadUnlinkedEmployees(): void {
    this.employeeService.getActiveEmployees().pipe(takeUntil(this.destroy$)).subscribe({
      next: (emps) => {
        const linkedIds = new Set(this.users.filter(u => u.employeeId).map(u => u.employeeId));
        this.unlinkedEmployees = emps.filter((e: any) => !linkedIds.has(e.id));
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  // ── Modals ───────────────────────────────────────────────────────

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
    this.loadActiveDepartments();
  }

  openResetModal(user: UserResponseDto): void {
    this.targetUser = user; this.modalMode = 'resetPassword';
    this.modalError = null; this.generatedCredentials = null;
    this.resetPasswordForm.reset();
  }

  private loadActiveDepartments(): void {
    this.departmentService.getActiveDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => { this.activeDepartments = res.data ?? []; },
      error: () => {}
    });
  }

  closeModal(): void {
    this.modalMode = null; this.targetUser = null;
    this.modalError = null; this.generatedCredentials = null;
  }

  // ── CRUD ──────────────────────────────────────────────────────────

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
      error: (err: any) => {
        this.submitting = false;
        this.modalError = err.error?.message || this.langService.t('um.createError');
      }
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
      error: (err: any) => {
        this.submitting = false;
        this.modalError = err.error?.message || this.langService.t('um.createError');
      }
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
            username: this.targetUser!.username,
            password: newPassword,
            role: this.targetUser!.roles?.[0] ?? ''
          };
        },
        error: (err: any) => {
          this.submitting = false;
          this.modalError = err.error?.message || this.langService.t('um.resetError');
        }
      });
  }

  async toggleStatus(user: UserResponseDto): Promise<void> {
    const action = user.isActive
      ? this.langService.t('common.deactivate')
      : this.langService.t('common.activate');
    const result = await Swal.fire({
      title: `${action}?`,
      text: `"${user.username}" ${action}?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: user.isActive ? '#ef4444' : '#10b981',
      confirmButtonText: `${this.langService.t('common.yes')}, ${action}`,
      cancelButtonText: this.langService.t('common.cancel')
    });
    if (!result.isConfirmed) return;
    this.userService.setUserStatus(user.id, !user.isActive).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: this.langService.t('common.success'), timer: 1500, showConfirmButton: false });
        this.loadUsers();
      },
      error: () => Swal.fire(this.langService.t('common.errorTitle'), this.langService.t('um.statusError'), 'error')
    });
  }

  async deleteUser(user: UserResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: this.langService.t('um.deleteTitle'),
      html: `<p>${this.langService.t('um.deleteConfirm')} <strong>${user.username}</strong>?</p>
             <p style="color:#ef4444;padding:10px;background:#fee2e2;border-radius:6px;margin-top:10px;">
               <strong>${this.langService.t('common.warning')}:</strong> ${this.langService.t('um.deleteWarning')}</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: this.langService.t('common.yesDelete'),
      cancelButtonText: this.langService.t('common.cancel')
    });
    if (!result.isConfirmed) return;
    this.userService.deleteUser(user.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: this.langService.t('common.deleted'), timer: 1500, showConfirmButton: false });
        this.loadUsers();
      },
      error: () => Swal.fire(this.langService.t('common.errorTitle'), this.langService.t('um.deleteError'), 'error')
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() =>
      Swal.fire({ icon: 'success', title: this.langService.t('um.copied'), timer: 1000, showConfirmButton: false })
    );
  }

  getRoleBadgeStyle(role: string): string {
    const map: Record<string, string> = {
      Admin:          'background:#dbeafe;color:#1d4ed8',
      Tehsildar:      'background:#f3e8ff;color:#7c3aed',
      NayabTehsildar: 'background:#e0e7ff;color:#4338ca',
      Employee:       'background:#d1fae5;color:#065f46',
      HR:             'background:#fef9c3;color:#854d0e'
    };
    return map[role] ?? 'background:#f3f4f6;color:#374151';
  }
}