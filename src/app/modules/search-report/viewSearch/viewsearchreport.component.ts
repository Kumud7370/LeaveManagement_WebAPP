import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import moment from "moment"
import { Inject } from '@angular/core';

@Component({
    selector: "app-viewsearchreport",
    templateUrl: "./viewsearchreport.component.html",
    styleUrls: ["./viewsearchreport.component.scss"],
    standalone: true,
    imports: [CommonModule],
})
export class ViewSearchReportComponent {
    searchData: any
    data: any

    constructor(
        public dialogRef: MatDialogRef<ViewSearchReportComponent>,
        @Inject(MAT_DIALOG_DATA) data: any
    ) {
        this.data = data
        // Normalize data keys to handle case sensitivity issues
        this.searchData = this.normalizeData(data)
        console.log("Search Report View Dialog - Original data received:", data)
        console.log("Search Report View Dialog - Normalized data:", this.searchData)
    }

    // This function normalizes the data keys to ensure consistent casing
    normalizeData(data: any): any {
        if (!data) return {}

        // Create a standardized object with expected property names
        return {
            deliveryLocation: data.deliveryLocation || data.DeliveryLocation || "",
            slipSrNo: data.slipSrNo || data.SlipSrNo || "",
            trans_Date: data.trans_Date || data.Trans_Date || "",
            trans_Time: data.trans_Time || data.Trans_Time || "",
            agency_Name: data.agency_Name || data.Agency_Name || "",
            vehicle_No: data.vehicle_No || data.Vehicle_No || "",
            vehicleType: data.vehicleType || data.VehicleType || "",
            ward: data.ward || data.Ward || "",
            route: data.route || data.Route || "",
            type_of_Garbage: data.type_of_Garbage || data.Type_of_Garbage || "",
            gross_Weight: data.gross_Weight || data.Gross_Weight || "",
            trans_Date_UL: data.trans_Date_UL || data.Trans_Date_UL || "",
            trans_Time_UL: data.trans_Time_UL || data.Trans_Time_UL || "",
            unladen_Weight: data.unladen_Weight || data.Unladen_Weight || "",
            act_Net_Weight: data.act_Net_Weight || data.Act_Net_Weight || "",
            remark: data.remark || data.Remark || "",
        }
    }

    // Format weight values - for UI display
    formatWeight(weight: string | number): string {
        console.log("Formatting weight:", weight)
        if (!weight || weight === "N/A" || weight === "" || weight === null || weight === undefined) {
            return "N/A"
        }
        // If it's already formatted with 'kg', return as is
        if (typeof weight === "string" && weight.includes("kg")) {
            return weight
        }
        // Otherwise, add 'kg' suffix
        return `${weight} kg`
    }

    // Print functionality
    printSearchReport(): void {
        window.print()
    }

    // PDF generation with weighing ticket layout
    downloadPDF(): void {
        const doc = new jsPDF("portrait")
        const fileName = `SearchReport_${this.searchData.slipSrNo || "Unknown"}_${moment().format("DDMMYYYY_HHmmss")}`

        // Set consistent margins for all tables
        const leftMargin = 15
        const rightMargin = 15
        const pageWidth = doc.internal.pageSize.getWidth()
        const tableWidth = pageWidth - leftMargin - rightMargin

        // Company Header - centered with consistent margins
        autoTable(doc, {
            body: [
                [{ content: "SWM MIS", colSpan: 4, styles: { halign: "center", fontSize: 14, fontStyle: "bold" } }],
                [
                    {
                        content: "WEIGHING TICKET",
                        colSpan: 4,
                        styles: { halign: "center", fontSize: 12 },
                    },
                ],
            ],
            theme: "grid",
            styles: {
                lineWidth: 0.5,
                textColor: 0,
                fontSize: 12,
                halign: "center",
                lineColor: [0, 0, 0],
            },
            margin: { top: 10, left: leftMargin, right: rightMargin },
            tableWidth: tableWidth,
        })

        // WEIGHING TICKET Label - consistent margins
        autoTable(doc, {
            body: [[{ content: "WEIGHING TICKET", styles: { halign: "left", fontSize: 12, fontStyle: "bold" } }]],
            theme: "plain",
            styles: {
                textColor: 0,
                fontSize: 12,
            },
            startY: doc.lastAutoTable.finalY + 5,
            margin: { left: leftMargin, right: rightMargin },
            tableWidth: tableWidth,
        })

        // Main information table - consistent margins and centering
        autoTable(doc, {
            body: [
                [
                    { content: "TICKET NO :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.slipSrNo || "N/A",
                    { content: "LOGSHEET NO :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.slipSrNo || "N/A",
                ],
                [
                    { content: "VEHICLE NO :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.vehicle_No || "N/A",
                    { content: "VEHICLE TYPE :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.vehicleType || "N/A",
                ],
                [
                    { content: "CONTRACTOR :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.agency_Name || "N/A",
                    { content: "ITEM NAME :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.type_of_Garbage || "N/A",
                ],
                [
                    { content: "WARD :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.ward || "N/A",
                    { content: "LOCATION :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.deliveryLocation || "N/A",
                ],
                [
                    { content: "GROSS WEIGHT :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.formatWeight(this.searchData.gross_Weight),
                    { content: "DATE/TIME IN :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    `${this.searchData.trans_Date || "N/A"} ${this.searchData.trans_Time || ""}`.trim(),
                ],
                [
                    { content: "TARE WEIGHT :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.formatWeight(this.searchData.unladen_Weight),
                    { content: "DATE/TIME OUT :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    `${this.searchData.trans_Date_UL || "N/A"} ${this.searchData.trans_Time_UL || ""}`.trim(),
                ],
                [
                    { content: "NET WEIGHT :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.formatWeight(this.searchData.act_Net_Weight),
                    { content: "", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    "",
                ],
                [
                    { content: "REMARK :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    { content: this.searchData.remark || "N/A", colSpan: 3 },
                ],
            ],
            theme: "grid",
            startY: doc.lastAutoTable.finalY + 2,
            styles: {
                fontSize: 10,
                textColor: 0,
                lineWidth: 0.5,
                lineColor: [0, 0, 0],
            },
            columnStyles: {
                0: { cellWidth: tableWidth * 0.25 },
                1: { cellWidth: tableWidth * 0.25 },
                2: { cellWidth: tableWidth * 0.25 },
                3: { cellWidth: tableWidth * 0.25 },
            },
            margin: { left: leftMargin, right: rightMargin },
            tableWidth: tableWidth,
        })

        // Two Image Section as table row with two columns - consistent with main table
        autoTable(doc, {
            body: [
                [
                    {
                        content: "Vehicle Entering (Tare Weight)",
                        styles: {
                            halign: "center",
                            valign: "middle",
                            fontSize: 10,
                            minCellHeight: 60,
                            fillColor: [248, 249, 250],
                        },
                    },
                    {
                        content: "Vehicle Exiting (Gross Weight)",
                        styles: {
                            halign: "center",
                            valign: "middle",
                            fontSize: 10,
                            minCellHeight: 60,
                            fillColor: [248, 249, 250],
                        },
                    },
                ],
            ],
            theme: "grid",
            startY: doc.lastAutoTable.finalY, // No gap - start immediately after main table
            styles: {
                fontSize: 10,
                textColor: 0,
                lineWidth: 0.5,
                lineColor: [0, 0, 0],
            },
            columnStyles: {
                0: { cellWidth: tableWidth * 0.5 }, // 50% width for first image
                1: { cellWidth: tableWidth * 0.5 }, // 50% width for second image
            },
            margin: { left: leftMargin, right: rightMargin },
            tableWidth: tableWidth,
        })

        // Footer - centered
        const pageHeight = doc.internal.pageSize.getHeight()
        doc.setFontSize(8)
        doc.text("1 of 1", pageWidth / 2, pageHeight - 8, { align: "center" })

        doc.save(`${fileName}.pdf`)
    }

    Close() {
        this.dialogRef.close()
    }
}
