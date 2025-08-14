import "jspdf"
import "jspdf-autotable" // Import for side effects to extend jsPDF
import type { GState } from "jspdf" // Import GState for type reference

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
    // GState is a constructor, so typeof GState is correct
    GState: typeof GState
    // autoTable is now used as a standalone function, so no need to declare it on jsPDF interface
  }
}
