import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { EmployeeService } from '../../../../app/core/services/api/employee.api';
import { LanguageService } from '../../../../app/core/services/api/language.api';
import { EmployeeResponseDto, EmployeeStatus, EmploymentType, Gender } from '../../../../app/core/Models/employee.model';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-details.component.html',
  styleUrls: ['./employee-details.component.scss']
})
export class EmployeeDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() isModal    = false;
  @Input() employeeId: string | null = null;
  @Output() modalClosed     = new EventEmitter<void>();
  @Output() editRequested   = new EventEmitter<string>();
  @Output() deleteRequested = new EventEmitter<string>();

  employee:  EmployeeResponseDto | null = null;
  isLoading  = true;
  activeTab: 'personal' | 'contact' | 'timeline' | 'actions' = 'personal';

  EmployeeStatus = EmployeeStatus;
  EmploymentType = EmploymentType;
  Gender         = Gender;

  constructor(
    private route:           ActivatedRoute,
    private router:          Router,
    private employeeService: EmployeeService,
    public  langService:     LanguageService
  ) {}

  ngOnInit(): void {
    if (this.isModal && this.employeeId) {
      this.loadEmployeeDetails();
    } else if (!this.isModal) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        this.employeeId = params['id'];
        if (this.employeeId) this.loadEmployeeDetails();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'personal' | 'contact' | 'timeline' | 'actions'): void {
    this.activeTab = tab;
  }

  loadEmployeeDetails(): void {
    if (!this.employeeId) return;
    this.isLoading = true;
    this.employeeService.getEmployeeById(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.employee  = employee;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'त्रुटी',
            text: 'कर्मचारी तपशील लोड करण्यात अयशस्वी.',
            confirmButtonColor: '#1a2a6c'
          }).then(() => {
            if (this.isModal) this.goBack();
            else this.router.navigate(['/employees']);
          });
        }
      });
  }

  /**
   * Returns the employee's display name in the active language.
   * Strips any accidental language-prefix stored in the DB (e.g. "EN: ", "HI: ", "MR: ").
   */
  getDisplayName(): string {
    if (!this.employee) return '';
    const lang = this.langService.currentLang;

    if (lang === 'en' && this.employee.fullNameEn) {
      return this.stripLangPrefix(this.employee.fullNameEn);
    }
    if (lang === 'hi' && this.employee.fullNameHi) {
      return this.stripLangPrefix(this.employee.fullNameHi);
    }
    // Marathi default
    return this.stripLangPrefix(this.employee.fullName ?? '');
  }

  /** First name in active language */
  getFirstName(): string {
    if (!this.employee) return '';
    const lang = this.langService.currentLang;
    if (lang === 'en' && this.employee.firstName)   return this.employee.firstName;
    if (lang === 'hi' && this.employee.firstNameHi) return this.employee.firstNameHi;
    return this.employee.firstNameMr;
  }

  /** Last name in active language */
  getLastName(): string {
    if (!this.employee) return '';
    const lang = this.langService.currentLang;
    if (lang === 'en' && this.employee.lastName)   return this.employee.lastName;
    if (lang === 'hi' && this.employee.lastNameHi) return this.employee.lastNameHi;
    return this.employee.lastNameMr;
  }

  /**
   * Removes a leading language tag like "EN: ", "HI: ", or "MR: " from a name string.
   * Handles both upper and lower case variants.
   */
  private stripLangPrefix(name: string): string {
    return name.replace(/^(EN|HI|MR|en|hi|mr):\s*/i, '').trim();
  }

  goBack(): void {
    if (this.isModal) this.modalClosed.emit();
    else this.router.navigate(['/employees']);
  }

  editEmployee(): void {
    if (!this.employeeId) return;
    if (this.isModal) this.editRequested.emit(this.employeeId);
    else this.router.navigate(['/employees', 'edit', this.employeeId]);
  }

  deleteEmployee(): void {
    if (!this.employee || !this.employeeId) return;
    Swal.fire({
      title: 'हटवायचे आहे का?',
      text: `"${this.getDisplayName()}" हटवायचा आहे का?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b21f1f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'होय, हटवा!'
    }).then(result => {
      if (result.isConfirmed) this.performDelete();
    });
  }

  private performDelete(): void {
    if (!this.employeeId) return;
    this.employeeService.deleteEmployee(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'हटवले!',
            text: 'कर्मचारी हटवला.',
            timer: 2000,
            showConfirmButton: false
          });
          if (this.isModal) this.deleteRequested.emit(this.employeeId!);
          else this.router.navigate(['/employees']);
        },
        error: () => Swal.fire({
          icon: 'error',
          title: 'त्रुटी',
          text: 'हटवण्यात अयशस्वी.',
          confirmButtonColor: '#1a2a6c'
        })
      });
  }

  changeStatus(newStatus: EmployeeStatus): void {
    if (!this.employee || !this.employeeId) return;
    Swal.fire({
      title: 'स्थिती बदलायची आहे का?',
      text: `${EmployeeStatus[newStatus]} मध्ये बदलायचे का?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1a2a6c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'होय!'
    }).then(result => {
      if (result.isConfirmed) this.performStatusChange(newStatus);
    });
  }

  private performStatusChange(newStatus: EmployeeStatus): void {
    if (!this.employeeId) return;
    this.employeeService.changeEmployeeStatus(this.employeeId, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'यशस्वी',
            text: 'स्थिती अपडेट केली.',
            timer: 2000,
            showConfirmButton: false
          });
          this.loadEmployeeDetails();
        },
        error: () => Swal.fire({
          icon: 'error',
          title: 'त्रुटी',
          text: 'स्थिती अपडेट करण्यात अयशस्वी.',
          confirmButtonColor: '#1a2a6c'
        })
      });
  }

  getStatusBadgeClass(status: EmployeeStatus): string {
    const map: Record<string, string> = {
      '1': 'badge-success',
      '2': 'badge-secondary',
      '3': 'badge-info',
      '4': 'badge-warning',
      '5': 'badge-danger',
      '6': 'badge-danger'
    };
    return map[String(+status)] ?? 'badge-secondary';
  }

  getEmploymentTypeBadgeClass(type: EmploymentType): string {
    const map: Record<string, string> = {
      '1': 'badge-primary',
      '2': 'badge-info',
      '3': 'badge-warning',
      '4': 'badge-secondary',
      '5': 'badge-light'
    };
    return map[String(+type)] ?? 'badge-secondary';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('mr-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getGenderIcon(gender: Gender): string {
    switch (+gender) {
      case Gender.Male:   return 'fas fa-mars';
      case Gender.Female: return 'fas fa-venus';
      default:            return 'fas fa-genderless';
    }
  }

  getFullAddress(): string {
    if (!this.employee?.address) return 'N/A';
    const a = this.employee.address;
    return `${a.street}, ${a.city}, ${a.state}, ${a.country} - ${a.postalCode}`;
  }

  printEmployeeDetails(): void { window.print(); }

  downloadEmployeeCard(): void {
    Swal.fire({
      icon: 'info',
      title: 'लवकरच येईल',
      text: 'कर्मचारी कार्ड डाउनलोड लवकरच उपलब्ध होईल.',
      confirmButtonColor: '#1a2a6c'
    });
  }
}