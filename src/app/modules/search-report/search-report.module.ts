import { NgModule } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule } from "@angular/forms"
import { RouterModule } from "@angular/router"
import { SearchReportComponent } from "./search-report.component"
import { BtnSearchViewCellRenderer } from "./viewSearch/buttonSearchView-cell-renderer.component"
import { BtnSearchPdfCellRenderer } from "./viewSearch/buttonSearchPdf-cell-renderer.component"
import { ViewSearchReportComponent } from "./viewSearch/viewsearchreport.component"
import { MatDialogModule } from "@angular/material/dialog"

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatDialogModule,
    // ✅ Import all standalone components
    SearchReportComponent,
    BtnSearchViewCellRenderer,
    BtnSearchPdfCellRenderer,
    ViewSearchReportComponent,
  ],
  exports: [SearchReportComponent, BtnSearchViewCellRenderer, BtnSearchPdfCellRenderer, ViewSearchReportComponent],
})
export class SearchReportModule { }
