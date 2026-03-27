import { Injectable } from '@angular/core';
import { Leave } from '../../Models/leave.model';

@Injectable({ providedIn: 'root' })
export class LeaveDocumentService {

  private getStatusNumber(leave: Leave): number {
    const raw = leave.leaveStatus;
    if (typeof raw === 'number') return raw;
    const map: Record<string, number> = {
      'Pending': 0, 'AdminApproved': 1, 'NayabApproved': 2,
      'FullyApproved': 3, 'Rejected': 4, 'Cancelled': 5
    };
    return map[raw as any] ?? -1;
  }

  private formatDate(d: Date | string | null | undefined, withTime = false): string {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    if (!withTime) {
      return date.toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
      });
    }
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${timeStr}`;
  }

  private formatDateShort(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private getResumeDate(endDate: Date | string): string {
    const d = new Date(endDate);
    if (isNaN(d.getTime())) return '—';
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  private numberToWords(n: number): string {
    const words = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
      'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'];
    if (n <= 20) return words[n] ?? String(n);
    return String(n);
  }

  private getDocNumber(leave: Leave): string {
    const year = new Date(leave.appliedDate || leave.createdAt).getFullYear();
    const short = (leave.id || '000000').slice(-6).toUpperCase();
    return `LV/${year}/${short}`;
  }

  private getStatusLabel(statusNum: number): string {
    const map: Record<number, string> = {
      0: 'Pending', 1: 'Admin Approved', 2: 'Nayab Approved',
      3: 'Fully Approved', 4: 'Rejected', 5: 'Cancelled'
    };
    return map[statusNum] ?? 'Pending';
  }

  private getStatusClass(statusNum: number): string {
    if (statusNum === 3) return 'approved';
    if (statusNum === 4) return 'rejected';
    if (statusNum === 5) return 'cancelled';
    return 'pending';
  }

  private buildApprovalChainRows(leave: Leave, statusNum: number): string {
    const l = leave as any;

    const adminName   = l.adminApprovedByName   || leave.adminApprovedBy   || '—';
    const nayabName   = l.nayabApprovedByName   || leave.nayabApprovedBy   || '—';
    const tehsilName  = l.tehsildarApprovedByName || leave.tehsildarApprovedBy || '—';

    const adminDecision  = leave.adminApprovedBy
      ? 'Approved'
      : (statusNum === 4 && !leave.adminApprovedBy ? 'Rejected' : 'Pending');
    const nayabDecision  = leave.nayabApprovedBy
      ? 'Approved'
      : (statusNum === 4 && leave.adminApprovedBy && !leave.nayabApprovedBy ? 'Rejected' : 'Pending');
    const tehsilDecision = leave.tehsildarApprovedBy
      ? 'Approved'
      : (statusNum === 4 && leave.nayabApprovedBy && !leave.tehsildarApprovedBy ? 'Rejected' : 'Pending');

    const stampColor = (d: string) =>
      d === 'Approved' ? '#1a6b3a' : d === 'Rejected' ? '#8b1a1a' : '#7a5c00';
    const stamp = (d: string) =>
      `<span style="display:inline-block;padding:1px 9px;font-size:9.5pt;font-weight:bold;
        letter-spacing:0.8px;text-transform:uppercase;border:1.5px solid ${stampColor(d)};
        color:${stampColor(d)};">${d}</span>`;

    const row = (stage: string, authority: string, name: string, date: any, decision: string) =>
      `<tr>
        <td>${stage}</td>
        <td>${authority}</td>
        <td style="font-weight:600;">${name}</td>
        <td>${date ? this.formatDate(date, true) : '—'}</td>
        <td>${stamp(decision)}</td>
      </tr>`;

    return [
      row('Stage 1', 'Admin / Clerk',   adminName,  leave.adminApprovedDate,     adminDecision),
      row('Stage 2', 'Nayab Tehsildar', nayabName,  leave.nayabApprovedDate,     nayabDecision),
      row('Stage 3', 'Tehsildar',       tehsilName, leave.tehsildarApprovedDate, tehsilDecision),
    ].join('');
  }

  private buildRejectionSection(leave: Leave, statusNum: number): string {
    if (statusNum !== 4) return '';
    return `
      <div class="rejection-section">
        <p class="section-heading">Rejection Details</p>
        <table class="info-table">
          <tr><td>Rejected By</td><td>${leave.rejectedByName || leave.rejectedBy || '—'}</td></tr>
          <tr><td>Date of Rejection</td><td>${this.formatDate(leave.rejectedDate, true)}</td></tr>
          <tr><td>Reason for Rejection</td><td>${leave.rejectionReason || '—'}</td></tr>
        </table>
      </div>`;
  }

  private buildCancellationSection(leave: Leave, statusNum: number): string {
    if (statusNum !== 5) return '';
    return `
      <div class="rejection-section">
        <p class="section-heading">Cancellation Details</p>
        <table class="info-table">
          <tr><td>Cancelled On</td><td>${this.formatDate(leave.cancelledDate, true)}</td></tr>
          <tr><td>Reason</td><td>${leave.cancellationReason || '—'}</td></tr>
        </table>
      </div>`;
  }

  private buildSignatureSection(leave: Leave, statusNum: number): string {
    const l = leave as any;
    const adminName     = l.adminApprovedByName     || leave.adminApprovedBy     || '________________';
    const nayabName     = l.nayabApprovedByName     || leave.nayabApprovedBy     || '________________';
    const tehsildarName = leave.approvedByName || l.tehsildarApprovedByName || leave.tehsildarApprovedBy || '________________';

    const adminDate     = leave.adminApprovedDate     ? this.formatDateShort(leave.adminApprovedDate)     : '';
    const nayabDate     = leave.nayabApprovedDate     ? this.formatDateShort(leave.nayabApprovedDate)     : '';
    const tehsildarDate = leave.tehsildarApprovedDate ? this.formatDateShort(leave.tehsildarApprovedDate) : '';

    if (statusNum === 4 || statusNum === 5) {
      return `
        <div class="sig-section single-sig">
          <div class="sig-box">
            <div class="sig-gap"></div>
            <div class="sig-name">${leave.rejectedByName || leave.rejectedBy || '________________'}</div>
            <div class="sig-desig">Rejecting Authority</div>
            <div class="sig-date">${this.formatDateShort(leave.rejectedDate)}</div>
          </div>
        </div>`;
    }

    return `
      <div class="sig-section">
        <div class="sig-box">
          <div class="sig-gap"></div>
          <div class="sig-name">${adminName}</div>
          <div class="sig-desig">Admin Officer</div>
          <div class="sig-date">${adminDate}</div>
        </div>
        <div class="sig-box">
          <div class="sig-gap"></div>
          <div class="sig-name">${nayabName}</div>
          <div class="sig-desig">Nayab Tehsildar</div>
          <div class="sig-date">${nayabDate}</div>
        </div>
        <div class="sig-box">
          <div class="sig-gap"></div>
          <div class="sig-name">${tehsildarName}</div>
          <div class="sig-desig">Tehsildar</div>
          <div class="sig-date">${tehsildarDate}</div>
        </div>
      </div>`;
  }

  private buildOrderParagraph(leave: Leave, statusNum: number): string {
    if (statusNum === 3) {
      return `
        <p class="order-line">
          The above leave is sanctioned subject to the condition that the employee shall resume duty on
          <strong>${this.getResumeDate(leave.endDate)}</strong>. Any extension of leave shall require
          a fresh application and approval through the prescribed channel. The leave balance shall be
          updated accordingly in the department records.
        </p>`;
    }
    if (statusNum === 4) {
      return `
        <p class="order-line">
          The above leave application has been <strong>rejected</strong> for the reason mentioned above.
          The employee is advised to remain on duty. Fresh application may be submitted if required,
          subject to approval by the competent authority.
        </p>`;
    }
    if (statusNum === 5) {
      return `
        <p class="order-line">
          The above leave application has been <strong>cancelled</strong> as per the reason stated above.
          The employee is required to remain on duty for the said period. Leave balance, if debited,
          shall be restored in the department records.
        </p>`;
    }
    return `
      <p class="order-line">
        The above leave application is currently <strong>under review</strong> and is pending final
        approval from the competent authority. The applicant is advised not to proceed on leave until
        formal sanction order is issued.
      </p>`;
  }

  generateDocumentHtml(leave: Leave): string {
    const statusNum       = this.getStatusNumber(leave);
    const statusLabel     = this.getStatusLabel(statusNum);
    const statusClass     = this.getStatusClass(statusNum);
    const docNo           = this.getDocNumber(leave);
    const today           = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const appliedDate     = this.formatDate(leave.appliedDate);
    const startDate       = this.formatDate(leave.startDate);
    const endDate         = this.formatDate(leave.endDate);
    const totalDays       = Number(leave.totalDays) || 0;
    const daysWords       = this.numberToWords(totalDays);
    const isEmergency     = leave.isEmergencyLeave ? 'Yes' : 'No';

    // ── All section builders now use the fixed method names ──
    const approvalChainRows   = this.buildApprovalChainRows(leave, statusNum);
    const rejectionSection    = this.buildRejectionSection(leave, statusNum);
    const cancellationSection = this.buildCancellationSection(leave, statusNum);
    const orderParagraph      = this.buildOrderParagraph(leave, statusNum);
    const signatureSection    = this.buildSignatureSection(leave, statusNum);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Leave Sanction Order — ${leave.employeeName || ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Georgia, serif; font-size: 13pt; color: #111; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 20mm 16mm 20mm; background: #fff; position: relative; }
  .top-row { display: flex; justify-content: space-between; font-size: 10pt; color: #444; margin-bottom: 16px; }
  .office-block { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1.5px solid #111; }
  .office-mr { font-size: 14pt; font-weight: bold; letter-spacing: 0.3px; }
  .office-en { font-size: 10pt; color: #555; margin-top: 3px; }
  .doc-title-line { display: flex; align-items: center; gap: 10px; margin: 14px 0 5px; }
  .title-rule { flex: 1; border-top: 1px solid #999; }
  .doc-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.2px; text-align: center; white-space: nowrap; }
  .subject-line { font-size: 10pt; text-align: center; color: #555; margin-bottom: 18px; }
  .body-para { font-size: 12pt; line-height: 1.9; margin-bottom: 12px; text-align: justify; }
  .body-para strong { font-weight: bold; text-decoration: underline; }
  .section-heading { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 6px; text-decoration: underline; }
  .info-table { width: 100%; border-collapse: collapse; font-size: 11pt; margin-bottom: 4px; }
  .info-table td { padding: 5px 8px; border: 0.5px solid #bbb; vertical-align: top; }
  .info-table td:first-child { width: 38%; color: #444; }
  .info-table td:last-child { font-weight: bold; }
  .chain-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin: 10px 0; }
  .chain-table th { padding: 5px 8px; border: 0.5px solid #bbb; text-align: left; font-weight: bold; background: #f5f5f5; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.4px; }
  .chain-table td { padding: 6px 8px; border: 0.5px solid #bbb; vertical-align: middle; }
  .stamp { display: inline-block; padding: 1px 9px; font-size: 9.5pt; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase; border: 1.5px solid; }
  .approved-stamp { border-color: #1a6b3a; color: #1a6b3a; }
  .rejected-stamp { border-color: #8b1a1a; color: #8b1a1a; }
  .pending-stamp  { border-color: #7a5c00; color: #7a5c00; }
  .cancelled-stamp { border-color: #555; color: #555; }
  .order-line { font-size: 12pt; line-height: 1.9; margin: 12px 0; text-align: justify; }
  .order-line strong { font-weight: bold; text-decoration: underline; }
  .rejection-section { margin-top: 14px; }
  .sig-section { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
  .sig-section.single-sig { grid-template-columns: 1fr; max-width: 220px; }
  .sig-box { display: flex; flex-direction: column; gap: 3px; }
  .sig-gap { height: 32px; border-bottom: 0.5px solid #444; margin-bottom: 4px; }
  .sig-name { font-size: 11pt; font-weight: bold; }
  .sig-desig { font-size: 10pt; color: #555; }
  .sig-date  { font-size: 9pt; color: #666; margin-top: 2px; }
  .copy-to { margin-top: 20px; font-size: 10pt; color: #444; }
  .copy-to p { margin-bottom: 3px; }
  .footer-rule { border-top: 0.5px solid #bbb; margin-top: 24px; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9pt; color: #666; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 88pt; font-weight: bold; letter-spacing: 6px; text-transform: uppercase; pointer-events: none; user-select: none; z-index: 0; opacity: 0.045; }
  .watermark.approved  { color: #1a6b3a; }
  .watermark.rejected  { color: #8b1a1a; }
  .watermark.cancelled { color: #555; }
  .watermark.pending   { color: #7a5c00; }
  .content { position: relative; z-index: 1; }
  .attachment-note { margin-top: 6px; font-size: 10pt; color: #444; }
  @media print {
    @page { size: A4; margin: 18mm 20mm 16mm 20mm; }
    body { padding: 0; }
    .page { width: 100%; min-height: unset; padding: 0; margin: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="watermark ${statusClass}">${statusLabel}</div>
  <div class="content">

    <div class="top-row">
      <span>क्र. / No.: ${docNo}</span>
      <span>दिनांक / Date: ${today}</span>
    </div>

    <div class="office-block">
      <div class="office-mr">महाराष्ट्र शासन · तहसील कार्यालय</div>
      <div class="office-en">Government of Maharashtra · Tehsil Office</div>
    </div>

    <div class="doc-title-line">
      <div class="title-rule"></div>
      <div class="doc-title">Leave Sanction Order</div>
      <div class="title-rule"></div>
    </div>
    <div class="subject-line">
      रजा मंजुरी आदेश · Subject: ${statusNum === 4 ? 'Rejection of' : statusNum === 5 ? 'Cancellation of' : 'Grant of'} ${leave.leaveTypeName || 'Leave'}
    </div>

    <p class="body-para">
      With reference to the leave application submitted by
      <strong>${leave.employeeName || '—'}</strong>${leave.employeeCode ? `, Employee Code <strong>${leave.employeeCode}</strong>` : ''},
      and having been duly examined through the prescribed approval channel,
      the following leave record is hereby documented:
    </p>

    <p class="section-heading">Leave Details</p>
    <table class="info-table">
      <tr><td>Employee Name</td><td>${leave.employeeName || '—'}</td></tr>
      ${leave.employeeCode ? `<tr><td>Employee Code</td><td>${leave.employeeCode}</td></tr>` : ''}
      <tr><td>Leave Type</td><td>${leave.leaveTypeName || '—'}${leave.leaveTypeCode ? ` (${leave.leaveTypeCode})` : ''}</td></tr>
      <tr><td>Leave From</td><td>${startDate}</td></tr>
      <tr><td>Leave To</td><td>${endDate}</td></tr>
      <tr><td>Total Days</td><td>${totalDays} (${daysWords}) Days</td></tr>
      <tr><td>Emergency Leave</td><td>${isEmergency}</td></tr>
      <tr><td>Date of Application</td><td>${appliedDate}</td></tr>
      <tr><td>Reason for Leave</td><td>${leave.reason || '—'}</td></tr>
      ${leave.attachmentUrl ? `<tr><td>Supporting Document</td><td>Attached</td></tr>` : ''}
      <tr><td>Current Status</td><td><span class="stamp ${statusClass}-stamp">${statusLabel}</span></td></tr>
    </table>

    ${leave.attachmentUrl ? `<p class="attachment-note">* Supporting document: ${leave.attachmentUrl}</p>` : ''}

    <p class="section-heading">Approval Chain Record</p>
    <table class="chain-table">
      <thead>
        <tr><th>Stage</th><th>Officer</th><th>Name</th><th>Date &amp; Time</th><th>Status</th></tr>
      </thead>
      <tbody>${approvalChainRows}</tbody>
    </table>

    ${rejectionSection}
    ${cancellationSection}
    ${orderParagraph}
    ${signatureSection}

    <div class="copy-to">
      <p><strong>Copy to:</strong></p>
      <p>1. The employee concerned — for information and compliance.</p>
      <p>2. Department file / Leave register.</p>
      <p>3. HR / Establishment section.</p>
    </div>

    <div class="footer-rule">
      <span>Generated by Attendance Management System &nbsp;·&nbsp; Computer-generated document.</span>
      <span>Page 1 of 1</span>
    </div>

  </div>
</div>
</body>
</html>`;
  }

  printLeave(leave: Leave): void {
    const html = this.generateDocumentHtml(leave);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
      finally { setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1500); }
    }, 500);
  }

  downloadLeave(leave: Leave): void {
    const html = this.generateDocumentHtml(leave);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `Leave_${leave.employeeCode || leave.employeeId}_${new Date(leave.startDate).toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
}