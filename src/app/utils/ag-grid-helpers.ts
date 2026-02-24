import type { ColDef, GridOptions, GridApi } from 'ag-grid-community';

// Common date formatter
export const dateFormatter = (params: any) => {
  if (!params.value) return '';
  return new Date(params.value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Common date-time formatter
export const dateTimeFormatter = (params: any) => {
  if (!params.value) return '';
  return new Date(params.value).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Currency formatter
export const currencyFormatter = (params: any) => {
  if (params.value == null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(params.value);
};

// Number formatter
export const numberFormatter = (params: any) => {
  if (params.value == null) return '';
  return new Intl.NumberFormat('en-IN').format(params.value);
};

// Percentage formatter
export const percentageFormatter = (params: any) => {
  if (params.value == null) return '';
  return `${params.value}%`;
};

// Default grid options
export const defaultGridOptions: GridOptions = {
  pagination: true,
  paginationPageSize: 20,
  paginationPageSizeSelector: [10, 20, 50, 100],
  domLayout: 'autoHeight',
  animateRows: true,
  rowSelection: 'multiple',
  enableCellTextSelection: true,
  suppressRowClickSelection: true,
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
    flex: 1,
  },
  rowHeight: 50,
  headerHeight: 48,
  suppressMenuHide: true,
  enableBrowserTooltips: true,
};


// Apply quick filter to AG Grid
export const applyQuickFilter = (gridApi: GridApi | undefined, searchText: string) => {
  gridApi?.setGridOption('quickFilterText', searchText);
};

// Clear all filters from AG Grid
export const clearAllFilters = (gridApi: GridApi | undefined) => {
  gridApi?.setFilterModel(null);
  gridApi?.onFilterChanged();
};

// Get current filter model from AG Grid
export const getFilterModel = (gridApi: GridApi | undefined) => {
  return gridApi?.getFilterModel();
};

// Set filter model to AG Grid
export const setFilterModel = (gridApi: GridApi | undefined, model: any) => {
  gridApi?.setFilterModel(model);
};

// Export to CSV helper
export const exportToCsv = (gridApi: GridApi | undefined, filename: string) => {
  const params = {
    fileName: `${filename}_${new Date().toISOString().split('T')[0]}.csv`,
    columnKeys: gridApi
      ?.getAllDisplayedColumns()
      ?.map((col: any) => col.getColId())
      .filter((colId: string) => colId !== 'actions'),
  };
  gridApi?.exportDataAsCsv(params);
};

// Get selected rows helper
export const getSelectedRows = (gridApi: GridApi | undefined) => {
  return gridApi?.getSelectedRows() || [];
};

// Get row count
export const getRowCounts = (gridApi: GridApi | undefined) => {
  return {
    total: gridApi?.getDisplayedRowCount() || 0,
    selected: gridApi?.getSelectedRows()?.length || 0,
  };
};

// Deselect all rows
export const deselectAllRows = (gridApi: GridApi | undefined) => {
  gridApi?.deselectAll();
};

// Select all rows
export const selectAllRows = (gridApi: GridApi | undefined) => {
  gridApi?.selectAll();
};

// Refresh grid data helper
export const refreshGrid = (gridApi: GridApi | undefined) => {
  gridApi?.refreshCells({ force: true });
};

// Auto-size all columns
export const autoSizeAll = (gridApi: GridApi | undefined, skipHeader = false) => {
  const allColumnIds = gridApi
    ?.getAllDisplayedColumns()
    ?.map((col: any) => col.getColId());
  if (allColumnIds) {
    gridApi?.autoSizeColumns(allColumnIds, skipHeader);
  }
};

export interface AGGridToolbarConfig {
  searchText: string;
  filterValue?: string;
  onSearchChange: (text: string) => void;
  onFilterChange?: (value: string) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

export const clearToolbarState = (
  setSearchText: (text: string) => void,
  setFilterValue: (value: string) => void,
  setCurrentPage: (page: number) => void,
  gridApi: GridApi | undefined
) => {
  setSearchText('');
  setFilterValue('all');
  setCurrentPage(1);
  clearAllFilters(gridApi);
};


export const getActiveFiltersSummary = (
  searchText: string,
  filterValue?: string,
  additionalFilters?: Record<string, any>
): string[] => {
  const active: string[] = [];

  if (searchText.trim()) {
    active.push(`Search: "${searchText.trim()}"`);
  }

  if (filterValue && filterValue !== 'all') {
    active.push(`Filter: ${filterValue}`);
  }

  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value != null && value !== '' && value !== 'all') {
        active.push(`${key}: ${value}`);
      }
    });
  }

  return active;
};