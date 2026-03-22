import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  "https://anubhav-billing-1jso.onrender.com";

function Records() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'medicines'

  // --- Invoices State & Logic ---
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bills?search=${encodeURIComponent(search)}`, {
        credentials: 'include'
      });
      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (e) {
      console.error("Failed to fetch bills", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'invoices') fetchBills();
  }, [search, activeTab]);

  const handleDelete = async (id, billNo) => {
    if (!window.confirm(`Are you sure you want to delete bill ${billNo}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/bills/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchBills();
      } else {
        alert("Failed to delete bill.");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting bill.");
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/bills/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to load bill details");
      const bill = await res.json();

      const form = {
        storeName: 'KRISHNA MEDICAL STORE',
        storeTagline: 'Shop No. CP-1, LGF-22, Jeevan Plaza',
        storeAddress: 'Vipul Khand-2, Gomti Nagar, Lucknow - 226010',
        storePhone: 'Phone: +91 9559953132',
        storeEmail: 'Email: krishnamedicalstoregtl@gmail.com',
        gstin: '09FICPP4622N1ZR',
        drugLicense1: 'UP32200005490',
        drugLicense2: 'UP32210005485',
        billNo: bill.invoiceNumber || '',
        billDate: bill.billDate || (() => {
          const now = new Date(bill.createdAt);
          const dd = String(now.getDate()).padStart(2, '0');
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const yyyy = now.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        })(),
        patientName: bill.patient?.name || '',
        patientAddress: bill.patient?.address || '',
        patientMobile: bill.patient?.phone || '',
        doctorName: bill.doctorName || '',
        prescription: bill.prescription || '',
        footerNote: ''
      };

      const blankItem = () => ({
        productName: '', packing: '', batchNo: '', exp: '', quantity: '', mrp: '', discount: '', amount: '', manual: false
      });

      let items = (bill.items || [])
        .filter(item => item.name && item.name.trim().toLowerCase() !== 'item')
        .map(item => ({
        productName: item.name || '',
        packing: item.packing || '',
        batchNo: item.batchNo || '',
        exp: item.exp || '',
        quantity: item.quantity || '',
        mrp: item.mrp || item.price || '',
        discount: item.discount || '',
        amount: item.total || '',
        manual: false
      }));

      while (items.length < 5) {
        items.push(blankItem());
      }

      localStorage.setItem('invoice_form', JSON.stringify(form));
      localStorage.setItem('invoice_items', JSON.stringify(items));
      navigate('/');
    } catch (e) {
      console.error(e);
      alert("Error loading bill for edit.");
    }
  };

  // --- Medicines State & Logic ---
  const [medicines, setMedicines] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medSearch, setMedSearch] = useState("");
  const [editingMed, setEditingMed] = useState(null);

  const fetchMedicines = async () => {
    setMedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/medicines?search=${encodeURIComponent(medSearch)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMedicines(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'medicines') fetchMedicines();
  }, [medSearch, activeTab]);

  const handleMedDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete medicine: ${name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/medicines/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) fetchMedicines();
      else alert("Failed to delete medicine.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleMedSave = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingMed._id) {
        res = await fetch(`${API_BASE}/api/medicines/${editingMed._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(editingMed)
        });
      } else {
        res = await fetch(`${API_BASE}/api/medicines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(editingMed)
        });
      }
      if (res.ok) {
        setEditingMed(null);
        fetchMedicines();
      } else {
        alert("Failed to save medicine.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving medicine.");
    }
  };

  return (
    <div>
      <header className="toolbar">
        <div className="brand">
          <img src="/Anubhav.png" alt="Anubhav Billing logo" className="brand-logo" />
          <div className="brand-text">
            <h1>Database Records</h1>
            <p>History & Management</p>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-muted" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="container">
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => setActiveTab('invoices')}
          >
            Invoices
          </button>
          <button 
            className={`btn ${activeTab === 'medicines' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => setActiveTab('medicines')}
          >
            Medicines DB
          </button>
        </div>

        <section className="card">
          <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="eyebrow">{activeTab === 'invoices' ? 'Records' : 'Inventory'}</p>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <h2>{activeTab === 'invoices' ? 'Saved Invoices' : 'Medicines Directory'}</h2>
                {activeTab === 'medicines' && (
                  <button className="btn btn-sm btn-primary" onClick={() => setEditingMed({ name: '', price: '', stock: '', packing: '', batchNo: '', exp: '' })}>
                    + Add New
                  </button>
                )}
              </div>
            </div>
            <div style={{ width: '300px' }}>
              {activeTab === 'invoices' ? (
                <input 
                  type="text" 
                  placeholder="Search by Bill No or Patient Name..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              ) : (
                <input 
                  type="text" 
                  placeholder="Search Medicine Name..." 
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              )}
            </div>
          </div>

          <div className="table-wrap">
            {/* Invoices Table */}
            {activeTab === 'invoices' && (
              loading ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Loading records...</p>
              ) : bills.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>No invoices found.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Bill No</th>
                      <th>Patient Name</th>
                      <th>Mobile</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill._id}>
                        <td data-label="Date">{new Date(bill.createdAt).toLocaleDateString('en-GB')}</td>
                        <td data-label="Bill No"><strong>{bill.invoiceNumber}</strong></td>
                        <td data-label="Patient Name">{bill.patient?.name || 'Unknown'}</td>
                        <td data-label="Mobile">{bill.patient?.phone || '-'}</td>
                        <td data-label="Amount">₹ {bill.finalTotal?.toFixed(2) || '0.00'}</td>
                        <td data-label="Actions">
                          <button className="btn btn-sm btn-primary" onClick={() => handleEdit(bill._id)} style={{ marginRight: '8px' }}>
                            Edit / View
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(bill._id, bill.invoiceNumber)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* Medicines Table */}
            {activeTab === 'medicines' && (
              medLoading ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Loading medicines...</p>
              ) : medicines.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>No medicines found.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>MRP (Price)</th>
                      <th>Packing</th>
                      <th>Batch No</th>
                      <th>Expiry</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((med) => (
                      <tr key={med._id}>
                        <td data-label="Name"><strong>{med.name}</strong></td>
                        <td data-label="Price">₹ {med.price}</td>
                        <td data-label="Packing">{med.packing || '-'}</td>
                        <td data-label="Batch No">{med.batchNo || '-'}</td>
                        <td data-label="Expiry">{med.exp || '-'}</td>
                        <td data-label="Stock">{med.stock || 0}</td>
                        <td data-label="Actions">
                          <button className="btn btn-sm btn-primary" onClick={() => setEditingMed(med)} style={{ marginRight: '8px' }}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleMedDelete(med._id, med.name)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </section>
      </main>

      {/* Edit Medicine Modal */}
      {editingMed && (
        <div className="pdf-popup-overlay">
          <div className="pdf-popup-card" style={{ maxWidth: '500px', textAlign: 'left' }}>
            <button className="pdf-popup-close" onClick={() => setEditingMed(null)}>✕</button>
            <h3 style={{ marginBottom: '20px', fontSize: '1.25rem' }}>Edit Medicine</h3>
            <form onSubmit={handleMedSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                Medicine Name
                <input 
                  type="text" 
                  value={editingMed.name} 
                  onChange={(e) => setEditingMed({ ...editingMed, name: e.target.value })}
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
                  required
                />
              </label>
              <div style={{ display: 'flex', gap: '15px' }}>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Price (MRP)
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingMed.price} 
                    onChange={(e) => setEditingMed({ ...editingMed, price: e.target.value })}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
                    required
                  />
                </label>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Stock
                  <input 
                    type="number" 
                    value={editingMed.stock} 
                    onChange={(e) => setEditingMed({ ...editingMed, stock: e.target.value })}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Packing
                  <input 
                    type="text" 
                    value={editingMed.packing || ''} 
                    onChange={(e) => setEditingMed({ ...editingMed, packing: e.target.value })}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
                  />
                </label>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Batch No.
                  <input 
                    type="text" 
                    value={editingMed.batchNo || ''} 
                    onChange={(e) => setEditingMed({ ...editingMed, batchNo: e.target.value })}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
                  />
                </label>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Expiry (MM/YY)
                  <input 
                    type="text" 
                    value={editingMed.exp || ''} 
                    onChange={(e) => setEditingMed({ ...editingMed, exp: e.target.value })}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
                  />
                </label>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-muted" onClick={() => setEditingMed(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Records;
