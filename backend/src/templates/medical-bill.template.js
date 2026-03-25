function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function fmtAmount(value) {
  return toAmount(value).toFixed(2);
}

function unitsPerPack(packing) {
  const text = String(packing || "").trim();
  if (!text) return 1;

  const parts = text
    .split(/[^0-9.]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!parts.length) return 1;
  return parts.reduce((acc, value) => acc * value, 1);
}

function normalizeItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((item) => ({
      productName: item?.productName || "",
      packing: item?.packing || "",
      batchNo: item?.batchNo || "",
      exp: item?.exp || "",
      quantity: item?.quantity || "",
      mrp: item?.mrp || "",
      discount: item?.discount || "",
      amount: item?.amount || "",
    }))
    .filter((item) =>
      [
        item.productName,
        item.packing,
        item.batchNo,
        item.exp,
        item.quantity,
        item.mrp,
        item.discount,
        item.amount,
      ].some((field) => String(field).trim() !== ""),
    );
}

function chunk(items, size) {
  const pages = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

function lineValues(item) {
  const qty = toAmount(item.quantity);
  const mrp = toAmount(item.mrp);
  const discountPct = toAmount(item.discount);
  const packUnits = unitsPerPack(item.packing);

  const enteredAmount = toAmount(item.amount);
  const hasRateInputs = qty > 0 && mrp > 0;
  const grossFromRate = hasRateInputs ? (qty / packUnits) * mrp : 0;
  const netFromRate = grossFromRate * (1 - discountPct / 100);

  // Always prefer computed rate logic when qty/mrp are present.
  const gross = hasRateInputs ? grossFromRate : enteredAmount;
  const net = hasRateInputs ? netFromRate : enteredAmount;

  return { gross, net };
}

function toWordsIndian(value) {
  const num = Math.floor(toAmount(value));
  if (!num) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n) {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  }

  function threeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (!hundred) return twoDigits(rest);
    return `${ones[hundred]} Hundred${rest ? ` ${twoDigits(rest)}` : ""}`;
  }

  let n = num;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundredPart = n;

  const parts = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundredPart) parts.push(threeDigits(hundredPart));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function resolveBillDate(value) {
  const provided = String(value || "").trim();
  if (provided) return provided;

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function generateMedicalBillHTML(data) {
  const rowsPerPage = 20;
  const items = normalizeItems(data.items);
  const pagedItems = items.length ? chunk(items, rowsPerPage) : [[]];
  const billDate = resolveBillDate(data.billDate);
  const footerNote = String(data.footerNote || "").trim();

  let runningNetTotal = 0;
  let runningGrossTotal = 0;

  const pagesHTML = pagedItems
    .map((pageItems, pageIndex) => {
      const filledPageItems = [...pageItems];
      while (filledPageItems.length < rowsPerPage) {
        filledPageItems.push(null);
      }

      const itemRows = filledPageItems
        .map((item, idx) => {
          if (!item) {
            return `
              <tr class="filler-row">
                <td class="c">${pageIndex * rowsPerPage + idx + 1}</td>
                <td>&nbsp;</td>
                <td class="c">&nbsp;</td>
                <td class="c">&nbsp;</td>
                <td class="c">&nbsp;</td>
                <td class="c">&nbsp;</td>
                <td class="r">&nbsp;</td>
                <td class="r">&nbsp;</td>
                <td class="r">&nbsp;</td>
              </tr>
            `;
          }

          const rowNo = pageIndex * rowsPerPage + idx + 1;
          const { gross, net } = lineValues(item);

          runningGrossTotal += gross;
          runningNetTotal += net;

          return `
            <tr>
              <td class="c">${rowNo}</td>
              <td>${esc(item.productName)}</td>
              <td class="c">${esc(item.packing)}</td>
              <td class="c">${esc(item.batchNo)}</td>
              <td class="c">${esc(item.exp)}</td>
              <td class="c">${esc(item.quantity)}</td>
              <td class="r">${esc(item.mrp)}</td>
              <td class="r">${item.discount ? esc(item.discount) + '%' : ''}</td>
              <td class="r">${fmtAmount(net)}</td>
            </tr>
          `;
        })
        .join("");
      const renderedRows = itemRows;

      const isLastPage = pageIndex === pagedItems.length - 1;
      const subtotal = runningGrossTotal;
      const grandTotal = runningNetTotal;
      const lessDiscount = Math.max(0, subtotal - grandTotal);

      const totalsHtml = isLastPage
        ? `
          <div class="summary-col">
            <div class="summary-row"><span>SUB TOTAL</span><strong>${fmtAmount(subtotal)}</strong></div>
            <div class="summary-row"><span>LESS DISCOUNT</span><strong>${fmtAmount(lessDiscount)}</strong></div>
            <div class="summary-row grand"><span>GRAND TOTAL</span><strong>${fmtAmount(grandTotal)}</strong></div>
          </div>
        `
        : `
          <div class="summary-col">
            <div class="summary-row grand"><span>C/F TOTAL</span><strong>${fmtAmount(grandTotal)}</strong></div>
          </div>
        `;

      const amountInWords = `Rupees ${toWordsIndian(grandTotal)} Only`;

      return `
        <section class="sheet ${!isLastPage ? "page-break" : ""}">
          <div class="bill-box">
            <div class="top-header">
              <div class="store-left">
                <h1>${esc(data.storeName || "KRISHNA MEDICAL STORE")}</h1>
                <div class="store-subline">${esc(data.storeTagline || "SHOP NO.CP-1/LGF-22 JEEVAN PLAZA")}</div>
                <div class="store-subline">${esc(data.storeAddress || "VIPUL KHAND-2 GOMTINAGAR LUCKNOW-226010")}</div>
                <div class="store-subline">${esc(data.storePhone || "Phone  : 9559953132")}</div>
                <div class="store-subline">${esc(data.storeEmail || "Email  : krishnamedicalstoregmt@gmil.com")}</div>
              </div>
              <div class="store-right">
                <div class="meta-line"><span class="meta-label">GSTIN</span><span class="meta-sep">:</span><span class="meta-value">${esc(data.gstin || "09FICPP4622N1ZR")}</span></div>
                <div class="meta-line"><span class="meta-label">DL NO.</span><span class="meta-sep">:</span><span class="meta-value">${esc(data.drugLicense1 || "UP32200005490")}</span></div>
                <div class="meta-line"><span class="meta-label">DL NO.</span><span class="meta-sep">:</span><span class="meta-value">${esc(data.drugLicense2 || "UP32210005485")}</span></div>
              </div>
            </div>

            <div class="patient-row">
              <div class="patient-col">
                <div class="meta-line"><span class="meta-label">Patient Name :</span><span class="meta-value">${esc(data.patientName || "")}</span></div>
                <div class="meta-line"><span class="meta-label">Dr. Name :</span><span class="meta-value">${esc(data.doctorName || "")}</span></div>
              </div>
              <div class="patient-col">
                <div class="meta-line wrap"><span class="meta-label">Patient Add :</span><span class="meta-value">${esc(data.patientAddress || "")}</span></div>
                <div class="meta-line"><span class="meta-label">Patient Mobile :</span><span class="meta-value">${esc(data.patientMobile || "")}</span></div>
              </div>
              <div class="bill-meta">
                <div class="meta-line"><span class="meta-label">BILL NO :</span><span class="meta-value">${esc(data.billNo || "")}</span></div>
                <div class="meta-line"><span class="meta-label">Date :</span><span class="meta-value">${esc(billDate)}</span></div>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th class="w-sno">Sr.</th>
                  <th class="w-name">Product Name</th>
                  <th class="w-pack">Packing</th>
                  <th class="w-batch">Batch No</th>
                  <th class="w-exp">Exp</th>
                  <th class="w-qty">Quantity</th>
                  <th class="w-mrp">M.R.P.</th>
                  <th class="w-disc">Disc%</th>
                  <th class="w-amt">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${renderedRows}
              </tbody>
            </table>

            <div class="bottom-block">
              <div class="notes-col">
                <div class="note-line">Goods once sold will not be taken back.</div>
                <div class="note-line">We believe in quality and best service.</div>
                <div class="note-line">Subject to Lucknow jurisdiction only.</div>
                <div class="note-line words">${esc(amountInWords)}</div>
              </div>

              <div class="sign-col">
                ${data.upiQrCodeUrl ? `<img src="${data.upiQrCodeUrl}" style="width: 44px; height: 44px; margin: 2px auto 0; display: block;" alt="Pay via UPI">` : ''}
                <div class="signature-wrap">
                  <div style="font-family: 'Satisfy', cursive; font-size: 18px; font-weight: normal; padding-bottom: 2px; color: #555; -webkit-font-smoothing: antialiased;">Anubhav Shukla</div>
                  <div class="signature">Signatory</div>
                </div>
              </div>

              ${totalsHtml}
            </div>
          </div>

          ${footerNote ? `<div class="footer-note">${esc(footerNote)}</div>` : ""}
        </section>
      `;
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=Satisfy&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 11.5px;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 9mm 12mm 7mm;
      page-break-inside: avoid;
      position: relative;
    }

    .page-break { page-break-after: always; }

    .bill-box {
      width: 100%;
      border: 1px solid #959595;
    }

    .top-header {
      display: grid;
      grid-template-columns: 1fr 430px;
      border-bottom: 2px solid #000;
      min-height: 116px;
    }

    .store-left,
    .store-right {
      padding: 6px 10px;
      line-height: 1.25;
    }

    .store-left h1 {
      margin: 0 0 4px;
      font-size: 31px;
      line-height: 1;
      letter-spacing: 0;
      font-weight: 700;
      white-space: nowrap;
    }

    .store-subline {
      margin: 2px 0;
      font-size: 12px;
      line-height: 1.2;
    }

    .store-right {
      border-left: none;
      display: grid;
      align-content: center;
      gap: 4px;
      padding-top: 4px;
      padding-right: 10px;
    }

    .store-right .meta-line {
      grid-template-columns: 92px 10px 1fr;
      gap: 4px;
      align-items: baseline;
      margin: 0;
      font-size: 12px;
      line-height: 1.2;
    }

    .store-right .meta-label {
      font-size: 12px;
      letter-spacing: 0.2px;
    }

    .store-right .meta-sep {
      text-align: center;
      font-weight: 700;
      color: #1e1e1e;
    }

    .store-right .meta-value {
      font-size: 12px;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .patient-row {
      display: grid;
      grid-template-columns: 1fr 1fr 215px;
      border-bottom: 1px solid #959595;
      min-height: 74px;
    }

    .patient-col,
    .bill-meta {
      padding: 6px 8px;
      line-height: 1.3;
      font-size: 12px;
    }

    .patient-col .meta-line,
    .bill-meta .meta-line {
      margin: 0 0 5px;
    }

    .meta-line {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 6px;
      align-items: start;
    }

    .meta-label {
      font-weight: 700;
      color: #1e1e1e;
      white-space: nowrap;
    }

    .meta-value {
      min-width: 0;
      word-wrap: break-word;
      white-space: normal;
    }

    .meta-line.wrap .meta-value {
      white-space: normal;
      line-height: 1.2;
    }

    .bill-meta {
      border-left: none;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: 0;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border-bottom: none; /* Let the bottom cells or container handle it */
      border-left: none;
      border-right: none;
    }

    .items-table th,
    .items-table td {
      border-right: 1px solid #959595;
      padding: 2px 4px;
      height: 22px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 10.5px;
      font-family: "Courier New", Courier, monospace;
      border-bottom: 1px solid #dcdcdc; /* Subtle row lines */
    }

    .items-table th:last-child,
    .items-table td:last-child {
      border-right: none;
    }

    .items-table th {
      background: #60dde5;
      border-bottom: 1px solid #6b6b6b;
      font-family: "Times New Roman", Times, serif;
      font-size: 11px;
      font-weight: 700;
      text-align: left;
      letter-spacing: 0.1px;
    }

    .items-table tbody tr + tr td {
      border-top: none;
    }

    .items-table tr.empty-row td {
      height: 90px;
      border-top: none;
    }

    .c { text-align: center; }
    .r { text-align: right; }

    .w-sno { width: 5%; text-align: center; }
    .w-name { width: 30%; }
    .w-pack { width: 10%; text-align: center; }
    .w-batch { width: 11%; text-align: center; }
    .w-exp { width: 8%; text-align: center; }
    .w-qty { width: 10%; text-align: center; }
    .w-mrp { width: 9%; text-align: right; }
    .w-disc { width: 7%; text-align: right; }
    .w-amt { width: 10%; text-align: right; }

    .bottom-block {
      display: grid;
      grid-template-columns: 1.6fr 1fr 1fr;
      min-height: 84px;
      border-top: 1px solid #959595;
    }

    .notes-col,
    .sign-col,
    .summary-col {
      border-right: 1px solid #959595;
    }

    .notes-col {
      padding: 4px 6px;
      font-size: 9.5px;
      line-height: 1.35;
    }

    .note-line.words {
      font-size: 10.5px;
      margin-top: 6px;
      font-weight: 700;
    }

    .sign-col {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 4px 6px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
    }

    .summary-col {
      border-right: none;
      display: flex;
      flex-direction: column;
    }

    .summary-row {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #959595;
      padding: 0 6px;
      font-size: 11.5px;
      font-weight: 700;
      line-height: 1;
      font-family: "Times New Roman", Times, serif;
      letter-spacing: 0.2px;
    }

    .summary-row:last-child { border-bottom: none; }

    .summary-row.grand {
      font-size: 12px;
    }

    .footer-note {
      text-align: center;
      margin-top: 3px;
      font-style: italic;
      font-size: 10px;
      font-weight: 700;
    }
  </style>
</head>
<body>
${pagesHTML}
</body>
</html>`;
}

module.exports = { generateMedicalBillHTML };
