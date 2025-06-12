import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Remark {
  id: number;
  remarkText: string;
  zone: string;
  workCode: string;
  remarkType: string;
  priority: string;
  status: string;
  fromDate: Date;
  toDate: Date;
}

@Component({
  selector: 'app-remark-filter',
  templateUrl: './remarks.component.html',
  styleUrls: ['./remarks.component.scss']
})
export class RemarkFilterComponent implements OnInit {
  remarkForm!: FormGroup;

  zoneOptions = ['Zone A', 'Zone B', 'Zone C'];
  workCodeOptions = ['Work 1', 'Work 2', 'Work 3'];
  remarkTypeOptions = ['Type 1', 'Type 2', 'Type 3'];
  statusOptions = ['Active', 'Inactive', 'Pending'];
  priorityOptions = ['Low', 'Medium', 'High'];

  remarksList: Remark[] = [
    // sample data
    {
      id: 1,
      remarkText: 'Sample remark 1',
      zone: 'Zone A',
      workCode: 'Work 1',
      remarkType: 'Type 1',
      priority: 'High',
      status: 'Active',
      fromDate: new Date('2023-01-01'),
      toDate: new Date('2023-01-10')
    },
    {
      id: 2,
      remarkText: 'Sample remark 2',
      zone: 'Zone B',
      workCode: 'Work 2',
      remarkType: 'Type 2',
      priority: 'Medium',
      status: 'Inactive',
      fromDate: new Date('2023-02-01'),
      toDate: new Date('2023-02-15')
    }
  ];

  filteredRemarks: Remark[] = [];

  selectedPriority = '';
  selectedStatus = '';
  selectedType = '';
  activeTab = 'all'; // or 'active', 'inactive', etc.

  isLoading = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.remarkForm = this.fb.group({
      searchInput: [''],
      zoneSelect: ['', Validators.required],
      workCodeSelect: ['', Validators.required],
      remarkTypeSelect: ['', Validators.required],
      prioritySelect: ['', Validators.required],
      statusSelect: ['', Validators.required],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required]
    });

    this.filteredRemarks = [...this.remarksList];
  }

  navigateBack() {
    // Implement navigation logic here
    console.log('Navigate back clicked');
  }

  onSubmit() {
    if (this.remarkForm.invalid) {
      // Mark all controls as touched to show validation errors
      this.remarkForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    // For demo, just filter remarks based on form values and searchInput
    const { zoneSelect, workCodeSelect, remarkTypeSelect, prioritySelect, statusSelect, fromDate, toDate, searchInput } = this.remarkForm.value;

    this.filteredRemarks = this.remarksList.filter(r => {
      return (
        (!zoneSelect || r.zone === zoneSelect) &&
        (!workCodeSelect || r.workCode === workCodeSelect) &&
        (!remarkTypeSelect || r.remarkType === remarkTypeSelect) &&
        (!prioritySelect || r.priority === prioritySelect) &&
        (!statusSelect || r.status === statusSelect) &&
        (!fromDate || new Date(r.fromDate) >= new Date(fromDate)) &&
        (!toDate || new Date(r.toDate) <= new Date(toDate)) &&
        (!searchInput || r.remarkText.toLowerCase().includes(searchInput.toLowerCase()))
      );
    });

    this.isLoading = false;
  }

  resetFilters() {
    this.remarkForm.reset();
    this.filteredRemarks = [...this.remarksList];
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    // You can implement logic based on tabs here
  }

  selectPriority(priority: string) {
    this.selectedPriority = priority;
    this.remarkForm.patchValue({ prioritySelect: priority });
  }

  selectStatus(status: string) {
    this.selectedStatus = status;
    this.remarkForm.patchValue({ statusSelect: status });
  }

  selectType(type: string) {
    this.selectedType = type;
    this.remarkForm.patchValue({ remarkTypeSelect: type });
  }

  searchRemarks() {
    const searchValue = this.remarkForm.get('searchInput')?.value || '';
    this.filteredRemarks = this.remarksList.filter(r =>
      r.remarkText.toLowerCase().includes(searchValue.toLowerCase())
    );
  }

  viewDetails(remark: Remark) {
    // Implement detail view logic here, e.g. open modal or navigate
    alert(`Viewing details for remark: ${remark.remarkText}`);
  }
}
