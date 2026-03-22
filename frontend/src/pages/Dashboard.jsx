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
  manual: false,
  stock: null
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
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('invoice_form');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_FORM;
  });
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('invoice_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const base = Array.from({ length: 5 }, () => blankItem());
    return base;
  });

  useEffect(() => {
    localStorage.setItem('invoice_form', JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem('invoice_items', JSON.stringify(items));
  }, [items]);
  const [userName, setUserName] = useState('Administrator');
  const [generating, setGenerating] = useState(false);
  const [storePanelOpen, setStorePanelOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [showPdfPopup, setShowPdfPopup] = useState(false);
  const [generatedBillNo, setGeneratedBillNo] = useState('');

  const fetchNextBillNo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/next-bill-number`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, billNo: data.nextBillNo }));
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('invoice_form');
    let hasSavedBillNo = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.billNo) hasSavedBillNo = true;
      } catch (e) {}
    }
    if (!hasSavedBillNo) {
      fetchNextBillNo();
    }
  }, []);

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
        // If the user manually changes the productName, un-link the stock to prevent stale data
        if (field === 'productName' && value !== item.productName) {
          next.stock = null;
        }
        return next;
      })
    );
  };

  const handleExpChange = (idx, val) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 4) v = v.substring(0, 4);
    if (v.length >= 2) {
      let mm = parseInt(v.substring(0, 2), 10);
      if (mm > 12) mm = 12;
      if (mm === 0) mm = 1;
      let mmStr = mm.toString().padStart(2, '0');
      if (v.length > 2) {
        v = `${mmStr}/${v.substring(2)}`;
      } else {
        v = val.endsWith('/') ? `${mmStr}/` : mmStr;
      }
    }
    updateItem(idx, 'exp', v);
  };

  const handleMedicineSearch = async (idx, query) => {
    updateItem(idx, 'productName', query);
    if (query.trim().length > 1) {
      try {
        const res = await fetch(`${API_BASE}/api/medicines/search?q=${query}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(prev => ({ ...prev, [idx]: data }));
        }
      } catch (e) {
        console.error("Search failed", e);
      }
    } else {
      setSuggestions(prev => ({ ...prev, [idx]: [] }));
    }
  };

  const selectMedicine = (idx, med) => {
    updateItem(idx, 'productName', med.name);
    updateItem(idx, 'mrp', med.price);
    updateItem(idx, 'packing', med.packing || '10 T'); 
    updateItem(idx, 'batchNo', med.batchNo || 'B-01');
    updateItem(idx, 'exp', med.exp || '12/26');
    updateItem(idx, 'stock', med.stock || 0);
    setSuggestions(prev => ({ ...prev, [idx]: [] }));
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
        grandTotal: total.toFixed(2),
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
      setPdfBlob(blob);
      setPdfUrl(url);
      setGeneratedBillNo(form.billNo);

      // Auto-reset form state in background
      setForm(DEFAULT_FORM);
      setItems(Array.from({ length: 5 }, () => blankItem()));
      localStorage.removeItem('invoice_form');
      localStorage.removeItem('invoice_items');
      fetchNextBillNo();

      setShowPdfPopup(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleInputKeyDown = (e, field, idx) => {
    if (field === 'productName' && suggestions[idx] && suggestions[idx].length > 0) {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        selectMedicine(idx, suggestions[idx][0]);
        setTimeout(() => document.getElementById(`pack-${idx}`)?.focus(), 50);
        return;
      }
    }
    
    // Rapid Keyboard Traversal Script
    if (e.key === 'Enter') {
      e.preventDefault();
      let nextId = '';
      if (field === 'productName') nextId = `pack-${idx}`;
      else if (field === 'packing') nextId = `batch-${idx}`;
      else if (field === 'batchNo') nextId = `exp-${idx}`;
      else if (field === 'exp') nextId = `qty-${idx}`;
      else if (field === 'quantity') nextId = `mrp-${idx}`;
      else if (field === 'mrp') nextId = `disc-${idx}`;
      else if (field === 'discount') {
         if (idx === items.length - 1) {
           addRow();
           setTimeout(() => document.getElementById(`prod-${idx + 1}`)?.focus(), 50);
           return;
         } else {
           nextId = `prod-${idx + 1}`;
         }
      }
      setTimeout(() => document.getElementById(nextId)?.focus(), 50);
    }
  };

  const handleReset = (force = false) => {
    if (!force && !window.confirm('Reset all fields?')) return;
    setForm(DEFAULT_FORM);
    setItems(Array.from({ length: 5 }, () => blankItem()));
    setPdfUrl(null);
    setPdfBlob(null);
    setShowPdfPopup(false);
    localStorage.removeItem('invoice_form');
    localStorage.removeItem('invoice_items');
    fetchNextBillNo();
  };

  return (
    <div>
      <header className="toolbar">
        <div className="brand">
          <img src="/Anubhav.png" alt="Anubhav Billing logo" className="brand-logo" />
          <div className="brand-text">
            <h1>Anubhav Medical Billing</h1>
            <p>VIP Production Build ✨</p>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-store" onClick={() => navigate('/')}>
            Dashboard
          </button>
          <button className="btn btn-store" onClick={() => setStorePanelOpen(true)}>
            Details
          </button>
          <button className="btn btn-logout" onClick={handleLogout}>
            Logout
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
                placeholder="10 digit mobile"
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
              {pdfUrl ? (
                <>
                  <button className="btn btn-primary" onClick={() => setShowPdfPopup(true)}>
                    Show Document
                  </button>
                  <button className="btn btn-muted" onClick={() => handleReset(true)}>
                    New Bill
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          <div className="table-wrap" style={{ overflow: 'visible', paddingBottom: '120px' }}>
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
                    <td data-label="Product Name" style={{ position: 'relative' }}>
                      <input
                        id={`prod-${idx}`}
                        name="productName"
                        autoComplete="off"
                        value={item.productName}
                        onChange={(e) => handleMedicineSearch(idx, e.target.value)}
                        onKeyDown={(e) => handleInputKeyDown(e, 'productName', idx)}
                      />
                      {suggestions[idx] && suggestions[idx].length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, minWidth: '100%', zIndex: 99999,
                          background: '#fff', border: '1px solid #20A4F3', borderRadius: '4px',
                          maxHeight: '180px', overflowY: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                        }}>
                          {suggestions[idx].map(med => (
                            <div key={med._id} 
                                 style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1', fontSize: '13px' }}
                                 onClick={() => selectMedicine(idx, med)}>
                              <strong>{med.name}</strong> - ₹{med.price}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td data-label="Packing">
                      <input
                        id={`pack-${idx}`}
                        name="packing"
                        value={item.packing}
                        onChange={(e) =>
                          updateItem(idx, 'packing', e.target.value)
                        }
                        onKeyDown={(e) => handleInputKeyDown(e, 'packing', idx)}
                      />
                    </td>
                    <td data-label="Batch No.">
                      <input
                        id={`batch-${idx}`}
                        name="batchNo"
                        value={item.batchNo}
                        onChange={(e) =>
                          updateItem(idx, 'batchNo', e.target.value)
                        }
                        onKeyDown={(e) => handleInputKeyDown(e, 'batchNo', idx)}
                      />
                    </td>
                    <td data-label="Exp.">
                      <input
                        id={`exp-${idx}`}
                        name="exp"
                        placeholder="MM/YY"
                        value={item.exp}
                        onChange={(e) => handleExpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleInputKeyDown(e, 'exp', idx)}
                      />
                    </td>
                    <td data-label="Quantity" style={{ position: 'relative' }}>
                      <input
                        id={`qty-${idx}`}
                        name="quantity"
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, 'quantity', e.target.value)
                        }
                        onKeyDown={(e) => handleInputKeyDown(e, 'quantity', idx)}
                        style={{ borderColor: typeof item.stock === 'number' && !isNaN(item.stock) && item.stock - (item.quantity || 0) < 0 ? '#ef4444' : undefined, background: typeof item.stock === 'number' && !isNaN(item.stock) && item.stock - (item.quantity || 0) < 0 ? '#fef2f2' : undefined }}
                      />
                      {typeof item.stock === 'number' && !isNaN(item.stock) && (
                        <div style={{ fontSize: '11px', marginTop: '4px', color: item.stock - (item.quantity || 0) <= 0 ? '#ef4444' : '#10b981', fontWeight: 700, textAlign: 'center' }}>
                          {item.stock - (item.quantity || 0) <= 0 ? 'Out of Stock' : `Stock: ${item.stock - (item.quantity || 0)}`}
                        </div>
                      )}
                    </td>
                    <td data-label="M.R.P.">
                      <input
                        id={`mrp-${idx}`}
                        name="mrp"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.mrp}
                        onChange={(e) => updateItem(idx, 'mrp', e.target.value)}
                        onKeyDown={(e) => handleInputKeyDown(e, 'mrp', idx)}
                      />
                    </td>
                    <td data-label="Disc.%" style={{ position: 'relative' }}>
                      <input
                        id={`disc-${idx}`}
                        name="discount"
                        type="number"
                        min="0"
                        step="1"
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(idx, 'discount', e.target.value)
                        }
                        onKeyDown={(e) => handleInputKeyDown(e, 'discount', idx)}
                        style={{ paddingRight: '20px' }}
                      />
                      {item.discount && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px', pointerEvents: 'none', fontWeight: 600 }}>%</span>
                      )}
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

      {showPdfPopup && pdfUrl && (
        <div className="pdf-popup-overlay">
          <div className="pdf-popup-card">
            <button className="pdf-popup-close" onClick={() => setShowPdfPopup(false)}>✕</button>
            <div className="pdf-icon-wrapper">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="pdf-popup-title">PDF Generated Successfully!</h3>
            <p className="pdf-popup-desc">Your invoice is ready to be downloaded or printed.</p>
            <div className="pdf-popup-actions">
              <a href={pdfUrl} download={`Medical-Bill-${generatedBillNo || 'invoice'}.pdf`} className="pdf-btn-download" onClick={() => setShowPdfPopup(false)}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </a>
              <button className="pdf-btn-new" onClick={() => { setShowPdfPopup(false); setPdfUrl(null); setPdfBlob(null); }}>
                Create New Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
