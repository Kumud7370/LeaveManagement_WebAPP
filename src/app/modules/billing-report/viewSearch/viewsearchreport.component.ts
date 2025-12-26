import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import moment from "moment"
import { Inject } from '@angular/core';
import { ButtonCloseDirective, ButtonDirective, ModalBodyComponent, ModalComponent, ModalFooterComponent, ModalHeaderComponent, ModalModule, ModalTitleDirective, ModalToggleDirective } from "@coreui/angular";

@Component({
    selector: "app-viewsearchreport",
    templateUrl: "./viewsearchreport.component.html",
    styleUrls: ["./viewsearchreport.component.scss"],
    standalone: true,
    imports: [CommonModule,ModalModule, 
   ],
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
        this.searchData = data;
        console.log("Search Report View Dialog - Original data received:", data)
        console.log("Search Report View Dialog - Normalized data:", this.searchData)
    }

isModalVisible = true;

openModal() {
  this.isModalVisible = true;
}

closeModal() {
  this.isModalVisible = false;
}

onModalVisibleChange(value: boolean) {
  this.isModalVisible = value;
}

    // Format weight values - for UI display
    formatWeight(weight: string | number): string {
        //  console.log("Formatting weight:", weight)
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
    async downloadPDF(): Promise<void> {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });

        const generatedBy = sessionStorage.getItem('UserName') || 'User';
        const currentDate = moment().format('DD-MM-YYYY');
        const fileName = `WeighSlip_${this.searchData.slipSrNo || "Unknown"}_${moment().format("DDMMYYYY_HHmmss")}`;

        const bmcLogo = await this.getBase64ImageFromURL('assets/images/mcgmlogo.png');

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const leftMargin = 20;
        const rightMargin = 20;
        const tableWidth = pageWidth - leftMargin - rightMargin;

        // === Header ===
        doc.setFontSize(9);
        doc.text('SWM-MSI', margin, margin + 10);
        doc.text(`Date: ${currentDate}`, pageWidth - margin - 100, margin + 10);

        // Draw top line
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(margin, margin + 15, pageWidth - margin, margin + 15);

        // === Header Table ===
        autoTable(doc, {
            startY: margin + 20,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 10,
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.5,
                lineColor: [0, 0, 0],
            },
            margin: { left: margin, right: margin },
            tableWidth: pageWidth - margin * 2,
            body: [
                [
                    { content: '', rowSpan: 2, styles: { halign: 'center', valign: 'middle', cellWidth: 80, minCellHeight: 60 } },
                    { content: 'SWM MIS', colSpan: 2, styles: { fontSize: 14, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
                ],
                [
                    { content: `User: ${generatedBy}`, styles: { halign: 'left', fontSize: 10 } },
                    { content: `Date: ${currentDate}`, styles: { halign: 'right', fontSize: 10 } },
                ]
            ],
            didDrawCell: (data: any) => {
                if (data.row.index === 0 && data.column.index === 0) {
                    doc.addImage(bmcLogo, 'PNG', data.cell.x + 10, data.cell.y + 5, 50, 50);
                }
            }
        });

        // === WEIGHING TICKET Label ===
        autoTable(doc, {
            body: [[{ content: "WEIGHING SLIP", styles: { halign: "left", fontSize: 12, fontStyle: "bold" } }]],
            theme: "plain",
            styles: { textColor: 0, fontSize: 12 },
            startY: doc.lastAutoTable.finalY + 5,
            margin: { left: leftMargin, right: rightMargin },
            tableWidth: tableWidth,
        });

        // === Main Info Table ===
        autoTable(doc, {
            body: [
                [
                    { content: "SLIP NO :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.slipSrNo || "N/A",
                    { content: "LOGSHEET NO :", styles: { fontStyle: "bold", fillColor: [248, 249, 250] } },
                    this.searchData.dC_No || "N/A",
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
        });

        // === Vehicle Images ===
        const inVehicleImg = await this.toBase64Image(this.searchData.in_Vehicle_Image);
        const outVehicleImg = await this.toBase64Image(this.searchData.out_Vehicle_Image);

        function addImageToCell(doc: any, base64: string, x: number, y: number, width: number, height: number) {
            try {
                const imgW = width - 10;
                const imgH = height - 10;
                doc.addImage(base64, "JPEG", x + 5, y + 5, imgW, imgH);
            } catch (err) {
                console.error("Error adding image to PDF:", err);
            }
        }

        autoTable(doc, {
            body: [
                [
                    { content: "Vehicle Entering", styles: { halign: "center", minCellHeight: 320 } },
                    { content: "Vehicle Exiting", styles: { halign: "center", minCellHeight: 320 } },
                ],
            ],
            theme: "grid",
            startY: doc.lastAutoTable.finalY + 2,
            didDrawCell: (data) => {
                if (data.row.index === 0 && data.column.index === 0 && inVehicleImg) {
                    addImageToCell(doc, inVehicleImg, data.cell.x, data.cell.y, data.cell.width, data.cell.height);
                }
                if (data.row.index === 0 && data.column.index === 1 && outVehicleImg) {
                    addImageToCell(doc, outVehicleImg, data.cell.x, data.cell.y, data.cell.width, data.cell.height);
                }
            },
        });

        // === Footer ===
        doc.setFontSize(8);
        doc.text("1 of 1", pageWidth / 2, pageHeight - 8, { align: "center" });

        // === Save PDF ===
        doc.save(`${fileName}.pdf`);
    }

    async toBase64Image(url: string): Promise<string> {
        const response = await fetch(`https://swm.mcgm.gov.in/swmmsiwebapi/api/Report/proxy-image?url=${encodeURIComponent(url)}`);
        const blob = await response.blob();
        console.log("Blobsize:", blob.size, "type:", blob.type);
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    // ✅ Convert image URL → Base64 (with CORS fallback)
    // async toBase64Image(url: string): Promise<string> {
    //     try {
    //         const response = await fetch(url, { mode: "no-cors" }); // attempt even without CORS
    //         const blob = await response.blob();
    //         return await new Promise<string>((resolve, reject) => {
    //             const reader = new FileReader();
    //             reader.onloadend = () => resolve(reader.result as string);
    //             reader.onerror = reject;
    //             reader.readAsDataURL(blob);
    //         });
    //     } catch (err) {
    //         console.error("Error converting image:", url, err);
    //         throw err;
    //     }
    // }
    getBase64ImageFromURL(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Handle cross-origin issues
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (err) => reject(err);
        });
    }

    Close() {
        this.dialogRef.close()
    }
}
// ✅ Helper function to safely load and draw image
function addImageToCell(doc: any, base64: any, x: any, y: any, cellWidth: any, cellHeight: any) {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
        const aspect = img.width / img.height;
        let drawWidth = cellWidth - 10;
        let drawHeight = drawWidth / aspect;
        if (drawHeight > cellHeight - 10) {
            drawHeight = cellHeight - 10;
            drawWidth = drawHeight * aspect;
        }
        const offsetX = x + (cellWidth - drawWidth) / 2;
        const offsetY = y + (cellHeight - drawHeight) / 2;
        doc.addImage(base64, "JPEG", offsetX, offsetY, drawWidth, drawHeight);
    };
}