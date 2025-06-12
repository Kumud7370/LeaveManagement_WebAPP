// import { NgModule } from "@angular/core"
// import { CommonModule } from "@angular/common"
// import { FormsModule, ReactiveFormsModule } from "@angular/forms"
// import { RouterModule } from "@angular/router"

// import { SearchReportComponent } from "./search-report.component"
// import { BtnCellRenderer } from "./renderers/button-cell-renderer.component"
// import { BtnLinkCellRenderer } from "./renderers/buttonLink-cell-renderer.component"
// import { BtnViewCellRenderer } from "./renderers/buttonView-cell-renderer.component"
// import { BtnMoreCellRenderer } from "./renderers/buttonMore-cell-renderer.component"
// import { CheckBoxCellRenderer } from "./renderers/checkbox-cell-renderer.component"

// @NgModule({
//   declarations: [BtnCellRenderer, BtnLinkCellRenderer, BtnViewCellRenderer, BtnMoreCellRenderer, CheckBoxCellRenderer],
//   imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SearchReportComponent],
//   exports: [
//     SearchReportComponent,
//     BtnCellRenderer,
//     BtnLinkCellRenderer,
//     BtnViewCellRenderer,
//     BtnMoreCellRenderer,
//     CheckBoxCellRenderer,
//   ],
// })
// export class SearchReportModule {}
import { NgModule } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule } from "@angular/forms"
import { RouterModule } from "@angular/router"

import { SearchReportComponent } from "./search-report.component"
import { BtnCellRenderer } from "./renderers/button-cell-renderer.component"
import { BtnLinkCellRenderer } from "./renderers/buttonLink-cell-renderer.component"
import { BtnViewCellRenderer } from "./renderers/buttonView-cell-renderer.component"
import { BtnMoreCellRenderer } from "./renderers/buttonMore-cell-renderer.component"
import { CheckBoxCellRenderer } from "./renderers/checkbox-cell-renderer.component"

@NgModule({
  declarations: [BtnCellRenderer, BtnLinkCellRenderer, BtnViewCellRenderer, BtnMoreCellRenderer, CheckBoxCellRenderer],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SearchReportComponent],
  exports: [
    SearchReportComponent,
    BtnCellRenderer,
    BtnLinkCellRenderer,
    BtnViewCellRenderer,
    BtnMoreCellRenderer,
    CheckBoxCellRenderer,
  ],
})
export class SearchReportModule {}
