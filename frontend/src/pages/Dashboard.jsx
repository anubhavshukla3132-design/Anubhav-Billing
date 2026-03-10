import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  "https://anubhav-billing-1jso.onrender.com";

const DEFAULT_FORM = {
  storeName: 'KRISHNA MEDICAL STORE',
  storeTagline: 'Shop No. CP-1, LGF-22, Jeevan Plaza',
  storeAddress: 'Vipul Khand-2, Gomti Nagar, Lucknow - 226010',
  storePhone: 'Phone: +91 9559953132',
  storeEmail: 'Email: krishnamedicalstoregtl@gmail.com',
  gstin: '09FICPP4622N1ZR',
  drugLicense1: 'UP32200005490',
  drugLicense2: 'UP32210005485',
  billNo: '',
  billDate: (() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  })(),
  patientName: '',
  patientAddress: '',
  patientMobile: '',
  doctorName: '',
  prescription: '',
  footerNote: ''
};

const blankItem = () => ({
  productName: '',
  packing: '',
  batchNo: '',
  exp: '',
  quantity: '',
  mrp: '',
  discount: '',
  amount: '',
  manual: false
});

function unitsPerPack(packing) {
  const text = String(packing || '').trim();
  if (!text) return 1;

  const parts = text
    .split(/[^0-9.]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!parts.length) return 1;
  return parts.reduce((acc, value) => acc * value, 1);
}

function computeAmount(item) {
  const qty = Number(item.quantity) || 0;
  const mrp = Number(item.mrp) || 0;
  const discount = Number(item.discount) || 0;
  const packUnits = unitsPerPack(item.packing);

  const hasRate = qty > 0 && mrp > 0;
  if (!hasRate) return item.manual ? item.amount : '';

  const amount = (qty / packUnits) * mrp * (1 - discount / 100);
  return amount ? amount.toFixed(2) : '';
}

function Dashboard() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [items, setItems] = useState(() => {
    const base = Array.from({ length: 5 }, () => blankItem());
    return base;
  });
  const [userName, setUserName] = useState('Administrator');
  const [generating, setGenerating] = useState(false);
  const [storePanelOpen, setStorePanelOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include'
        });
        if (res.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        if (!res.ok) throw new Error('Unable to load user');
        const data = await res.json();
        if (data.user?.name) setUserName(data.user.name);
      } catch (err) {
        navigate('/login', { replace: true });
      }
    }
    loadUser();
  }, [navigate]);

  useEffect(() => {
    const original = document.body.style.overflow;
    if (storePanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = original || 'auto';
    }
    return () => {
      document.body.style.overflow = original || 'auto';
    };
  }, [storePanelOpen]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(computeAmount(item) || item.amount) || 0),
        0
      ),
    [items]
  );

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const next = { ...item, [field]: value };
        if (field !== 'amount') {
          next.manual = false;
          next.amount = computeAmount(next);
        } else {
          const qty = Number(next.quantity) || 0;
          const mrp = Number(next.mrp) || 0;
          const hasRate = qty > 0 && mrp > 0;
          next.manual = !hasRate;
          next.amount = hasRate ? computeAmount(next) : value;
        }
        if (['packing', 'quantity', 'mrp', 'discount'].includes(field)) {
          next.amount = computeAmount(next);
        }
        return next;
      })
    );
  };

  const addRow = () => setItems((prev) => [...prev, blankItem()]);

  const removeRow = (idx) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [blankItem()];
    });
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      // ignore
    }
    navigate('/login', { replace: true });
  };

  const handleGenerate = async () => {
    if (!form.billNo || !form.billNo.trim()) {
      alert('Bill No is required to generate PDF. Please enter it above.');
      return;
    }
    setGenerating(true);
    try {
      const payload = {
        ...form,
        items: items.map(({ manual, ...rest }) => rest)
      };

      const res = await fetch(`${API_BASE}/api/generate-pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'PDF generation failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const fileName = `medical-bill-${payload.billNo || 'invoice'}.pdf`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset all fields?')) return;
    setForm(DEFAULT_FORM);
    setItems([blankItem()]);
  };

  return (
    <div>
      <header className="toolbar">
        <div className="brand">
          <div>
            <h1>Anubhav Medical Billing</h1>
            <p>PDF Invoice Generator</p>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn" onClick={() => setStorePanelOpen(true)}>
            Store &amp; Bill
          </button>
          <button className="btn btn-muted" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="container">
        {storePanelOpen && <div className="panel-overlay" onClick={() => setStorePanelOpen(false)}></div>}
        <aside className={`store-panel ${storePanelOpen ? 'open' : ''}`}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Store &amp; Bill</p>
              <h3>Store &amp; Bill Details</h3>
            </div>
            <button className="btn btn-muted" onClick={() => setStorePanelOpen(false)}>
              Close
            </button>
          </div>
          <div className="panel-body">
            <label>
              Store Name
              <input
                value={form.storeName}
                onChange={(e) => updateForm('storeName', e.target.value)}
              />
            </label>
            <label>
              GSTIN
              <input
                value={form.gstin}
                onChange={(e) => updateForm('gstin', e.target.value)}
              />
            </label>
            <label>
              Bill No
              <input
                value={form.billNo}
                placeholder="KMS00226"
                onChange={(e) => updateForm('billNo', e.target.value)}
              />
            </label>
            <label>
              Tagline
              <input
                value={form.storeTagline}
                onChange={(e) => updateForm('storeTagline', e.target.value)}
              />
            </label>
            <label>
              Address
              <input
                value={form.storeAddress}
                onChange={(e) => updateForm('storeAddress', e.target.value)}
              />
            </label>
            <label>
              Store Phone
              <input
                value={form.storePhone}
                onChange={(e) => updateForm('storePhone', e.target.value)}
              />
            </label>
            <label>
              Store Email
              <input
                value={form.storeEmail}
                onChange={(e) => updateForm('storeEmail', e.target.value)}
              />
            </label>
            <label>
              Drug License 1
              <input
                value={form.drugLicense1}
                onChange={(e) => updateForm('drugLicense1', e.target.value)}
              />
            </label>
            <label>
              Drug License 2
              <input
                value={form.drugLicense2}
                onChange={(e) => updateForm('drugLicense2', e.target.value)}
              />
            </label>
          </div>
        </aside>

        <section className="card chip-bar">
          <div>
            <div className="chip-title">Store</div>
            <div className="chip-value">{form.storeName || 'Tap to set store details'}</div>
          </div>
          <div className="chip-input">
            <div className="chip-title">Bill No</div>
            <input
              value={form.billNo}
              placeholder="Enter Bill No"
              onChange={(e) => updateForm('billNo', e.target.value)}
            />
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Patient</p>
              <h2>Patient Details</h2>
            </div>
          </div>
          <div className="grid grid-3 patient-grid">
            <label>
              Patient Name
              <input
                value={form.patientName}
                onChange={(e) => updateForm('patientName', e.target.value)}
                placeholder="Full name"
              />
            </label>
            <label>
              Patient Mobile
              <input
                value={form.patientMobile}
                onChange={(e) => updateForm('patientMobile', e.target.value)}
                placeholder="+91..."
              />
            </label>
            <label>
              Doctor Name
              <input
                value={form.doctorName}
                onChange={(e) => updateForm('doctorName', e.target.value)}
                placeholder="Dr. Name"
              />
            </label>
            <label className="span-2">
              Patient Address
              <input
                value={form.patientAddress}
                onChange={(e) => updateForm('patientAddress', e.target.value)}
                placeholder="Street, City"
              />
            </label>
            <label>
              Bill Date
              <input
                value={form.billDate}
                placeholder="DD/MM/YYYY"
                onChange={(e) => updateForm('billDate', e.target.value)}
              />
            </label>
          </div>
          <div className="grid grid-1 prescription-wrap">
            <label>
              Dawa / Prescription
              <textarea
                rows="3"
                value={form.prescription}
                placeholder="e.g. Dolo 650 - 1-0-1 for 3 days"
                onChange={(e) => updateForm('prescription', e.target.value)}
              ></textarea>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="line-items-head">
            <div>
              <p className="eyebrow">Medicines</p>
              <h2>Dispensed Medicines</h2>
            </div>
            <div className="actions">
              <button className="btn" onClick={addRow}>
                + Add Row
              </button>
              <button className="btn btn-muted" onClick={handleReset}>
                Reset
              </button>
              <button
                className="btn btn-primary"
                id="generateBtn"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sno</th>
                  <th>Medicine Name</th>
                  <th>Packing</th>
                  <th>Batch No.</th>
                  <th>Exp.</th>
                  <th>Quantity</th>
                  <th>M.R.P.</th>
                  <th>Disc.%</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="itemsBody">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="center row-no" data-label="Sno">
                      {idx + 1}
                    </td>
                    <td data-label="Product Name">
                      <input
                        name="productName"
                        value={item.productName}
                        onChange={(e) =>
                          updateItem(idx, 'productName', e.target.value)
                        }
                      />
                    </td>
                    <td data-label="Packing">
                      <input
                        name="packing"
                        value={item.packing}
                        onChange={(e) =>
                          updateItem(idx, 'packing', e.target.value)
                        }
                      />
                    </td>
                    <td data-label="Batch No.">
                      <input
                        name="batchNo"
                        value={item.batchNo}
                        onChange={(e) =>
                          updateItem(idx, 'batchNo', e.target.value)
                        }
                      />
                    </td>
                    <td data-label="Exp.">
                      <input
                        name="exp"
                        placeholder="MM/YY"
                        value={item.exp}
                        onChange={(e) => updateItem(idx, 'exp', e.target.value)}
                      />
                    </td>
                    <td data-label="Quantity">
                      <input
                        name="quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, 'quantity', e.target.value)
                        }
                      />
                    </td>
                    <td data-label="M.R.P.">
                      <input
                        name="mrp"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.mrp}
                        onChange={(e) => updateItem(idx, 'mrp', e.target.value)}
                      />
                    </td>
                    <td data-label="Disc.%">
                      <input
                        name="discount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(idx, 'discount', e.target.value)
                        }
                      />
                    </td>
                    <td data-label="Amount">
                      <input
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={computeAmount(item) || item.amount}
                        onChange={(e) =>
                          updateItem(idx, 'amount', e.target.value)
                        }
                      />
                    </td>
                    <td data-label="Action">
                      <button
                        className="btn btn-sm btn-danger"
                        type="button"
                        onClick={() => removeRow(idx)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="total-preview">
            <span>Computed Total:</span>
            <strong id="computedTotal">{total.toFixed(2)}</strong>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
