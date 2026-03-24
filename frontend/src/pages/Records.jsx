import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast.jsx';
import CountUp from '../components/CountUp.jsx';
import { SkeletonTable, SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useDarkMode } from '../hooks/useDarkMode.js';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  "https://anubhav-billing-1jso.onrender.com";

// Helper: classify medicine expiry
function getExpiryClass(exp) {
  if (!exp) return '';
  const parts = exp.split('/');
  if (parts.length !== 2) return '';
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  if (!month || !year) return '';
  const fullYear = year < 100 ? 2000 + year : year;
  const expiryDate = new Date(fullYear, month, 0); // last day of that month
  const now = new Date();
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  if (expiryDate < now) return 'expiry-expired';
  if (expiryDate <= threeMonths) return 'expiry-warning';
  return 'expiry-ok';
}

function getExpiryLabel(exp) {
  const cls = getExpiryClass(exp);
  if (cls === 'expiry-expired') return ' ⛔ Expired';
  if (cls === 'expiry-warning') return ' ⚠️ Expiring Soon';
  return '';
}

function Records() {
  const navigate = useNavigate();
  const toast = useToast();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [activeTab, setActiveTab] = useState('analytics');

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
        toast.success(`Bill ${billNo} deleted successfully`);
        fetchBills();
      } else {
        toast.error("Failed to delete bill.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting bill.");
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

      sessionStorage.setItem('invoice_form', JSON.stringify(form));
      sessionStorage.setItem('invoice_items', JSON.stringify(items));
      navigate('/billing');
    } catch (e) {
      console.error(e);
      toast.error("Error loading bill for edit.");
    }
  };

  // --- Duplicate Bill ---
  const handleDuplicate = async (id) => {
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
        billNo: '', // New bill number will be auto-fetched
        billDate: (() => {
          const now = new Date();
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

      while (items.length < 5) items.push(blankItem());

      sessionStorage.setItem('invoice_form', JSON.stringify(form));
      sessionStorage.setItem('invoice_items', JSON.stringify(items));
      toast.info('Bill duplicated! Redirecting to billing...');
      setTimeout(() => navigate('/billing'), 500);
    } catch (e) {
      console.error(e);
      toast.error("Error duplicating bill.");
    }
  };

  // --- Medicines State & Logic ---
  const [medicines, setMedicines] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medSearch, setMedSearch] = useState("");
  const [editingMed, setEditingMed] = useState(null);
  const [medTotal, setMedTotal] = useState(0);
  const [medPage, setMedPage] = useState(1);
  const [medTotalPages, setMedTotalPages] = useState(1);
  const fetchMedicines = async () => {
    setMedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/medicines?search=${encodeURIComponent(medSearch)}&page=${medPage}&limit=10`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMedicines(data.data || data);
        setMedTotal(data.total || 0);
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

  const handlePatDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete patient: ${name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/patients/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        if (selectedPatient && selectedPatient._id === id) {
          setSelectedPatient(null);
          setPatientHistory(null);
        }
        toast.success(`Patient "${name}" deleted`);
        fetchPatients();
      } else {
        toast.error("Failed to delete patient.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting patient.");
    }
  };

  useEffect(() => {
    if (activeTab === 'patients' && !selectedPatient) fetchPatients();
  }, [patSearch, activeTab, selectedPatient]);

  const handleMedDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete medicine: ${name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/medicines/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast.success(`Medicine "${name}" deleted`);
        fetchMedicines();
      } else {
        toast.error("Failed to delete medicine.");
      }
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
        toast.success(editingMed._id ? 'Medicine updated!' : 'Medicine added!');
        setEditingMed(null);
        fetchMedicines();
      } else {
        toast.error("Failed to save medicine.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving medicine.");
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
        <div className="brand" style={{ flexShrink: 1, minWidth: 0 }}>
          <img src="/Anubhav.png" alt="Anubhav Billing logo" className="brand-logo" />
          <div className="brand-text" style={{ overflow: 'hidden' }}>
            <h1 style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Anubhav Billing</h1>
          </div>
        </div>
        <div className="toolbar-right" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button 
            className={`dark-mode-toggle ${dark ? 'active' : ''}`} 
            onClick={toggleDark} 
            title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="toggle-knob">{dark ? '🌙' : '☀️'}</span>
          </button>
          <button className="btn btn-muted" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="container">
        
        {/* Tab Navigation */}
        <div className="tab-nav-container">
          <button 
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => { setActiveTab('analytics'); setSelectedPatient(null); }}
          >
            📊 Analytics
          </button>
          <button 
            className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => { setActiveTab('invoices'); setSelectedPatient(null); }}
          >
            🧾 Invoices
          </button>
          <button 
            className={`btn ${activeTab === 'medicines' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => { setActiveTab('medicines'); setSelectedPatient(null); }}
          >
            💊 Inventory
          </button>
          <button 
            className={`btn ${activeTab === 'patients' ? 'btn-primary' : 'btn-muted'}`} 
            onClick={() => setActiveTab('patients')}
          >
            👤 Patient History
          </button>
        </div>

        <section className="card">
          <div className="section-head" style={{ marginBottom: '6px' }}>
            <div style={{ marginBottom: '6px' }}>
              <p className="eyebrow" style={{ marginBottom: '2px' }}>
                {activeTab === 'invoices' ? 'Records' : activeTab === 'medicines' ? 'Inventory' : activeTab === 'patients' ? 'CRM' : 'Overview'}
              </p>
              <h2 style={{ marginBottom: '6px' }}>
                {activeTab === 'invoices' ? 'Saved Invoices' : activeTab === 'medicines' ? `Medicine Inventory (${medTotal})` : activeTab === 'patients' ? 'Patient Profiles' : 'Business Insights'}
              </h2>
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
              <div style={{ width: '100%', maxWidth: '400px', marginTop: '0px' }}>
              {activeTab === 'invoices' ? (
                <input 
                  type="text" 
                  placeholder="🔍 Search..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: '0 12px', height: '38px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', fontSize: '14px' }}
                />
              ) : activeTab === 'patients' ? (
                <input 
                  type="text" 
                  placeholder="🔍 Search..." 
                  value={patSearch}
                  onChange={(e) => setPatSearch(e.target.value)}
                  style={{ padding: '0 12px', height: '38px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', fontSize: '14px' }}
                />
              ) : (
                <input 
                  type="text" 
                  placeholder="🔍 Search..." 
                  value={medSearch}
                  onChange={(e) => { setMedSearch(e.target.value); setMedPage(1); }}
                  style={{ padding: '0 12px', height: '38px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', fontSize: '14px' }}
                />

              )}
            </div>
            )}
          </div>

          <div className="table-wrap" style={{ border: activeTab === 'analytics' ? 'none' : undefined, boxShadow: activeTab === 'analytics' ? 'none' : undefined }}>
            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="animate-fade-in-up" style={{ padding: '20px 0' }}>
                {anLoading || !analytics ? (
                  <div className="grid grid-3" style={{ marginBottom: '40px' }}>
                    <SkeletonCard /><SkeletonCard /><SkeletonCard />
                  </div>
                ) : (
                  <>


                    {/* Revenue Cards with CountUp */}
                    <div className="grid grid-3" style={{ marginBottom: '20px' }}>
                      <div className="card stat-card" style={{ background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.7), rgba(219, 234, 254, 0.7))', border: '1px solid rgba(255, 255, 255, 0.6)', margin: 0 }}>
                        <p className="eyebrow" style={{ color: '#1d4ed8' }}>Today's Revenue</p>
                        <h2 style={{ fontSize: '28px', margin: '14px 0 8px', color: '#1e3a8a' }}>
                          ₹ <CountUp end={analytics.revenue.today} />
                        </h2>
                        <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600 }}>{analytics.revenue.todayCount} Bills</span>
                      </div>
                      <div className="card stat-card" style={{ background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.7), rgba(220, 252, 227, 0.7))', border: '1px solid rgba(255, 255, 255, 0.6)', margin: 0 }}>
                        <p className="eyebrow" style={{ color: '#15803d' }}>This Month</p>
                        <h2 style={{ fontSize: '28px', margin: '14px 0 8px', color: '#14532d' }}>
                          ₹ <CountUp end={analytics.revenue.month} />
                        </h2>
                        <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{analytics.revenue.monthCount} Bills</span>
                      </div>
                      <div className="card stat-card" style={{ background: 'linear-gradient(135deg, rgba(250, 245, 255, 0.7), rgba(243, 232, 255, 0.7))', border: '1px solid rgba(255, 255, 255, 0.6)', margin: 0 }}>
                        <p className="eyebrow" style={{ color: '#7e22ce' }}>All Time Revenue</p>
                        <h2 style={{ fontSize: '28px', margin: '14px 0 8px', color: '#581c87' }}>
                          ₹ <CountUp end={analytics.revenue.allTime} />
                        </h2>
                      </div>
                    </div>

                    {/* Low Stock Alert Card */}
                    {analytics.lowStock && analytics.lowStock.length > 0 && (
                      <div className="low-stock-card" style={{ marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                          <span>🚨</span> Low Stock Alert
                        </h3>
                        {analytics.lowStock.map((med, i) => (
                          <div key={i} className="low-stock-item">
                            <strong>{med.name}</strong>
                            <span className="low-stock-badge">Stock: {med.stock}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
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
                                  <th style={{ background: 'transparent' }}>Bill No</th>
                                  <th style={{ background: 'transparent' }}>Patient</th>
                                  <th style={{ background: 'transparent' }}>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.recentBills.map(b => (
                                  <tr key={b._id}>
                                    <td data-label="Bill No" style={{ borderTop: '1px solid #e2e8f0' }}>{b.billNo}</td>
                                    <td data-label="Patient" style={{ borderTop: '1px solid #e2e8f0' }}>{b.patientName || 'Walk-in'}</td>
                                    <td data-label="Amount" style={{ fontWeight: 600, borderTop: '1px solid #e2e8f0', color: '#15803d' }}>₹ {b.finalTotal}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <EmptyState type="invoices" title="No transactions yet" message="Bills will appear here once created." />}
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
                                  <th style={{ background: 'transparent' }}>Medicine</th>
                                  <th style={{ background: 'transparent' }}>Units Sold</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.topMedicines.map((m, i) => (
                                  <tr key={i}>
                                    <td data-label="Medicine" style={{ borderTop: '1px solid #e2e8f0' }}><strong>{m._id || 'Unknown'}</strong></td>
                                    <td data-label="Units Sold" style={{ borderTop: '1px solid #e2e8f0', color: '#2563eb', fontWeight: 600 }}>{m.totalSold} Units</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <EmptyState type="medicines" title="No sales data" message="Start billing to see top medicines." />}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Invoices Table */}
            {activeTab === 'invoices' && (
              loading ? (
                <div style={{ padding: '10px' }}><SkeletonTable rows={5} cols={6} /></div>
              ) : bills.length === 0 ? (
                <EmptyState type="invoices" title="No invoices found" message="Create your first bill to see it here." />
              ) : (
                <div className="animate-fade-in-up">
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
                        <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => handleEdit(bill._id)} style={{ flex: 1, margin: 0 }}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-muted" onClick={() => handleDuplicate(bill._id)} title="Duplicate this bill" style={{ flex: 1, margin: 0 }}>
                            📋 Copy
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(bill._id, bill.invoiceNumber)} style={{ flex: 1, margin: 0 }}>
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

            {/* Medicines Table with Expiry Tracking */}
            {activeTab === 'medicines' && (
              medLoading ? (
                <div style={{ padding: '10px' }}><SkeletonTable rows={5} cols={7} /></div>
              ) : medicines.length === 0 ? (
                <EmptyState type="medicines" title="No medicines found" message="Add medicines to your directory." />
              ) : (
                <div className="animate-fade-in-up">
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
                        <td data-label="Expiry">
                          <span className={getExpiryClass(med.exp)}>
                            {med.exp || '-'}{getExpiryLabel(med.exp)}
                          </span>
                        </td>
                        <td data-label="Stock">
                          <span className={med.stock && med.stock < 20 ? 'stock-low' : 'stock-ok'}>
                            {med.stock || 0}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => setEditingMed(med)} style={{ flex: 1, margin: 0 }}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleMedDelete(med._id, med.name)} style={{ flex: 1, margin: 0 }}>
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
                <div style={{ padding: '10px' }}><SkeletonTable rows={5} cols={5} /></div>
              ) : patients.length === 0 ? (
                <EmptyState type="patients" title="No patients found" message="Patients will appear here after billing." />
              ) : (
                <div className="animate-fade-in-up">
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
                           <td style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-sm btn-primary" onClick={() => { setSelectedPatient(p); loadPatientHistory(p._id); }} style={{ flex: 1, margin: 0 }}>
                                View History
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handlePatDelete(p._id, p.name)} style={{ flex: 1, margin: 0 }}>
                                Delete
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
                </table>
                </div>
              )
            )}

            {/* Patient History View */}
            {activeTab === 'patients' && selectedPatient && patientHistory && (
               <div className="animate-fade-in-up" style={{ padding: '0 10px 20px' }}>
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
                      <h2 style={{ fontSize: '28px', color: '#047857', margin: 0 }}>₹ <CountUp end={patientHistory.totalSpent} /></h2>
                    </div>
                  </div>

                  <h3 style={{ margin: '20px 0 15px' }}>Billing & Prescription History</h3>
                  
                  {patientHistory.history.length === 0 ? <EmptyState type="invoices" title="No bills yet" message="No previous bills found for this patient." /> : (
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
                                 <td data-label="Medicine" style={{ padding: '4px 8px' }}>{item.name}</td>
                                 <td data-label="Qty" style={{ padding: '4px 8px' }}>{item.quantity}</td>
                                 <td data-label="Price" style={{ padding: '4px 8px' }}>₹ {item.total}</td>
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
            <h3 style={{ marginBottom: '20px', fontSize: '1.25rem' }}>{editingMed._id ? 'Edit Medicine' : '+ Add New Medicine'}</h3>
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

      {/* Floating Action Button — New Bill */}
      <button className="fab-new-bill" onClick={() => {
        sessionStorage.removeItem('invoice_form');
        sessionStorage.removeItem('invoice_items');
        navigate('/billing');
        window.location.reload();
      }} title="Create New Bill">
        <span className="fab-icon">+</span>
        <span className="fab-label">New Bill</span>
      </button>

    </div>
  );
}

export default Records;
