import { Component, Inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { FormBuilder } from '@angular/forms'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'

@Component({
    selector: 'app-viewlogsheet',
    templateUrl: './viewlogsheet.component.html',
    styleUrls: ['./viewlogsheet.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
    ],
})
export class ViewlogsheetComponent {
    filterText: any = ''
    lstSearchResults: any = []
    lstReportData: any = []
    lstFilterData: any
    ttlQuantity: any

    constructor(
        public router: Router,
        public fb: FormBuilder,
        public dialogRef: MatDialogRef<ViewlogsheetComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
    ) {
        // Normalize data keys to handle case sensitivity issues
        this.lstFilterData = this.normalizeData(data);
        console.log('Dialog data received:', data);
        console.log('Normalized data:', this.lstFilterData);
    }

    // This function normalizes the data keys to ensure consistent casing
    normalizeData(data: any): any {
        if (!data) return {};
        
        // Create a standardized object with expected property names
        return {
            LogsheetNumber: data.logsheetNumber || data.LogsheetNumber || '',
            VehicleNumber: data.vehicleNumber || data.VehicleNumber || '',
            Ward: data.ward || data.Ward || '',
            RouteNumber: data.routeNumber || data.RouteNumber || '',
            TypeOfWaste: data.typeOfWaste || data.TypeOfWaste || '',
            DriverName: data.driverName || data.DriverName || '',
            CreatedOn: data.createdOn || data.CreatedOn || '',
            CreatedBy: data.createdBy || data.CreatedBy || '',
            ClosedBy: data.closedBy || data.ClosedBy || null,
            ClosedDestination: data.closedDestination || data.ClosedDestination || null,
            ClosedOn: data.closedOn || data.ClosedOn || null,
            IsClosed: data.isClosed !== undefined ? data.isClosed : (data.IsClosed !== undefined ? data.IsClosed : 0),
            Remark: data.remark || data.Remark || ''
        };
    }

    Close() {
        this.dialogRef.close()
    }

    getApprovedOnList(logsheet: any): string {
        console.log(logsheet)
        return logsheet.TicketList?.map((i: any) => i.ApprovedOn).join(',') || ''
    }
}