import { NgModule } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormsModule } from "@angular/forms"
import { AgGridModule } from "ag-grid-angular"

// CoreUI Imports
import {
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ListGroupModule,
  SharedModule,
  UtilitiesModule,
  TabsModule,
  NavModule,
  TableModule,
  ProgressModule,
  BadgeModule,
  AvatarModule,
  TooltipModule,
  ModalModule,
  PopoverModule,
  DropdownModule,
  BreadcrumbModule,
  SpinnerModule,
  PlaceholderModule,
  PaginationModule,
  AccordionModule,
  AlertModule,
  CarouselModule,
  CollapseModule,
  OffcanvasModule,
} from "@coreui/angular"

// Import IconModule from the correct package
import { IconModule, IconSetService } from "@coreui/icons-angular"

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AgGridModule,
    ButtonModule,
    CardModule,
    FormModule,
    GridModule,
    ListGroupModule,
    SharedModule,
    UtilitiesModule,
    TabsModule,
    NavModule,
    IconModule,
    TableModule,
    ProgressModule,
    BadgeModule,
    AvatarModule,
    TooltipModule,
    ModalModule,
    PopoverModule,
    DropdownModule,
    BreadcrumbModule,
    SpinnerModule,
    PlaceholderModule,
    PaginationModule,
    AccordionModule,
    AlertModule,
    CarouselModule,
    CollapseModule,
    OffcanvasModule,
  ],
  providers: [IconSetService],
})
export class LogsheetModule {}
