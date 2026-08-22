/**
 * Puppeteer executes whatever HTML we hand it — patient names, notes, item
 * descriptions, etc. are all user-supplied, so they must be escaped before
 * interpolation or a crafted value (e.g. a patient name containing
 * `<img src=x onerror=...>`) could inject markup/script into the rendered
 * page rather than just being displayed as text.
 */
export function esc(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ClinicInfo {
  name: string;
  nameAr: string;
  address?: string;
  city?: string;
  contactPhone: string;
  contactEmail: string;
}

const BASE_STYLE = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    color: #1e293b;
    font-size: 13px;
    direction: rtl;
    margin: 0;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f766e;
    padding-bottom: 14px;
    margin-bottom: 20px;
  }
  .clinic-name { font-size: 20px; font-weight: 700; color: #0f766e; }
  .clinic-meta { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.6; }
  .doc-title { font-size: 22px; font-weight: 700; text-align: end; }
  .doc-meta { font-size: 12px; color: #64748b; text-align: end; margin-top: 4px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-bottom: 6px; }
  .info-grid { display: flex; gap: 24px; }
  .info-col { flex: 1; }
  .info-row { font-size: 13px; margin-bottom: 3px; }
  .info-label { color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { text-align: start; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 8px 6px; border-bottom: 1px solid #cbd5e1; }
  td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .totals { width: 260px; margin-inline-start: auto; margin-top: 10px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-row.grand { border-top: 1px solid #cbd5e1; margin-top: 4px; padding-top: 8px; font-size: 15px; font-weight: 700; color: #0f766e; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  .badge.paid { background: #dcfce7; color: #166534; }
  .badge.partial { background: #dbeafe; color: #1e40af; }
  .badge.unpaid { background: #fef3c7; color: #92400e; }
  .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  .med-row { padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
  .med-name { font-size: 14px; font-weight: 600; }
  .med-detail { font-size: 12px; color: #64748b; margin-top: 2px; }
`;

function header(clinic: ClinicInfo, title: string, metaLines: string[]): string {
  return `
    <div class="header">
      <div>
        <div class="clinic-name">${esc(clinic.nameAr || clinic.name)}</div>
        <div class="clinic-meta">
          ${esc([clinic.address, clinic.city].filter(Boolean).join('، '))}<br/>
          ${esc(clinic.contactPhone)}${clinic.contactEmail ? ' · ' + esc(clinic.contactEmail) : ''}
        </div>
      </div>
      <div>
        <div class="doc-title">${esc(title)}</div>
        ${metaLines.map((l) => `<div class="doc-meta">${esc(l)}</div>`).join('')}
      </div>
    </div>
  `;
}

const STATUS_LABELS_AR: Record<string, string> = {
  UNPAID: 'غير مدفوعة',
  PARTIALLY_PAID: 'مدفوعة جزئيًا',
  PAID: 'مدفوعة',
  CANCELLED: 'ملغاة',
};
const STATUS_CLASS: Record<string, string> = {
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partial',
  PAID: 'paid',
  CANCELLED: 'unpaid',
};

export interface InvoicePdfData {
  invoiceNumber: string;
  date: string;
  patientName?: string;
  patientPhone?: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  status: string;
  notes?: string;
}

export function buildInvoiceHtml(clinic: ClinicInfo, invoice: InvoicePdfData): string {
  const balanceDue = invoice.total - invoice.amountPaid;
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="utf-8" /><style>${BASE_STYLE}</style></head>
    <body>
      ${header(clinic, 'فاتورة', [`رقم: ${invoice.invoiceNumber}`, `التاريخ: ${invoice.date}`])}

      <div class="section info-grid">
        <div class="info-col">
          <div class="section-title">بيانات المريض</div>
          <div class="info-row"><span class="info-label">الاسم:</span> ${esc(invoice.patientName) || '—'}</div>
          <div class="info-row" dir="ltr" style="text-align: end;"><span class="info-label">الهاتف:</span> ${esc(invoice.patientPhone) || '—'}</div>
        </div>
        <div class="info-col" style="text-align: end;">
          <div class="section-title">الحالة</div>
          <span class="badge ${STATUS_CLASS[invoice.status] ?? 'unpaid'}">${esc(STATUS_LABELS_AR[invoice.status] ?? invoice.status)}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>
        </thead>
        <tbody>
          ${invoice.items
            .map(
              (item) => `
            <tr>
              <td>${esc(item.description)}</td>
              <td>${esc(item.quantity)}</td>
              <td>${item.unitPrice.toFixed(2)}</td>
              <td>${item.total.toFixed(2)}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>الإجمالي الفرعي</span><span>${invoice.subtotal.toFixed(2)}</span></div>
        ${invoice.discount > 0 ? `<div class="totals-row"><span>الخصم</span><span>-${invoice.discount.toFixed(2)}</span></div>` : ''}
        <div class="totals-row"><span>المبلغ المدفوع</span><span>${invoice.amountPaid.toFixed(2)}</span></div>
        <div class="totals-row grand"><span>المبلغ المستحق</span><span>${balanceDue.toFixed(2)}</span></div>
      </div>

      ${invoice.notes ? `<div class="section"><div class="section-title">ملاحظات</div><div>${esc(invoice.notes)}</div></div>` : ''}

      <div class="footer">تم إنشاء هذا المستند إلكترونيًا عبر نظام العيادة</div>
    </body>
    </html>
  `;
}

export interface PrescriptionPdfData {
  date: string;
  patientName?: string;
  patientPhone?: string;
  doctorName?: string;
  medications: { name: string; dosage?: string; frequency?: string; durationDays?: number; instructions?: string }[];
  notes?: string;
}

export function buildPrescriptionHtml(clinic: ClinicInfo, rx: PrescriptionPdfData): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="utf-8" /><style>${BASE_STYLE}</style></head>
    <body>
      ${header(clinic, 'روشتة طبية', [`التاريخ: ${rx.date}`])}

      <div class="section info-grid">
        <div class="info-col">
          <div class="section-title">بيانات المريض</div>
          <div class="info-row"><span class="info-label">الاسم:</span> ${esc(rx.patientName) || '—'}</div>
          <div class="info-row" dir="ltr" style="text-align: end;"><span class="info-label">الهاتف:</span> ${esc(rx.patientPhone) || '—'}</div>
        </div>
        <div class="info-col" style="text-align: end;">
          <div class="section-title">الطبيب المعالج</div>
          <div class="info-row">${esc(rx.doctorName) || '—'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">الأدوية الموصوفة</div>
        ${rx.medications
          .map(
            (med) => `
          <div class="med-row">
            <div class="med-name">${esc(med.name)}</div>
            <div class="med-detail">
              ${esc([med.dosage, med.frequency, med.durationDays ? `${med.durationDays} يوم` : undefined].filter(Boolean).join(' · '))}
            </div>
            ${med.instructions ? `<div class="med-detail">${esc(med.instructions)}</div>` : ''}
          </div>
        `,
          )
          .join('')}
      </div>

      ${rx.notes ? `<div class="section"><div class="section-title">ملاحظات</div><div>${esc(rx.notes)}</div></div>` : ''}

      <div class="footer">تم إنشاء هذا المستند إلكترونيًا عبر نظام العيادة</div>
    </body>
    </html>
  `;
}
