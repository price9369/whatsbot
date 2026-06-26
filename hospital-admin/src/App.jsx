import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { 
  MessageSquare, 
  FileSpreadsheet, 
  Users, 
  BarChart3, 
  Send, 
  LogOut,
  MapPin,
  Smartphone,
  Trash2,
  Settings,
  FileText,
  Eye,
  Lock,
  LayoutDashboard
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  const [botStatus, setBotStatus] = useState('Disconnected');
  const [qrCodeString, setQrCodeString] = useState('');
  const [connectedNumber, setConnectedNumber] = useState(''); 
  const [connectedName, setConnectedName] = useState(''); 
  const [connectedPic, setConnectedPic] = useState('');   
  const [errorReason, setErrorReason] = useState('');

  const [chats, setChats] = useState([
    { number: '919876543210', lastMessage: 'OPD Timing kya hai?', time: '02:30 PM' },
    { number: '919555123456', lastMessage: 'Ayushman card counter?', time: '02:45 PM' }
  ]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [adminReplyText, setAdminReplyText] = useState('');

  const [bulkNumbers, setBulkNumbers] = useState([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  const [botKeywords, setBotKeywords] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [newReply, setNewReply] = useState('');

  const [roster, setRoster] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocTime, setNewDocTime] = useState('');

  const [uploadedPDFs, setUploadedPDFs] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfKeyNum, setPdfKeyNum] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [activePdfUrl, setActivePdfUrl] = useState(null); 

  const chartData = {
    labels: ['OPD पूछताछ', 'इमरजेंसी सेवा', 'आयुष्मान भारत', 'अन्य हेल्प'],
    datasets: [{
      label: 'मरीजों के सवाल (आज)',
      data: [220, 45, 134, 33],
      backgroundColor: ['#0284c7', '#ef4444', '#10b981', '#f59e0b'],
      borderRadius: 8
    }]
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === 'anilkumar' && password === 'Anil@9369') {
      setIsLoggedIn(true);
      setLoginError('');
      localStorage.setItem('hospital_admin_session', 'authenticated');
    } else {
      setLoginError('❌ गलत यूज़रनेम या密码!');
    }
  };

  const handleAdminPanelLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('hospital_admin_session');
  };

  // 🌟 ट्राई/कैच फिक्स ताकि बैकएंड बंद होने पर भी रिएक्ट स्क्रीन ब्लैंक (सफेद) न हो
  const loadConfigurationData = async () => {
    try {
      const statusRes = await axios.get(`${BACKEND_URL}/api/status`);
      if (statusRes && statusRes.data ? statusRes.data.success : false) {
        setBotStatus(statusRes.data.status);
        setQrCodeString(statusRes.data.qr || '');
        setConnectedNumber(statusRes.data.connectedPhone || '');
        setConnectedName(statusRes.data.connectedName || '');
        setConnectedPic(statusRes.data.connectedPic || '');
        setErrorReason(statusRes.data.errorReason || '');
      }
    } catch (err) {
      console.log("Backend offline or connection issue");
      setBotStatus('Disconnected');
    }

    try {
      const configRes = await axios.get(`${BACKEND_URL}/api/config`);
      if (configRes && configRes.data ? configRes.data.success : false) {
        setBotKeywords(configRes.data.keywords);
        setRoster(configRes.data.roster);
        setUploadedPDFs(configRes.data.pdfs);
      }
    } catch (err) {
      console.log("Config failed to load");
    }
  };

  useEffect(() => {
    const session = localStorage.getItem('hospital_admin_session');
    if (session === 'authenticated') setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadConfigurationData();
      const interval = setInterval(loadConfigurationData, 3000); 
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleAddKeyword = async () => {
    if (!newKey || !newPurpose || !newReply) return alert("सभी फ़ील्ड्स भरें!");
    try {
      const res = await axios.post(`${BACKEND_URL}/api/config/keyword`, { key: newKey, purpose: newPurpose, reply: newReply });
      if (res.data.success) { setBotKeywords(res.data.keywords); setNewKey(''); setNewPurpose(''); setNewReply(''); }
    } catch (err) { alert("त्रुटि!"); }
  };

  const handleRemoveKeyword = async (keyNum) => {
    try {
      const res = await axios.delete(`${BACKEND_URL}/api/config/keyword/${keyNum}`);
      if (res.data.success) setBotKeywords(res.data.keywords);
    } catch (err) { alert("त्रुटि!"); }
  };

  const handleAddDoctor = async () => {
    if (!newDept || !newDocName || !newDocTime) return alert("पूरी जानकारी भरें!");
    try {
      const res = await axios.post(`${BACKEND_URL}/api/config/roster`, { dept: newDept, doctor: newDocName, time: newDocTime });
      if (res.data.success) { setRoster(res.data.roster); setNewDept(''); setNewDocName(''); setNewDocTime(''); }
    } catch (err) { alert("सेव फेल!"); }
  };

  const handleRemoveDoctor = async (index) => {
    try {
      const res = await axios.delete(`${BACKEND_URL}/api/config/roster/${index}`);
      if (res.data.success) setRoster(res.data.roster);
    } catch (err) { alert("त्रुटि!"); }
  };

  const handlePdfUploadSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile || !pdfKeyNum || !pdfTitle) return alert("डिटेल्स भरें!");
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('keyNum', pdfKeyNum);
    formData.append('title', pdfTitle);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/config/pdf`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) { setUploadedPDFs(res.data.pdfs); setBotKeywords(res.data.keywords); setPdfFile(null); setPdfKeyNum(''); setPdfTitle(''); alert("✅ PDF अपलोड हुआ!"); }
    } catch (err) { alert("अपलोड फेल!"); }
  };

  const handleRemovePdf = async (keyNum) => {
    try {
      const res = await axios.delete(`${BACKEND_URL}/api/config/pdf/${keyNum}`);
      if (res.data.success) { setUploadedPDFs(res.data.pdfs); setBotKeywords(res.data.keywords); }
    } catch (err) { alert("त्रुटि!"); }
  };

  const handleConnectBot = async () => {
    try { 
      setBotStatus('Connecting...'); 
      setQrCodeString(''); 
      setConnectedNumber('');
      setConnectedName('');
      setConnectedPic('');
      setErrorReason('');
      await axios.post(`${BACKEND_URL}/api/connect`); 
    } catch (err) { alert("कनेक्शन एरर!"); }
  };

  const handleLogoutBot = async () => {
    if (window.confirm("क्या आप व्हाट्सएप डिस्कनेक्ट करना चाहते हैं?")) {
      try { 
        setBotStatus('Disconnected');
        setQrCodeString('');
        setConnectedNumber('');
        setConnectedName('');
        setConnectedPic('');
        setErrorReason('');
        await axios.post(`${BACKEND_URL}/api/logout`); 
      } catch (err) { alert("डिस्कनेक्ट फेल!"); }
    }
  };

  const handleSendReply = async () => {
    if (!selectedPatient || !adminReplyText.trim()) return alert("मरीज चुनें!");
    try {
      const res = await axios.post(`${BACKEND_URL}/api/admin-reply`, { number: selectedPatient, message: adminReplyText });
      if (res.data.success) { alert("सेंड हुआ!"); setAdminReplyText(''); }
    } catch (err) { alert("फेल!"); }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const numbers = data.map(row => row[0]).filter(num => num && !isNaN(num));
      setBulkNumbers(numbers);
      setBulkStatus(`✅ ${numbers.length} नंबर लोड हुए।`);
    };
    reader.readAsBinaryString(file);
  };

  const triggerBulkBroadcast = async () => {
    if (bulkNumbers.length === 0 || !bulkMessage.trim()) return alert("चेक करें!");
    try {
      setBulkStatus("⏳ ब्रॉडकास्ट चालू...");
      const res = await axios.post(`${BACKEND_URL}/api/broadcast-excel`, { numbers: bulkNumbers, message: bulkMessage });
      setBulkStatus(res.data.message);
    } catch (error) { setBulkStatus("❌ त्रुटि!"); }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div style={{ backgroundColor: '#e0f2fe', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px auto' }}>
              <Lock size={28} color="#0284c7" />
            </div>
            <h2 style={{ margin: '0', fontSize: '22px', fontWeight: 'bold', color: '#1e293b' }}>सेंट्रल एडमिन लॉगिन</h2>
          </div>
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>यूज़रनेम</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>पासवर्ड</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} required />
            </div>
            {loginError && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '15px' }}>{loginError}</div>}
            <button type="submit" style={{ width: '100%', backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>लॉगिन करें</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      
      <style>{`
        body, html { margin: 0; padding: 0; width: 100%; overflow-x: hidden; background-color: #f8fafc; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; borderRadius: 4px; }
      `}</style>

      {/* 🧭 SIDEBAR NAVIGATION */}
      <aside style={{ width: '260px', minWidth: '260px', backgroundColor: '#0f172a', color: '#94a3b8', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b' }}>
        <div style={{ padding: '25px', borderBottom: '1px solid #1e293b', textAlign: 'center', backgroundColor: '#1e293b' }}>
          <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '18px' }}>VAMC CONTROL</div>
          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>VLE & Admin Panel v2.0</span>
        </div>
        
        <nav style={{ flex: 1, padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button onClick={() => setActiveTab('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', textAlign: 'left', color: activeTab === 'dashboard' ? '#ffffff' : '#94a3b8', backgroundColor: activeTab === 'dashboard' ? '#0284c7' : 'transparent' }}>
            <LayoutDashboard size={18} /> Main Dashboard
          </button>
          <button onClick={() => setActiveTab('keywords')} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', textAlign: 'left', color: activeTab === 'keywords' ? '#ffffff' : '#94a3b8', backgroundColor: activeTab === 'keywords' ? '#0284c7' : 'transparent' }}>
            <Settings size={18} /> Keyboard Autoreply
          </button>
          <button onClick={() => setActiveTab('roster')} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', textAlign: 'left', color: activeTab === 'roster' ? '#ffffff' : '#94a3b8', backgroundColor: activeTab === 'roster' ? '#0284c7' : 'transparent' }}>
            <Users size={18} /> OPD Doctor Roster
          </button>
          <button onClick={() => setActiveTab('pdfs')} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', textAlign: 'left', color: activeTab === 'pdfs' ? '#ffffff' : '#94a3b8', backgroundColor: activeTab === 'pdfs' ? '#0284c7' : 'transparent' }}>
            <FileText size={18} /> PDF File Manager
          </button>
          <button onClick={() => setActiveTab('chats')} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', textAlign: 'left', color: activeTab === 'chats' ? '#ffffff' : '#94a3b8', backgroundColor: activeTab === 'chats' ? '#0284c7' : 'transparent' }}>
            <MessageSquare size={18} /> Patient Chat Desk
          </button>
          <button onClick={() => setActiveTab('broadcast')} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', textAlign: 'left', color: activeTab === 'broadcast' ? '#ffffff' : '#94a3b8', backgroundColor: activeTab === 'broadcast' ? '#0284c7' : 'transparent' }}>
            <FileSpreadsheet size={18} /> Anti-Block Broadcast
          </button>
        </nav>

        <div style={{ padding: '20px 15px', borderTop: '1px solid #1e293b' }}>
          <button onClick={handleAdminPanelLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', justifyContent: 'center' }}>
            <LogOut size={14} /> Panel Lock Karein
          </button>
        </div>
      </aside>

      {/* 🚀 WORKSPACE MAIN PORT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '0', minHeight: '100vh', boxSizing: 'border-box' }}>
        
        {/* 🏢 MODERN FIXED HEADER */}
        <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '20px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.3px' }}>
              VARUN ARJUN MEDICAL COLLEGE & ROHILKHAND HOSPITAL
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <MapPin size={13} color="#ef4444" /> Banthra, Shahjahanpur, Uttar Pradesh - 242307
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            
            {/* लाइव प्रोफाइल विजुअल */}
            {botStatus === 'Connected' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#e0f2fe', padding: '4px 14px', borderRadius: '25px', border: '1px solid #bae6fd' }}>
                {connectedPic ? (
                  <img src={connectedPic} alt="Profile" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>👤</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>{connectedName}</span>
                  <span style={{ fontSize: '11px', color: '#0284c7' }}>+{connectedNumber}</span>
                </div>
              </div>
            )}

            <span style={{ backgroundColor: botStatus === 'Connected' ? '#d1fae5' : botStatus === 'QR_Ready' || botStatus === 'Connecting...' ? '#fef3c7' : '#fee2e2', color: botStatus === 'Connected' ? '#065f46' : botStatus === 'QR_Ready' || botStatus === 'Connecting...' ? '#92400e' : '#991b1b', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
              Bot Status: {botStatus}
            </span>
          </div>
        </header>

        {/* WORKSPACE CONTENT BODY */}
        <div style={{ padding: '25px', flex: 1, boxSizing: 'border-box', width: '100%' }}>
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold' }}><Smartphone color="#0284c7" size={16}/> WhatsApp Automation Engine</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>क्यूआर कोड जनरेट करने या सर्विस रोकने के लिए नीचे बटन दबाएं।</p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
                    {botStatus === 'Disconnected' && <button onClick={handleConnectBot} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '11px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🔗 Initialize Bot</button>}
                    {botStatus !== 'Disconnected' && <button onClick={handleLogoutBot} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '11px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Disconnect Device</button>}
                  </div>
                  
                  {/* 🚨 एरर हैंडलर डिस्प्ले स्ट्रिंग */}
                  {botStatus === 'Disconnected' && errorReason && (
                    <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', lineHeight: '1.5' }}>
                      ⚠️ status {errorReason}
                    </div>
                  )}

                  {/* ⏳ लोडिंग/स्कैनिंग के समय मैसेज */}
                  {botStatus === 'Connecting...' && !qrCodeString && (
                    <div style={{ marginTop: '15px', color: '#b45309', backgroundColor: '#fffbeb', padding: '12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                      ⏳ व्हाट्सएप इंजन शुरू हो रहा है... कृपया लोड होने दें।
                    </div>
                  )}

                  {/* 🖨️ क्यूआर कोड ब्लॉक */}
                  {(botStatus === 'QR_Ready' || botStatus === 'Connecting...') && qrCodeString ? (
                    <div style={{ marginTop: '20px', display: 'inline-block', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 'bold', marginBottom: '8px' }}>Scan QR via Linked Devices</div>
                      <QRCodeSVG value={qrCodeString} size={150} />
                    </div>
                  ) : null}

                  {/* 🎯 सक्सेसफुल कनेक्टेड लेआउट */}
                  {botStatus === 'Connected' && (
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', border: '1px solid #a7f3d0' }}>
                        🎉 Account add successfully
                      </div>
                      
                      <div style={{ padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {connectedPic ? (
                          <img src={connectedPic} alt="Connected" style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #166534', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#166534', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                        )}
                        <div>
                          <div style={{ color: '#166534', fontWeight: 'bold', fontSize: '15px' }}>{connectedName}</div>
                          <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>📱 +{connectedNumber}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* LIVE PATIENT VIEW PREVIEW */}
                <div style={{ backgroundColor: '#efeae2', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', height: '220px' }}>
                  <div style={{ backgroundColor: '#075e54', color: 'white', padding: '10px 15px', borderTopLeftRadius: '11px', borderTopRightRadius: '11px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>VAMC Help Desk Bot</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', alignSelf: 'flex-start' }}>
                      <strong>मरीज का मैसेज:</strong> "1" भेजता है।
                    </div>
                    <div style={{ backgroundColor: '#dcf8c6', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', alignSelf: 'flex-end', whiteSpace: 'pre-wrap' }}>
                      🏥 <strong>स्मार्ट रोस्टर मेनू:</strong>{"\n"}
                      {roster.map((d, i) => `1${i+1}️⃣ ${d.dept}\n`)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '320px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}><BarChart3 size={15}/> System Analytics Log Counter</h4>
                <div style={{ height: '250px', position: 'relative' }}>
                  <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEYWORDS */}
          {activeTab === 'keywords' && (
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold' }}><Settings size={18} color="#f59e0b" /> Keyboard Auto-Reply Configuration</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 2fr 3fr', gap: '12px', marginBottom: '15px' }}>
                <input type="text" placeholder="की नंबर (जैसे 2)" value={newKey} onChange={e => setNewKey(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="मेनू बटन नाम" value={newPurpose} onChange={e => setNewPurpose(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="जवाब टाइप करें..." value={newReply} onChange={e => setNewReply(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <button onClick={handleAddKeyword} style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ नया मेनू लाइव जोड़ें</button>
              
              <table style={{ width: '100%', marginTop: '25px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>की नंबर</th>
                    <th style={{ padding: '12px' }}>मेनू नाम</th>
                    <th style={{ padding: '12px' }}>ऑटोमैटिक संदेश</th>
                    <th style={{ padding: '12px' }}>हटाएं</th>
                  </tr>
                </thead>
                <tbody>
                  {botKeywords.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.key}</td>
                      <td style={{ padding: '12px' }}>{item.purpose}</td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>{item.reply}</td>
                      <td style={{ padding: '12px' }}><button onClick={() => handleRemoveKeyword(item.key)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: ROSTER */}
          {activeTab === 'roster' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', width: '100%' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold' }}><Users size={18} color="#10b981" /> Live Doctor Duty Setup</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                  <input type="text" placeholder="विभाग का नाम (जैसे: Medicine)" value={newDept} onChange={e => setNewDept(newTarget => setNewDept(newTarget.target.value))} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  <input type="text" placeholder="डॉक्टर का नाम" value={newDocName} onChange={e => setNewDocName(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  <input type="text" placeholder="ड्यूटी का समय" value={newDocTime} onChange={e => setNewDocTime(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <button onClick={handleAddDoctor} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ लिस्ट में सेव करें</button>

                <div style={{ marginTop: '25px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '8px' }}>विभाग</th>
                        <th style={{ padding: '8px' }}>डॉक्टर</th>
                        <th style={{ padding: '8px' }}>समय</th>
                        <th style={{ padding: '8px' }}>हटाएं</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((doc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{doc.dept}</td>
                          <td style={{ padding: '8px' }}>{doc.doctor}</td>
                          <td style={{ padding: '8px', color: '#475569' }}>{doc.time}</td>
                          <td style={{ padding: '8px' }}><button onClick={() => handleRemoveDoctor(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ backgroundColor: '#efeae2', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '24px' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 'bold', color: '#075e54' }}>📱 मरीज मोबाइल स्क्रीन सिमुलेटर</h4>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '15px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  🏥 *Varun Arjun Hospital Help Desk*{"\n\n"}
                  {roster.map((d, i) => `1${i+1}️⃣ *${d.dept}* (${d.doctor})\n`)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PDF MANAGER */}
          {activeTab === 'pdfs' && (
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold' }}><FileText size={18} color="#0284c7" /> PDF Roster Document Linker</h3>
              <form onSubmit={handlePdfUploadSubmit} style={{ display: 'grid', gridTemplateColumns: '120px 2fr 2fr 1fr', gap: '12px', alignItems: 'center' }}>
                <input type="text" placeholder="की नंबर" value={pdfKeyNum} onChange={e => setPdfKeyNum(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
                <input type="text" placeholder="फाइल टाइटल नाम" value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
                <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} required />
                <button type="submit" style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold' }}>Upload</button>
              </form>
              <div style={{ marginTop: '30px' }}>
                {uploadedPDFs.map((pdf, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                    <div><strong>दबाएं {pdf.keyNum}:</strong> {pdf.title}</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setActivePdfUrl(`${BACKEND_URL}${pdf.url}`)} style={{ backgroundColor: '#0284c7', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none' }}><Eye size={14}/> Open Document</button>
                      <button onClick={() => handleRemovePdf(pdf.keyNum)} style={{ background: 'none', border: 'none', color: '#ef4444' }}><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CHATS */}
          {activeTab === 'chats' && (
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', height: '450px' }}>
              <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '15px', overflowY: 'auto' }}>
                {chats.map((chat, idx) => (
                  <div key={idx} onClick={() => setSelectedPatient(chat.number)} style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedPatient === chat.number ? '#e0f2fe' : '#f8fafc', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>+{chat.number}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{chat.lastMessage}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                  {selectedPatient ? <div><strong>Active:</strong> +{selectedPatient}</div> : <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '80px' }}>मरीज सिलेक्ट करें।</div>}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="Type response..." value={adminReplyText} onChange={e => setAdminReplyText(e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                  <button onClick={handleSendReply} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px' }}><Send size={16}/></button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BROADCAST */}
          {activeTab === 'broadcast' && (
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold' }}><FileSpreadsheet size={18} color="#d97706" /> Anti-Ban Bulk Broadcast</h3>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} style={{ marginBottom: '15px' }} />
              <textarea placeholder="Write announcement here..." value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} style={{ width: '100%', height: '120px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'none' }} />
              {bulkStatus && <p style={{ fontSize: '13px', color: '#b45309', fontWeight: 'bold' }}>{bulkStatus}</p>}
              <button onClick={triggerBulkBroadcast} style={{ width: '100%', backgroundColor: '#d97706', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' }}>Launch Broadcast</button>
            </div>
          )}

        </div>

        {/* 💫 TEXT FOOTER */}
        <footer style={{ backgroundColor: '#0f172a', padding: '14px 0', width: '100%', boxSizing: 'border-box', borderTop: '2px solid #1e293b', overflow: 'hidden' }}>
          <div style={{ width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <style>{`
              @keyframes marquee {
                0% { transform: translate3d(100%, 0, 0); }
                100% { transform: translate3d(-100%, 0, 0); }
              }
              .developer-marquee {
                display: inline-block;
                padding-left: 100%;
                animation: marquee 45s linear infinite;
                font-family: 'sans-serif';
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 1px;
                color: #38bdf8;
                text-transform: uppercase;
              }
              .developer-marquee span { color: #f59e0b; }
            `}</style>
            <div className="developer-marquee">
              🚀 <span>System Core Status: Operational</span> ——— 🌟 Design & Developed By: <span>Mr. Anil Kumar Developer</span> ——— 🏥 Hospital Automation Portal System Dashboard <span>v2.0</span> ——— ⚡ All Node.js/Baileys WhatsApp Systems Active.
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}

export default App;