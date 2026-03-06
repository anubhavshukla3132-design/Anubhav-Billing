const DEFAULT_ROWS = 1;

async function handleLogout() {
  try {
    await fetch("/auth/logout", { method: "POST" });
  } catch (e) {}
  window.location.href = "/login";
}

async function loadUser() {
  try {
    const res = await fetch("/auth/me");
    if (!res.ok) return;
    const data = await res.json();
    if (data.user?.name) {
      document.getElementById("toolbarUser").textContent = data.user.name;
    }
  } catch (e) {}
}

function getRowHTML(rowNo) {
  return `
    <td class="center row-no" data-label="Sno">${rowNo}</td>
    <td data-label="Product Name"><input name="productName" /></td>
    <td data-label="Packing"><input name="packing" /></td>
    <td data-label="Batch No."><input name="batchNo" /></td>
    <td data-label="Exp."><input name="exp" placeholder="MM/YY" /></td>
    <td data-label="Quantity"><input name="quantity" type="number" min="0" step="0.01" /></td>
    <td data-label="M.R.P."><input name="mrp" type="number" min="0" step="0.01" /></td>
    <td data-label="Disc.%"><input name="discount" type="number" min="0" step="0.01" /></td>
    <td data-label="Amount"><input name="amount" type="number" min="0" step="0.01" /></td>
    <td data-label="Action"><button class="btn btn-sm" type="button" onclick="removeRow(this)">Remove</button></td>
  `;
}

function renumberRows() {
  document.querySelectorAll("#itemsBody tr .row-no").forEach((el, idx) => {
    el.textContent = idx + 1;
  });
}

function addItemRow() {
  const tbody = document.getElementById("itemsBody");
  const tr = document.createElement("tr");
  tr.innerHTML = getRowHTML(tbody.querySelectorAll("tr").length + 1).trim();
  tbody.appendChild(tr);
}

function removeRow(btn) {
  const row = btn.closest("tr");
  row.remove();
  renumberRows();
  computeTotal();
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

function computeAmount(row) {
  const packing = row.querySelector('input[name="packing"]').value;
  const qty = Number(row.querySelector('input[name="quantity"]').value) || 0;
  const mrp = Number(row.querySelector('input[name="mrp"]').value) || 0;
  const disc = Number(row.querySelector('input[name="discount"]').value) || 0;
  const amountInput = row.querySelector('input[name="amount"]');
  if (amountInput.dataset.manual === "true") return;

  if (!qty || !mrp) {
    amountInput.value = "";
    return;
  }

  const packUnits = unitsPerPack(packing);
  const amount = (qty / packUnits) * mrp * (1 - disc / 100);
  amountInput.value = amount.toFixed(2);
}

function computeTotal() {
  const total = Array.from(document.querySelectorAll('input[name="amount"]')).reduce(
    (sum, el) => sum + (Number(el.value) || 0),
    0,
  );
  document.getElementById("computedTotal").textContent = total.toFixed(2);
}

function collectFormData() {
  const data = {
    storeName: document.getElementById("storeName").value,
    storeTagline: document.getElementById("storeTagline").value,
    storeAddress: document.getElementById("storeAddress").value,
    storePhone: document.getElementById("storePhone").value,
    storeEmail: document.getElementById("storeEmail").value,
    gstin: document.getElementById("gstin").value,
    drugLicense1: document.getElementById("drugLicense1").value,
    drugLicense2: document.getElementById("drugLicense2").value,
    billNo: document.getElementById("billNo").value,
    billDate: document.getElementById("billDate").value,
    patientName: document.getElementById("patientName").value,
    patientAddress: document.getElementById("patientAddress").value,
    patientMobile: document.getElementById("patientMobile").value,
    doctorName: document.getElementById("doctorName").value,
    prescription: document.getElementById("prescription").value,
    items: [],
  };

  document.querySelectorAll("#itemsBody tr").forEach((row) => {
    data.items.push({
      productName: row.querySelector('input[name="productName"]').value,
      packing: row.querySelector('input[name="packing"]').value,
      batchNo: row.querySelector('input[name="batchNo"]').value,
      exp: row.querySelector('input[name="exp"]').value,
      quantity: row.querySelector('input[name="quantity"]').value,
      mrp: row.querySelector('input[name="mrp"]').value,
      discount: row.querySelector('input[name="discount"]').value,
      amount: row.querySelector('input[name="amount"]').value,
    });
  });

  return data;
}

async function generatePDF() {
  const btn = document.getElementById("generateBtn");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Generating...";

  try {
    const payload = collectFormData();
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "PDF generation failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const fileName = `medical-bill-${payload.billNo || "invoice"}.pdf`;

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (error) {
    alert(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

function resetForm() {
  if (!confirm("Reset all fields?")) return;
  document.getElementById("prescription").value = "";
  document.querySelectorAll("input").forEach((el) => {
    if (el.id === "storeName") el.value = "KRISHNA MEDICAL STORE";
    else if (el.id === "storeTagline") el.value = "Shop No. CP-1, LGF-22, Jeevan Plaza";
    else if (el.id === "storeAddress") el.value = "Vipul Khand-2, Gomti Nagar, Lucknow - 226010";
    else if (el.id === "storePhone") el.value = "Phone: +91 9559953132";
    else if (el.id === "storeEmail") el.value = "Email: krishnamedicalstoregtl@gmail.com";
    else if (el.id === "gstin") el.value = "09FICPP4622N1ZR";
    else if (el.id === "drugLicense1") el.value = "UP32200005490";
    else if (el.id === "drugLicense2") el.value = "UP32210005485";
    else el.value = "";
  });

  const tbody = document.getElementById("itemsBody");
  tbody.innerHTML = "";
  for (let i = 0; i < DEFAULT_ROWS; i += 1) addItemRow();
  computeTotal();
}

document.addEventListener("DOMContentLoaded", () => {
  loadUser();
  const tbody = document.getElementById("itemsBody");
  for (let i = 0; i < DEFAULT_ROWS; i += 1) addItemRow();

  tbody.addEventListener("input", (event) => {
    const row = event.target.closest("tr");
    if (!row) return;

    if (event.target.name === "amount") {
      const qty = Number(row.querySelector('input[name="quantity"]').value) || 0;
      const mrp = Number(row.querySelector('input[name="mrp"]').value) || 0;

      // Keep frontend and backend consistent: when qty/mrp exist, amount is always computed.
      if (qty > 0 && mrp > 0) {
        event.target.dataset.manual = "false";
        computeAmount(row);
      } else {
        event.target.dataset.manual = event.target.value ? "true" : "false";
      }
    }

    if (["packing", "quantity", "mrp", "discount"].includes(event.target.name)) {
      row.querySelector('input[name="amount"]').dataset.manual = "false";
      computeAmount(row);
    }

    computeTotal();
  });
});
