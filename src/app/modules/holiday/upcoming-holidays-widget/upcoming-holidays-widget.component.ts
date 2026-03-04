import {
  Component, OnInit, OnDestroy, Input,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, startWith, forkJoin } from 'rxjs';
import { HolidayService } from '../../../core/services/api/holiday.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import { Holiday } from '../../../core/Models/holiday.model';

@Component({
  selector: 'app-upcoming-holidays-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-holidays-widget.component.html',
  styleUrls: ['./upcoming-holidays-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingHolidaysWidgetComponent implements OnInit, OnDestroy {

  @Input() count: number = 6;
  @Input() refreshIntervalMs: number = 5 * 60 * 1000;

  holidays: Holiday[] = [];
  isLoading = true;
  hasError = false;
  lastLoaded: Date | null = null;

  private deptMap = new Map<string, string>();
  private destroy$ = new Subject<void>();

  constructor(
    private holidayService: HolidayService,
    private departmentService: DepartmentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.refreshIntervalMs > 0) {
      interval(this.refreshIntervalMs)
        .pipe(startWith(0), takeUntil(this.destroy$))
        .subscribe(() => this.loadAll());
    } else {
      this.loadAll();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHolidays(): void { this.loadAll(); }

  private loadAll(): void {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.markForCheck();

    forkJoin({
      holidays: this.holidayService.getUpcomingHolidays(this.count),
      departments: this.departmentService.getActiveDepartments()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ holidays, departments }: any) => {
          this.isLoading = false;
          this.lastLoaded = new Date();

          this.deptMap.clear();
          const deptList: any[] = departments?.data ?? departments ?? [];
          (Array.isArray(deptList) ? deptList : []).forEach((d: any) => {
            const id = String(d.id ?? d.departmentId ?? d.DepartmentId ?? '');
            const name = d.departmentName ?? d.DepartmentName ?? d.name ?? d.Name ?? '';
            if (id && name) this.deptMap.set(id, name);
          });

          if (holidays?.success) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            this.holidays = (holidays.data ?? []).filter((h: Holiday) => {
              const hDate = new Date(h.holidayDate);
              hDate.setHours(0, 0, 0, 0);
              return hDate >= today;
            });
          } else {
            this.hasError = true;
          }

          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.hasError = true;
          this.cdr.markForCheck();
        }
      });
  }

  getDepartmentLabels(holiday: Holiday): string[] {
    const ids: any[] = holiday.applicableDepartments ?? [];
    if (!ids.length) return [];
    return ids.map(id => {
      const key = String(id);
      return this.deptMap.get(key) ?? key;
    }).filter(Boolean);
  }

  isAllDepartments(holiday: Holiday): boolean {
    return (holiday.applicableDepartments ?? []).length === 0;
  }

  getDateParts(dateStr: string | Date): { month: string; day: string } {
    const d = new Date(dateStr);
    return {
      month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
      day: String(d.getUTCDate())
    };
  }

  getDaysLabel(days: number, isToday: boolean): string {
    if (isToday) return 'Today!';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `In ${days} days`;
    if (days <= 30) return `In ${Math.ceil(days / 7)} week${Math.ceil(days / 7) > 1 ? 's' : ''}`;
    return `In ${days} days`;
  }

  getTypeBadgeClass(typeName: string): string {
    const map: Record<string, string> = {
      National: 'uhw-badge-national',
      Regional: 'uhw-badge-regional',
      Optional: 'uhw-badge-optional'
    };
    return map[typeName] ?? 'uhw-badge-national';
  }

  getUrgencyClass(days: number, isToday: boolean): string {
    if (isToday) return 'uhw-date-today';
    if (days <= 3) return 'uhw-date-soon';
    if (days <= 7) return 'uhw-date-week';
    return 'uhw-date-normal';
  }

  get lastUpdatedLabel(): string {
    if (!this.lastLoaded) return '';
    return this.lastLoaded.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  trackById(_: number, h: Holiday): string { return h.id; }
  trackByName(_: number, name: string): string { return name; }
}