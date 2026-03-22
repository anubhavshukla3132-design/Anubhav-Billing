import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  "https://anubhav-billing-1jso.onrender.com";

function Records() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics'); // 'invoices' | 'medicines'

  // --- Invoices State & Logic ---
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [billPage, setBillPage] = useState(1);
  const [billTotalPages, setBillTotalPages] = useState(1);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bills?search=${encodeURIComponent(search)}&page=${billPage}&limit=10`, {
        credentials: 'include'
      });
      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setBills(data.data || data);
        setBillTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error("Failed to fetch bills", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'invoices') fetchBills();
  }, [search, activeTab, billPage]);

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
      navigate('/billing');
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
  const [medPage, setMedPage] = useState(1);
  const [medTotalPages, setMedTotalPages] = useState(1);

  const fetchMedicines = async () => {
    setMedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/medicines?search=${encodeURIComponent(medSearch)}&page=${medPage}&limit=10`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMedicines(data.data || data);
        setMedTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'medicines') fetchMedicines();
  }, [medSearch, activeTab, medPage]);

  // --- Analytics State & Logic ---
  const [analytics, setAnalytics] = useState(null);
  const [anLoading, setAnLoading] = useState(false);

  const fetchAnalytics = async () => {
    setAnLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analytics`, { credentials: 'include' });
      if (res.ok) setAnalytics(await res.json());
    } catch(e) { console.error(e) }
    finally { setAnLoading(false) }
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab]);

  // --- Patient History State & Logic ---
  const [patients, setPatients] = useState([]);
  const [patLoading, setPatLoading] = useState(false);
  const [patSearch, setPatSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  
  const fetchPatients = async () => {
    setPatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients?search=${encodeURIComponent(patSearch)}`, { credentials: 'include' });
      if (res.ok) setPatients(await res.json());
    } catch (e) { console.error(e) }
    finally { setPatLoading(false) }
  };

  const loadPatientHistory = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${id}/history`, { credentials: 'include' });
      if (res.ok) setPatientHistory(await res.json());
    } catch(e) { console.error(e) }
  };

  useEffect(() => {
    if (activeTab === 'patients' && !selectedPatient) fetchPatients();
  }, [patSearch, activeTab, selectedPatient]);

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

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {}
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <header className="toolbar">
        <div className="brand">
          <img src="/Anubhav.png" alt="Anubhav Billing logo" className="brand-logo" />
          <div className="brand-text">
            <h1>Store Dashboard</h1>
            <p>Overview & Management</p>
          </div>
        </div>
        <div className="toolbar-right" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/billing')}>
            + Create New Bill
          </button>
          <button className="btn btn-muted" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="container">
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => { setActiveTab('analytics'); setSelectedPatient(null); }}
          >
            Analytics & Alerts
          </button>
          <button 
            className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => { setActiveTab('invoices'); setSelectedPatient(null); }}
          >
            Invoices
          </button>
          <button 
            className={`btn ${activeTab === 'medicines' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => { setActiveTab('medicines'); setSelectedPatient(null); }}
          >
            Medicines DB
          </button>
          <button 
            className={`btn ${activeTab === 'patients' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => setActiveTab('patients')}
          >
            Patient History
          </button>
        </div>

        <section className="card">
          <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <p className="eyebrow">
                {activeTab === 'invoices' ? 'Records' : activeTab === 'medicines' ? 'Inventory' : activeTab === 'patients' ? 'CRM' : 'Overview'}
              </p>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <h2>
                  {activeTab === 'invoices' ? 'Saved Invoices' : activeTab === 'medicines' ? 'Medicines Directory' : activeTab === 'patients' ? 'Patient Profiles' : 'Business Insights'}
                </h2>
                
                {activeTab === 'invoices' && (
                  <button className="btn btn-sm btn-muted" onClick={() => window.open(`${API_BASE}/api/export/bills`, '_blank')}>
                    ↓ Export CSV
                  </button>
                )}
                
                {activeTab === 'medicines' && (
                  <>
                    <button className="btn btn-sm btn-muted" onClick={() => window.open(`${API_BASE}/api/export/medicines`, '_blank')}>
                      ↓ Export CSV
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => setEditingMed({ name: '', price: '', stock: '', packing: '', batchNo: '', exp: '' })}>
                      + Add New
                    </button>
                  </>
                )}
                {activeTab === 'patients' && selectedPatient && (
                  <button className="btn btn-sm btn-muted" onClick={() => { setSelectedPatient(null); setPatientHistory(null); }}>
                    ← Back to List
                  </button>
                )}
              </div>
            </div>
            {activeTab !== 'analytics' && !selectedPatient && (
              <div style={{ width: '300px', flexGrow: 1, maxWidth: '400px' }}>
              {activeTab === 'invoices' ? (
                <input 
                  type="text" 
                  placeholder="Search by Bill No or Patient Name..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              ) : activeTab === 'patients' ? (
                <input 
                  type="text" 
                  placeholder="Search Patient Name or Mobile..." 
                  value={patSearch}
                  onChange={(e) => setPatSearch(e.target.value)}
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
            )}
          </div>

          <div className="table-wrap" style={{ border: activeTab === 'analytics' ? 'none' : undefined, boxShadow: activeTab === 'analytics' ? 'none' : undefined }}>
            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div style={{ padding: '20px 0' }}>
                {anLoading || !analytics ? <p style={{ textAlign: 'center' }}>Loading Analytics...</p> : (
                  <>
                    <div className="grid grid-3" style={{ marginBottom: '40px' }}>
                      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.7), rgba(219, 234, 254, 0.7))', border: '1px solid rgba(255, 255, 255, 0.6)', margin: 0 }}>
                        <p className="eyebrow" style={{ color: '#1d4ed8' }}>Today's Revenue</p>
                        <h2 style={{ fontSize: '28px', margin: '14px 0 8px', color: '#1e3a8a' }}>₹ {analytics.revenue.today.toFixed(2)}</h2>
                        <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600 }}>{analytics.revenue.todayCount} Bills</span>
                      </div>
                      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.7), rgba(220, 252, 227, 0.7))', border: '1px solid rgba(255, 255, 255, 0.6)', margin: 0 }}>
                        <p className="eyebrow" style={{ color: '#15803d' }}>This Month</p>
                        <h2 style={{ fontSize: '28px', margin: '14px 0 8px', color: '#14532d' }}>₹ {analytics.revenue.month.toFixed(2)}</h2>
                        <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{analytics.revenue.monthCount} Bills</span>
                      </div>
                      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(250, 245, 255, 0.7), rgba(243, 232, 255, 0.7))', border: '1px solid rgba(255, 255, 255, 0.6)', margin: 0 }}>
                        <p className="eyebrow" style={{ color: '#7e22ce' }}>All Time Revenue</p>
                        <h2 style={{ fontSize: '28px', margin: '14px 0 8px', color: '#581c87' }}>₹ {analytics.revenue.allTime.toFixed(2)}</h2>
                      </div>
                    </div>
                    
                    <div className="grid grid-2" style={{ gap: '24px' }}>
                      <div className="card" style={{ margin: 0, padding: '20px' }}>
                        <h3 style={{ marginBottom: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                          <span>🧾</span> Recent Transactions
                        </h3>
                        {analytics.recentBills && analytics.recentBills.length > 0 ? (
                          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
                            <table style={{ minWidth: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ background: 'transparent', paddingLeft: 0 }}>Bill No</th>
                                  <th style={{ background: 'transparent' }}>Patient</th>
                                  <th style={{ background: 'transparent', textAlign: 'right', paddingRight: 0 }}>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.recentBills.map(b => (
                                  <tr key={b._id}>
                                    <td data-label="Bill No" style={{ paddingLeft: 0, borderTop: '1px solid #e2e8f0' }}>{b.billNo}</td>
                                    <td data-label="Patient" style={{ borderTop: '1px solid #e2e8f0' }}>{b.patientName || 'Walk-in'}</td>
                                    <td data-label="Amount" style={{ fontWeight: 600, textAlign: 'right', paddingRight: 0, borderTop: '1px solid #e2e8f0', color: '#15803d' }}>₹ {b.finalTotal}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p style={{ color: '#64748b', fontSize: '14px' }}>No recent transactions found.</p>}
                      </div>

                      <div className="card" style={{ margin: 0, padding: '20px' }}>
                        <h3 style={{ marginBottom: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                          <span>⭐</span> Top Selling Medicines
                        </h3>
                        {analytics.topMedicines && analytics.topMedicines.length > 0 ? (
                          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
                            <table style={{ minWidth: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ background: 'transparent', paddingLeft: 0 }}>Medicine</th>
                                  <th style={{ background: 'transparent', textAlign: 'right', paddingRight: 0 }}>Units Sold</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.topMedicines.map((m, i) => (
                                  <tr key={i}>
                                    <td data-label="Medicine" style={{ paddingLeft: 0, borderTop: '1px solid #e2e8f0' }}><strong>{m._id || 'Unknown'}</strong></td>
                                    <td data-label="Units Sold" style={{ textAlign: 'right', paddingRight: 0, borderTop: '1px solid #e2e8f0', color: '#2563eb', fontWeight: 600 }}>{m.totalSold} Units</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p style={{ color: '#64748b', fontSize: '14px' }}>No sales data yet.</p>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Invoices Table */}
            {activeTab === 'invoices' && (
              loading ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Loading records...</p>
              ) : bills.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>No invoices found.</p>
              ) : (
                <div>
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
                {billTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                     <button className="btn btn-sm btn-muted" disabled={billPage <= 1} onClick={() => setBillPage(p => p - 1)}>← Previous</button>
                     <span style={{ fontSize: '14px', fontWeight: 600 }}>Page {billPage} of {billTotalPages}</span>
                     <button className="btn btn-sm btn-muted" disabled={billPage >= billTotalPages} onClick={() => setBillPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </div>
              )
            )}

            {/* Medicines Table */}
            {activeTab === 'medicines' && (
              medLoading ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Loading medicines...</p>
              ) : medicines.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>No medicines found.</p>
              ) : (
                <div>
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
                {medTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                     <button className="btn btn-sm btn-muted" disabled={medPage <= 1} onClick={() => setMedPage(p => p - 1)}>← Previous</button>
                     <span style={{ fontSize: '14px', fontWeight: 600 }}>Page {medPage} of {medTotalPages}</span>
                     <button className="btn btn-sm btn-muted" disabled={medPage >= medTotalPages} onClick={() => setMedPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </div>
              )
            )}
            {/* Patients Table */}
            {activeTab === 'patients' && !selectedPatient && (
               patLoading ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Loading patients...</p>
              ) : patients.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>No patients found.</p>
              ) : (
                <table>
                  <thead>
                     <tr>
                        <th>Patient Name</th>
                        <th>Mobile</th>
                        <th>Address</th>
                        <th>Created On</th>
                        <th>Action</th>
                     </tr>
                  </thead>
                  <tbody>
                     {patients.map(p => (
                        <tr key={p._id}>
                           <td data-label="Patient Name"><strong>{p.name}</strong></td>
                           <td data-label="Mobile">{p.phone || '-'}</td>
                           <td data-label="Address">{p.address || '-'}</td>
                           <td data-label="Created On">{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                           <td data-label="Action">
                              <button className="btn btn-sm btn-primary" onClick={() => { setSelectedPatient(p); loadPatientHistory(p._id); }}>
                                View History
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
                </table>
              )
            )}

            {/* Patient History View */}
            {activeTab === 'patients' && selectedPatient && patientHistory && (
               <div style={{ padding: '0 10px 20px' }}>
                  <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p className="eyebrow" style={{ color: '#64748b' }}>Profile Info</p>
                      <h3 style={{ margin: '5px 0', fontSize: '20px' }}>{patientHistory.patient.name}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                        📞 {patientHistory.patient.phone || 'N/A'} &nbsp;|&nbsp; 📍 {patientHistory.patient.address || 'N/A'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="eyebrow" style={{ color: '#10b981' }}>Lifetime Value</p>
                      <h2 style={{ fontSize: '28px', color: '#047857', margin: 0 }}>₹ {patientHistory.totalSpent.toFixed(2)}</h2>
                    </div>
                  </div>

                  <h3 style={{ margin: '20px 0 15px' }}>Billing & Prescription History</h3>
                  
                  {patientHistory.history.length === 0 ? <p>No previous bills found.</p> : (
                    patientHistory.history.map(bill => (
                      <div key={bill._id} className="card" style={{ marginBottom: '15px', borderLeft: '4px solid #3b82f6' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                            <div>
                               <strong>{bill.invoiceNumber}</strong> &nbsp;|&nbsp; {new Date(bill.createdAt).toLocaleDateString('en-GB')}
                            </div>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>
                               ₹ {bill.finalTotal.toFixed(2)}
                            </div>
                         </div>
                         {bill.doctorName && <p style={{ fontSize: '13px', margin: '0 0 5px' }}><strong>Doctor:</strong> {bill.doctorName}</p>}
                         {bill.prescription && <p style={{ fontSize: '13px', margin: '0 0 10px', color: '#475569' }}><strong>Rx:</strong> {bill.prescription}</p>}
                         
                         <table style={{ minWidth: '100%', fontSize: '13px' }}>
                           <thead>
                             <tr>
                               <th style={{ background: '#f1f5f9', color: '#475569' }}>Medicine</th>
                               <th style={{ background: '#f1f5f9', color: '#475569' }}>Qty</th>
                               <th style={{ background: '#f1f5f9', color: '#475569' }}>Price</th>
                             </tr>
                           </thead>
                           <tbody>
                             {bill.items.map((item, idx) => (
                               <tr key={idx}>
                                 <td style={{ padding: '4px 8px' }}>{item.name}</td>
                                 <td style={{ padding: '4px 8px' }}>{item.quantity}</td>
                                 <td style={{ padding: '4px 8px' }}>₹ {item.total}</td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                         
                         <div style={{ marginTop: '10px', textAlign: 'right' }}>
                           <button className="btn btn-sm btn-muted" onClick={() => handleEdit(bill._id)}>
                              Edit / Reload Bill
                           </button>
                         </div>
                      </div>
                    ))
                  )}
               </div>
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
