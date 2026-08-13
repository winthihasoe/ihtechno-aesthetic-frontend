/**
 * Print styles for PaymentDetailPage (invoice / receipt).
 *
 * IMPORTANT — do not change without product sign-off:
 * Clinic invoices and receipts MUST print on A5 portrait (148 × 210 mm).
 * Keep `@page { size: A5 portrait; }` and `.invoice-receipt-lines--a5` sizing in sync.
 */
export default function PaymentDetailPrintStyles() {
  return (
    <style>{`
        .print-root {
          width: 100%;
          max-width: 100%;
          margin: 0;
        }

        @media print {
          /* REQUIRED: A5 portrait — clinic standard paper size for all invoice prints */
          @page {
            size: A5 portrait;
            /* Slightly tighter margins → wider printable area on A5 */
            margin: 3mm;
          }

          html, body {
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          #root {
            height: auto !important;
            overflow: visible !important;
          }

          /* Hide scroll-area chrome that is not the invoice page (keeps print-root visible) */
          #workspace-scroll-container > *:not(:has(.print-root)) {
            display: none !important;
          }

          .payment-detail-page > *:not(.print-root) {
            display: none !important;
          }

          .MuiDialog-root,
          .MuiModal-root {
            display: none !important;
          }

          /*
           * Hide app shell with display:none (visibility:hidden still reserves
           * sidebar/topbar space and shrinks the receipt to the right).
           */
          #workspace-layout-root > .MuiAppBar-root,
          #workspace-layout-root nav,
          #workspace-layout-root > .MuiBox-root:first-of-type,
          .MuiDrawer-root,
          .MuiBottomNavigation-root,
          .no-print {
            display: none !important;
          }

          #workspace-layout-root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            transform: none !important;
          }

          body::before,
          body::after {
            display: none !important;
          }

          #workspace-layout-root > .MuiBox-root {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            transform: none !important;
          }

          #workspace-scroll-container {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
          }

          main.MuiBox-root {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            padding-left: 0 !important;
            margin: 0 !important;
            transform: none !important;
          }

          /* Only show invoice content; fixed overlay escapes sidebar/main column layout */
          body * {
            visibility: hidden !important;
          }

          .print-root,
          .print-root * {
            visibility: visible !important;
          }

          .print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: auto !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 2147483647 !important;
            background: #fff !important;
            height: auto !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            transform: none !important;
          }

          .print-only {
            display: block !important;
          }

          .print-paper {
            box-shadow: none !important;
            border: none !important;
          }

          .print-receipt {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 auto !important;
            padding: 2mm 2.5mm !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            display: block !important;
            page-break-after: auto !important;
            break-inside: auto !important;
            border-radius: 0 !important;
          }

          .print-receipt .print-receipt-body {
            display: block !important;
            flex: none !important;
            min-height: 0 !important;
          }

          .print-receipt .invoice-print-note-footer .print-only {
            margin-top: 4px !important;
          }

          .print-receipt .invoice-receipt-header {
            margin-bottom: 8px !important;
            padding-bottom: 4px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-receipt .invoice-receipt-logo {
            max-height: 16mm !important;
            max-width: 42% !important;
            width: auto !important;
            height: auto !important;
          }

          .print-receipt .invoice-receipt-clinic-name {
            font-size: 13px !important;
            line-height: 1.3 !important;
            margin-bottom: 2px !important;
          }

          .print-receipt .invoice-receipt-clinic-description {
            font-size: 10px !important;
            line-height: 1.35 !important;
            margin-bottom: 4px !important;
          }

          .print-receipt .invoice-receipt-meta-grid {
            margin-top: 8px !important;
            gap: 6px !important;
          }

          .print-receipt .invoice-receipt-header .MuiTypography-root {
            margin-top: 0 !important;
            margin-bottom: 2px !important;
          }

          .print-receipt .invoice-receipt-thank-you {
            margin-top: 14px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-receipt .MuiDivider-root {
            margin-top: 10px !important;
            margin-bottom: 10px !important;
          }

          /* Print-only typography — larger & looser than screen editor (A5) */
          .print-receipt .MuiTypography-subtitle1 {
            font-size: 15px !important;
            line-height: 1.35 !important;
          }

          .print-receipt .MuiTypography-caption,
          .print-receipt .MuiTypography-body2 {
            font-size: 11px !important;
            line-height: 1.45 !important;
          }

          .invoice-receipt-lines--a5 .MuiTableCell-root,
          .invoice-receipt-lines--a5 .MuiTableCell-root .MuiTypography-root {
            font-size: 11px !important;
            line-height: 1.4 !important;
          }

          .invoice-receipt-lines--a5 .MuiTableCell-root {
            padding: 5px 6px !important;
            vertical-align: top !important;
          }

          .invoice-receipt-lines--a5 .MuiTableHead-root .MuiTableCell-root,
          .invoice-receipt-lines--a5 .MuiTableHead-root .MuiTypography-root {
            font-size: 10.5px !important;
            line-height: 1.35 !important;
          }

          .invoice-receipt-lines--a5 .MuiTableHead-root .MuiTableCell-root {
            padding-top: 4px !important;
            padding-bottom: 6px !important;
          }

          .invoice-receipt-lines--a5 .MuiTableBody-root .MuiTableRow-root {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .invoice-receipt-lines--a5 .MuiTableBody-root .MuiTableRow-root + .MuiTableRow-root .MuiTableCell-root {
            padding-top: 4px !important;
          }

          .invoice-receipt-lines--a5 .MuiTableHead-root {
            display: table-header-group !important;
          }

          .print-receipt .invoice-print-totals-wrap {
            margin-top: 10px !important;
            padding-top: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-receipt table.invoice-receipt-lines--a5 {
            margin-top: 8px !important;
            width: 100% !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .print-receipt .invoice-receipt-totals {
            padding-bottom: 0 !important;
            margin-top: 4px !important;
          }

          .print-receipt .invoice-receipt-totals .MuiTypography-root {
            font-size: 11px !important;
            line-height: 1.45 !important;
            margin-bottom: 2px !important;
          }

          .print-receipt .invoice-receipt-totals-grand .MuiTypography-root {
            font-size: 12.5px !important;
            line-height: 1.4 !important;
            font-weight: 700 !important;
            margin-top: 4px !important;
          }

          .print-receipt .invoice-receipt-payment-summary .MuiTypography-root {
            font-size: 10.5px !important;
            line-height: 1.4 !important;
          }

          .print-receipt .invoice-print-note-footer {
            margin-top: 10px !important;
            padding-top: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        .print-only {
          display: none;
        }
      `}</style>
  );
}
