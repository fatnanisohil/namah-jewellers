import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  PlusCircle,
  UserCheck,
  Check,
  X,
  Camera,
  Download,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  Sparkles,
  Layers,
  Copy,
  Users,
  Lock,
  LogOut,
  ShieldCheck,
  LogIn,
  PowerOff
} from 'lucide-react';

const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzCUr7rdM-mOJ0xw9llzwPhO3aszIvC_FtJLNZ1ebWWoUUQ3qltPFTmrfHAJuZQsu1iWA/exec";

// Proper Case text helper function
const toProperCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function App() {
  const [activeTab, setActiveTab] = useState('orders');
  const [karigarSubTab, setKarigarSubTab] = useState('Amardeep');
  const [previewImage, setPreviewImage] = useState(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('namah_logged_in') === 'true';
  });
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    return localStorage.getItem('namah_user_role') || 'Salesperson';
  });
  const [currentUserName, setCurrentUserName] = useState(() => {
    return localStorage.getItem('namah_user_name') || 'Guest Viewer';
  });
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginNameInput, setLoginNameInput] = useState('Admin');
  const [loginPinInput, setLoginPinInput] = useState('');

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('namah_local_orders');
    return saved ? JSON.parse(saved) : [];
  });



  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterSalesperson, setFilterSalesperson] = useState('ALL');
  const [filterExecutive, setFilterExecutive] = useState('ALL');
  const [filterWorkType, setFilterWorkType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [selectedOrderForKarigar, setSelectedOrderForKarigar] = useState(null);
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [selectedCustomerCRM, setSelectedCustomerCRM] = useState(null);

  const [formData, setFormData] = useState({
    customerName: '',
    contactNumber: '',
    orderType: '',
    orderSheetNo: '',
    salesPerson: '',
    jewelleryItem: '',
    tagNumber: '',
    productImageLink: '',
    imageBase64: '',
    imagePreviewLocal: '',
    goldWeight: '',
    diamondWeight: '',
    colorTone: '',
    colorStone: '',
    size: '',
    purity: '',
    orderDescription: '',
    orderTakenDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    orderPerson: '',
    specialRemarks: ''
  });

  const extractDateOnly = (dateStr) => {
    if (!dateStr) return 'N/A';
    const val = String(dateStr).trim();
    if (val.includes('T')) return val.split('T')[0];
    if (val.includes(' ')) return val.split(' ')[0];
    return val;
  };

  const formatDriveUrl = (order) => {
  if (order.imagePreviewLocal) return order.imagePreviewLocal;

  const rawUrl = order.productImageLink || '';
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  // Ignore massive base64 strings in the web view to prevent browser crashes
  if (rawUrl.startsWith('data:image')) return ''; 
  if (rawUrl.startsWith('blob:') || (!rawUrl.includes('drive.google.com') && rawUrl.startsWith('http'))) {
    return rawUrl;
  }

  let fileId = '';
  if (rawUrl.includes('/file/d/')) {
    fileId = rawUrl.split('/file/d/')[1]?.split('/')[0];
  } else if (rawUrl.includes('id=')) {
    fileId = rawUrl.split('id=')[1]?.split('&')[0];
  } else if (rawUrl.includes('/d/')) {
    fileId = rawUrl.split('/d/')[1]?.split('/')[0];
  }

  if (fileId) {
    // Request a small thumbnail size (&sz=w150) to save memory
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w150`;
  }
  return '';
};

  const fetchOrdersFromSheet = async () => {
    setLoading(true);
    try {
      const response = await fetch(GOOGLE_SHEETS_API_URL);
      const data = await response.json();
      if (Array.isArray(data)) {
        setOrders(prevOrders => {
          const merged = data.map(serverOrder => {
            const localMatch = prevOrders.find(o => o.orderSheetNo === serverOrder.orderSheetNo && o.tagNumber === serverOrder.tagNumber);
            return {
              ...serverOrder,
              customerName: toProperCase(serverOrder.customerName),
              jewelleryItem: toProperCase(serverOrder.jewelleryItem),
              karigarName: toProperCase(serverOrder.karigarName),
              colorTone: toProperCase(serverOrder.colorTone),
              orderDescription: toProperCase(serverOrder.orderDescription),
              imagePreviewLocal: localMatch?.imagePreviewLocal || serverOrder.imagePreviewLocal,
              imageBase64: localMatch?.imageBase64 || serverOrder.imageBase64,
              productImageLink: localMatch?.imagePreviewLocal || localMatch?.imageBase64 || serverOrder.productImageLink,
              isOn: serverOrder.isOn
            };
          });
          return merged;
        });
      }
    } catch (error) {
      console.error("Error fetching from Google Sheets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchOrdersFromSheet();
    const interval = setInterval(fetchOrdersFromSheet, 60000);
    return () => clearInterval(interval);
  }, []);

 

  useEffect(() => {
  try {
    // Strip heavy base64 strings before saving to prevent QuotaExceededError
    const lightOrders = orders.map(o => ({
      ...o,
      imageBase64: undefined,
      imagePreviewLocal: undefined
    }));
    localStorage.setItem('namah_local_orders', JSON.stringify(lightOrders));
  } catch (error) {
    console.error("Local storage quota exceeded:", error);
  }
}, [orders]);

// Preload high-res images silently in the background so they open instantly
  useEffect(() => {
    orders.forEach(order => {
      const url = formatDriveUrl(order);
      if (url) {
        const hdUrl = url.includes('sz=') ? url.replace(/sz=w\d+/, 'sz=w1200') : url + '&sz=w1200';
        const img = new Image();
        img.src = hdUrl;
      }
    });
  }, [orders]);


  useEffect(() => {
    localStorage.setItem('namah_logged_in', isLoggedIn);
    localStorage.setItem('namah_user_role', currentUserRole);
    localStorage.setItem('namah_user_name', currentUserName);
  }, [isLoggedIn, currentUserRole, currentUserName]);

  const isAuthorizedToEdit = isLoggedIn && (currentUserRole === 'Admin' || currentUserRole === 'Order Processing');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = new URLSearchParams();
      payload.append('action', 'verifyLogin');
      payload.append('user', loginNameInput);
      payload.append('pin', loginPinInput);

      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: "POST",
        body: payload
      });
      const result = await response.json();

      if (result.success) {
        setCurrentUserRole(result.role);
        setCurrentUserName(result.name || loginNameInput);
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setLoginPinInput('');
      } else {
        alert("❌ Incorrect PIN or Username!");
      }
    } catch (err) {
      console.error("Login verification failed:", err);
      alert("⚠️ Network error during login. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserRole('Salesperson');
    setCurrentUserName('Guest Viewer');
    localStorage.removeItem('namah_logged_in');
    localStorage.removeItem('namah_user_role');
    localStorage.removeItem('namah_user_name');
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          imageBase64: reader.result,
          productImageLink: reader.result,
          imagePreviewLocal: localUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Prioritize imageBase64 so Google Apps Script receives the actual file data to upload to Drive
      const submissionData = {
        ...formData,
        productImageLink: formData.imageBase64 || formData.imagePreviewLocal || ''
      };

      const payload = new URLSearchParams();
      Object.keys(submissionData).forEach(key => {
        payload.append(key, submissionData[key] || '');
      });

      const optimisticNewOrder = {
        ...submissionData,
        isOn: false,
        productStatus: '',
        placingStatus: false,
        karigarName: ''
      };

      setOrders(prev => [optimisticNewOrder, ...prev]);

      await fetch(GOOGLE_SHEETS_API_URL, {
        method: "POST",
        body: payload
      });

      alert("Sales Order saved successfully!");
      setTimeout(() => {
        fetchOrdersFromSheet();
      }, 1500);

      setActiveTab('orders');
      setFormData({
        customerName: '',
        contactNumber: '',
        orderType: '',
        orderSheetNo: '',
        salesPerson: '',
        jewelleryItem: '',
        tagNumber: '',
        productImageLink: '',
        imageBase64: '',
        imagePreviewLocal: '',
        goldWeight: '',
        diamondWeight: '',
        colorTone: '',
        colorStone: '',
        size: '',
        purity: '',
        orderDescription: '',
        orderTakenDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        orderPerson: '',
        specialRemarks: ''
      });
    } catch (err) {
      console.error("Failed to submit order:", err);
      alert("Order submission sent. Please verify Google Sheet.");
      fetchOrdersFromSheet();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOrderSwitch = async (targetOrder) => {
    if (!isAuthorizedToEdit) {
      alert("🔒 Access Restricted: Please login as Admin or Order Desk (Amardeep / Gautam) to modify orders.");
      return;
    }

    const isAssigned = targetOrder.karigarName || (targetOrder.productStatus && !targetOrder.productStatus.includes('Not Assign') && targetOrder.productStatus !== '');
    if (!isAssigned) {
      alert("🔒 Cannot turn ON: Order is not yet assigned to a Karigar.");
      return;
    }

    const newIsOn = !targetOrder.isOn;

    setOrders(prev => prev.map(o => 
      (o.orderSheetNo === targetOrder.orderSheetNo && o.tagNumber === targetOrder.tagNumber)
        ? { ...o, isOn: newIsOn }
        : o
    ));

    try {
      const payload = new URLSearchParams();
      payload.append('action', 'toggleOrder');
      payload.append('orderSheetNo', targetOrder.orderSheetNo);
      payload.append('tagNumber', targetOrder.tagNumber);
      payload.append('isOn', newIsOn ? 'ON' : 'OFF');

      await fetch(GOOGLE_SHEETS_API_URL, {
        method: "POST",
        body: payload
      });
    } catch (err) {
      console.error("Failed to sync toggle status:", err);
    }
  };

  const handleStatusChange = async (orderSheetNo, tagNumber, newStatus) => {
    if (!isAuthorizedToEdit) {
      alert("🔒 Access Restricted: Please login as Admin or Order Desk to change product statuses.");
      return;
    }

    setOrders(prev => prev.map(o => 
      (o.orderSheetNo === orderSheetNo && o.tagNumber === tagNumber) 
        ? { ...o, productStatus: newStatus } 
        : o
    ));

    try {
      const payload = new URLSearchParams();
      payload.append('action', 'updateStatus');
      payload.append('orderSheetNo', orderSheetNo);
      payload.append('tagNumber', tagNumber);
      payload.append('productStatus', newStatus);

      await fetch(GOOGLE_SHEETS_API_URL, {
        method: "POST",
        body: payload
      });
    } catch (err) {
      console.error("Failed to update product status:", err);
    }
  };

  const handleKarigarSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorizedToEdit) {
      alert("🔒 Access Restricted: Please login as Admin or Order Desk to assign orders to karigars.");
      return;
    }

    const data = new FormData(e.target);
    const updatedOrder = {
      ...selectedOrderForKarigar,
      karigarName: data.get('karigarName'),
      karigarDod: extractDateOnly(data.get('karigarDod')),
      goldWeight: data.get('goldWeight'),
      diamondWeight: data.get('diamondWeight'),
      colorTone: data.get('colorTone'),
      purity: data.get('purity'),
      size: data.get('size'),
      orderDescription: data.get('orderDescription'),
      alterationDetails: data.get('alterationDetails'),
      placingStatus: true,
      isOn: true,
      productStatus: 'Under Process'
    };

    setOrders(prev => prev.map(o => (o.orderSheetNo === updatedOrder.orderSheetNo && o.tagNumber === updatedOrder.tagNumber) ? updatedOrder : o));
    setSelectedOrderForKarigar(null);
    setWhatsappModalData(updatedOrder);

    try {
      const params = new URLSearchParams({
        action: 'updateKarigar',
        orderSheetNo: updatedOrder.orderSheetNo || '',
        customerName: updatedOrder.customerName || '',
        contactNumber: updatedOrder.contactNumber || '',
        jewelleryItem: updatedOrder.jewelleryItem || '',
        tagNumber: updatedOrder.tagNumber || '',
        karigarName: updatedOrder.karigarName || '',
        goldWeight: updatedOrder.goldWeight || '',
        diamondWeight: updatedOrder.diamondWeight || '',
        colorTone: updatedOrder.colorTone || '',
        purity: updatedOrder.purity || '',
        size: updatedOrder.size || '',
        orderDescription: updatedOrder.orderDescription || '',
        karigarDod: extractDateOnly(updatedOrder.karigarDod) || '',
        alterationDetails: updatedOrder.alterationDetails || ''
      });

      await fetch(`${GOOGLE_SHEETS_API_URL}?${params.toString()}`, {
        method: "GET"
      });

      setTimeout(() => {
        fetchOrdersFromSheet();
      }, 2000);
    } catch (err) {
      console.error("Error saving Karigar Work Order:", err);
    }
  };

  const exportCSV = () => {
    const headers = "Order Sheet,Tag Number,Customer,Contact,Item,Purity,Gold Wt,Diamond Wt,Sales,Executive,Status\n";
    const rows = orders.map(o => `${o.orderSheetNo},${o.tagNumber},${o.customerName},${o.contactNumber},${o.jewelleryItem},${o.purity},${o.goldWeight},${o.diamondWeight},${o.salesPerson},${o.orderPerson},${o.productStatus}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Namah_Jewellers_Orders.csv';
    a.click();
  };

  const buildWhatsAppMessage = (order) => {
    let msg = `*Karigar Work Order*\n\n` +
      `🔢 *Order Sheet:* ${order.orderSheetNo || 'N/A'}\n` +
      `💍 *Jewellery Item:* ${order.jewelleryItem || 'N/A'}\n` +
      `🏷️ *Tag Number:* ${order.tagNumber || 'N/A'}\n` +
      `🛠️ *Karigar:* ${order.karigarName || 'N/A'}\n`;

    if (order.goldWeight) msg += `🟡 *Gold Weight:* ${order.goldWeight}g\n`;
    if (order.diamondWeight) msg += `💎 *Diamond Weight:* ${order.diamondWeight}ct\n`;
    if (order.colorTone) msg += `🎨 *Color Tone:* ${order.colorTone}\n`;
    if (order.purity) msg += `✨ *Purity:* ${order.purity}\n`;
    if (order.size) msg += `📏 *Size:* ${order.size}\n`;
    if (order.orderDescription) msg += `📝 *Order Description:* ${order.orderDescription}\n`;
    if (order.alterationDetails) msg += `🔄 *Alternation If Any:* ${order.alterationDetails}\n`;
    
    msg += `⏱️ *Karigar DOD:* ${extractDateOnly(order.karigarDod)}\n\n` +
      `📷 *Image URL:* ${formatDriveUrl(order)}`;

    return msg;
  };

  const uniqueCustomers = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!o.customerName) return;
      const key = o.contactNumber || o.customerName;
      if (!map[key]) {
        map[key] = {
          customerName: o.customerName,
          contactNumber: o.contactNumber || 'N/A',
          ordersCount: 0,
          salesPersons: new Set(),
          ordersList: []
        };
      }
      map[key].ordersCount += 1;
      if (o.salesPerson) map[key].salesPersons.add(o.salesPerson);
      map[key].ordersList.push(o);
    });
    return Object.values(map);
  }, [orders]);

  const activeKarigarOrders = useMemo(() => {
    return orders.filter(o => {
      const isDelivered = (o.orderStatus || '').toLowerCase() === 'delivered' || (o.productStatus || '').toLowerCase() === 'delivered';
      const pStatus = (o.productStatus || '').toLowerCase();
      return !isDelivered && o.isOn && (pStatus.includes('process') || pStatus === 'assigned' || pStatus === '' || pStatus.includes('not assign'));
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if ((order.orderStatus || '').toLowerCase() === 'delivered' || (order.productStatus || '').toLowerCase() === 'delivered') {
        return false;
      }

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (order.customerName && order.customerName.toLowerCase().includes(q)) ||
        (order.orderSheetNo && order.orderSheetNo.toLowerCase().includes(q)) ||
        (order.tagNumber && order.tagNumber.toLowerCase().includes(q)) ||
        (order.jewelleryItem && order.jewelleryItem.toLowerCase().includes(q)) ||
        (order.contactNumber && order.contactNumber.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filterSalesperson !== 'ALL' && order.salesPerson !== filterSalesperson) return false;
      if (filterExecutive !== 'ALL' && order.orderPerson !== filterExecutive) return false;
      if (filterWorkType !== 'ALL' && (order.orderType || '').toUpperCase() !== filterWorkType) return false;
      
      if (filterStatus !== 'ALL') {
        const pStatus = (order.productStatus || '--Not Assign--').toLowerCase();
        if (filterStatus === 'Under Process') {
          if (!(order.isOn && (pStatus.includes('process') || pStatus === 'assigned' || pStatus === '' || pStatus.includes('not assign')))) {
            return false;
          }
        } else if (filterStatus === 'Ready but bill pending') {
          if (!(order.isOn && (pStatus === 'ready but bill pending' || pStatus.includes('bill pending')))) {
            return false;
          }
        } else if (filterStatus === 'Packed') {
          if (!(order.isOn && pStatus === 'packed')) {
            return false;
          }
        } else if (pStatus !== filterStatus.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, filterSalesperson, filterExecutive, filterWorkType, filterStatus]);

  const offOrders = useMemo(() => {
    return orders.filter(order => {
      if ((order.orderStatus || '').toLowerCase() === 'delivered' || (order.productStatus || '').toLowerCase() === 'delivered') {
        return false;
      }
      return !order.isOn;
    });
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#111318] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-16 md:pb-0">
      <header className="bg-[#181b22]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between sticky top-0 z-30 shadow-2xl gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
                NAMAH JEWELLERS
              </h1>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isLoggedIn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`}></span>
                Mode: <strong className="text-amber-400">{isLoggedIn ? `${currentUserName} (${currentUserRole})` : 'View-Only Mode'}</strong>
              </p>
            </div>
          </div>

          <div className="flex sm:hidden items-center">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-xl text-xs font-bold"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md"
              >
                <LogIn className="w-3.5 h-3.5" /> Login
              </button>
            )}
          </div>
        </div>

        <nav className="flex bg-[#111317] p-1.5 rounded-2xl border border-slate-800/80 shadow-inner overflow-x-auto w-full sm:w-auto justify-start sm:justify-center">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Orders
          </button>
          <button
            onClick={() => setActiveTab('off-orders')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'off-orders'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PowerOff className="w-3.5 h-3.5" /> OFF Orders ({offOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'crm'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> CRM
          </button>
          <button
            onClick={() => setActiveTab('karigar')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'karigar'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Karigar ({activeKarigarOrders.length})
          </button>
          
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="bg-[#111317] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-slate-200 font-bold">{currentUserName} ({currentUserRole})</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-950" /> LOGIN
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-[1450px] w-full mx-auto space-y-6">
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div 
                onClick={() => setFilterStatus('ALL')}
                className="bg-[#181b22] border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xl cursor-pointer hover:border-amber-500/50 transition-all"
              >
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active</p>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {orders.filter(o => (o.orderStatus || '').toLowerCase() !== 'delivered' && (o.productStatus || '').toLowerCase() !== 'delivered').length}
                  </h3>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div 
                onClick={() => setFilterStatus('Under Process')}
                className={`bg-[#181b22] border rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xl cursor-pointer transition-all ${filterStatus === 'Under Process' ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800/90 hover:border-amber-500/50'}`}
              >
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Under Process</p>
                  <h3 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                    {orders.filter(o => {
                      if ((o.orderStatus || '').toLowerCase() === 'delivered' || (o.productStatus || '').toLowerCase() === 'delivered') return false;
                      const pStatus = (o.productStatus || '').toLowerCase();
                      return o.isOn && (pStatus.includes('process') || pStatus === 'assigned' || pStatus === '' || pStatus.includes('not assign'));
                    }).length}
                  </h3>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div 
                onClick={() => setFilterStatus('Ready but bill pending')}
                className={`bg-[#181b22] border rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xl cursor-pointer transition-all ${filterStatus === 'Ready but bill pending' ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800/90 hover:border-emerald-500/50'}`}
              >
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ready but bill pending</p>
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                    {orders.filter(o => {
                      if ((o.orderStatus || '').toLowerCase() === 'delivered' || (o.productStatus || '').toLowerCase() === 'delivered') return false;
                      const pStatus = (o.productStatus || '').toLowerCase();
                      return o.isOn && (pStatus === 'ready but bill pending' || pStatus.includes('bill pending'));
                    }).length}
                  </h3>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div 
                onClick={() => setFilterStatus('Packed')}
                className={`bg-[#181b22] border rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xl cursor-pointer transition-all ${filterStatus === 'Packed' ? 'border-purple-500 bg-purple-500/5' : 'border-slate-800/90 hover:border-purple-500/50'}`}
              >
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Packed</p>
                  <h3 className="text-xl sm:text-2xl font-black text-purple-400 mt-1">
                    {orders.filter(o => {
                      if ((o.orderStatus || '').toLowerCase() === 'delivered' || (o.productStatus || '').toLowerCase() === 'delivered') return false;
                      const pStatus = (o.productStatus || '').toLowerCase();
                      return o.isOn && pStatus === 'packed';
                    }).length}
                  </h3>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>

            <div className="bg-[#181b22] border border-slate-800/90 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-2xl">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={exportCSV}
                  className="bg-[#222630] hover:bg-[#2c3240] text-slate-300 border border-slate-700/80 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-400" /> Export CSV
                </button>

                <button
                  onClick={() => setActiveTab('new-order')}
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-slate-950" /> Sales Order Intake
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-end text-xs">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Order, Tag, Customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111318] border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-[#111318] border border-slate-700/80 rounded-xl px-3 py-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400 text-[11px]">Sales:</span>
                  <select
                    value={filterSalesperson}
                    onChange={(e) => setFilterSalesperson(e.target.value)}
                    className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-[#181b22]">All Sales</option>
                    {['Sohil', 'Mohit', 'Hema', 'Akansha', 'Yogita', 'Ziya', 'Deepika'].map(s => (
                      <option key={s} value={s} className="bg-[#181b22]">{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-[#111318] border border-slate-700/80 rounded-xl px-3 py-1.5">
                  <span className="text-slate-400 text-[11px]">Desk:</span>
                  <select
                    value={filterExecutive}
                    onChange={(e) => setFilterExecutive(e.target.value)}
                    className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-[#181b22]">All Execs</option>
                    <option value="Amardeep" className="bg-[#181b22]">Amardeep</option>
                    <option value="Gautam" className="bg-[#181b22]">Gautam</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-[#111318] border border-slate-700/80 rounded-xl px-3 py-1.5">
                  <span className="text-slate-400 text-[11px]">Status:</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-[#181b22]">All Status</option>
                    <option value="Under Process" className="bg-[#181b22]">Under Process</option>
                    <option value="Ready but bill pending" className="bg-[#181b22]">Ready but bill pending</option>
                    <option value="Packed" className="bg-[#181b22]">Packed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#181b22] border border-slate-800/90 rounded-2xl overflow-x-auto shadow-2xl">
              <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[950px]">
                <thead className="bg-[#121419] text-amber-500/90 uppercase font-black tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-4 w-20">IMAGE</th>
                    <th className="p-4">ORDER SHEET / TAG</th>
                    <th className="p-4">CUSTOMER & SALES</th>
                    <th className="p-4">JEWELLERY SPECS</th>
                    <th className="p-4">ORDER EXECUTIVE</th>
                    <th className="p-4">PLACE ORDER ➔</th>
                    <th className="p-4 text-center">ON/OFF</th>
                    <th className="p-4">PRODUCT STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-slate-500 text-sm font-medium">
                        {loading ? (
                          <div className="flex items-center justify-center gap-2 text-amber-400">
                            <Clock className="w-4 h-4 animate-spin" /> Syncing with Google Sheets...
                          </div>
                        ) : (
                          'No orders found matching selected filters.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, idx) => {
                      const isAssigned = order.karigarName || (order.productStatus && !order.productStatus.includes('Not Assign') && order.productStatus !== '');
                      return (
                        <tr key={idx} className="hover:bg-[#20242e]/60 transition-all group">
                          <td className="p-4">
                            {formatDriveUrl(order) ? (
                              <img
                                src={formatDriveUrl(order)}
                                alt=""
                                onClick={() => setPreviewImage(formatDriveUrl(order))}
                                className="w-14 h-14 rounded-xl object-cover bg-slate-900 border border-slate-700/60 shadow-md group-hover:scale-105 transition-transform cursor-pointer"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-[#212530] rounded-xl flex flex-col items-center justify-center border border-slate-700/60 text-slate-500 text-[10px] font-semibold">
                                <span>Product</span>
                              </div>
                            )}
                          </td>

                          <td className="p-4 space-y-1">
                            <h4 className="text-sm font-black text-amber-400 tracking-wide">
                              {order.orderSheetNo || `NJ-2026-00${idx + 1}`}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {order.tagNumber || 'TAG-8821'}
                            </p>
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              (order.orderType || '').toUpperCase() === 'CUSTOMIZATION'
                                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                                : (order.orderType || '').toUpperCase() === 'REPAIR'
                                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {order.orderType || 'NEW'}
                            </span>
                          </td>

                          <td className="p-4 space-y-0.5">
                            <h4 className="text-sm font-bold text-slate-100">
                              {order.customerName || 'Sanjay Agarwal'}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {order.contactNumber || '+91 98765 12345'}
                            </p>
                            <p className="text-[11px] font-bold text-amber-400/90 pt-0.5">
                              Sales: {order.salesPerson || 'Sohil'}
                            </p>
                          </td>

                          <td className="p-4 space-y-1">
  <div className="flex items-center gap-1.5">
    <span className="font-bold text-slate-200 text-sm">{order.jewelleryItem || 'Necklace'}</span>
    {order.purity && <span className="text-[11px] font-black text-amber-300">({order.purity})</span>}
  </div>
  <div className="text-[11px] text-slate-300 space-x-1">
    {order.goldWeight && <span>Gold: <strong className="text-amber-400 font-bold">{order.goldWeight}g</strong></span>}
    {order.goldWeight && order.diamondWeight && <span className="text-slate-600">|</span>}
    {order.diamondWeight && <span>Dia: <strong className="text-amber-400 font-bold">{order.diamondWeight}ct</strong></span>}
  </div>
  <p className="text-[11px] text-slate-400">
    {order.colorTone || ''} {order.size ? `| Size: ${order.size}` : ''}
  </p>
  
  {/* Added Order Description */}
  {/* Added Order Description with text wrap */}
{/* Added Order Description with text wrap */}
<div className="mt-1 text-xs text-amber-300/90 pt-1 border-t border-slate-800 break-words whitespace-normal max-w-[280px]">
  <span className="font-medium text-amber-400">ORDER DESCRIPTION - </span>
  <span className="text-gray-300">{order.orderDescription || order.remarks || '--'}</span>
</div>

{/* Added Daily Remarks */}
<div className="mt-1 text-xs text-purple-300/90 pt-1 border-t border-slate-800/60 break-words whitespace-normal max-w-[280px]">
  <span className="font-medium text-purple-400">DAILY REMARKS - </span>
  <span className="text-gray-300">{order.dailyRemarks || '--'}</span>
</div>
</td>

                          <td className="p-4">
                            <span className="px-3 py-1.5 rounded-xl bg-[#232d42] text-blue-300 border border-blue-500/30 text-xs font-bold inline-block">
                              {order.orderPerson || 'Amardeep'}
                            </span>
                          </td>

                          <td className="p-4">
                        {(() => {
                          const productStatus = (order.productStatus || "").toLowerCase();
                          const karigarName = order.karigarName || order.KarigarName || "Not Assigned";
                          const karigarDOD = order.karigarDod || order.karigarDOD || "";

                          if (!isAssigned || productStatus.includes('not assign') || productStatus === '') {
                            return (
                              <button
                                onClick={() => {
                                  if (!isAuthorizedToEdit) {
                                    alert("🔒 Restricted: Please login as Admin or Order Desk to place orders.");
                                    return;
                                  }
                                  setSelectedOrderForKarigar(order);
                                }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                                  isAuthorizedToEdit
                                    ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                                    : 'text-slate-500 bg-slate-900 border-slate-800 opacity-70'
                                }`}
                              >
                                Place order
                              </button>
                            );
                          } else if (productStatus.includes("ready but bill pending") || productStatus.includes("bill pending")) {
                            return (
                              <div className="px-3 py-1.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs font-bold text-center">
                                Received from Karigar<br />
                                <span className="text-[10px] font-normal opacity-90">{karigarName}</span>
                              </div>
                            );
                          } else if (productStatus.includes("packed") || productStatus.includes("dispatch")) {
                            return (
                              <div className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold text-center">
                                Ready to Dispatch
                              </div>
                            );
                          } else {
                            return (
                              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
                                Assigned to Karigar<br />
                                <span className="text-[10px] font-normal opacity-90">{karigarName}</span>
                                {karigarDOD && <><br /><span className="text-[10px] font-normal opacity-95">DOD: {extractDateOnly(karigarDOD)}</span></>}
                              </div>
                            );
                          }
                        })()}
                      </td>

                          <td className="p-4 text-center">
                            <button
                              disabled={!isAssigned || !isAuthorizedToEdit}
                              onClick={() => isAssigned && isAuthorizedToEdit && toggleOrderSwitch(order)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                !isAssigned || !isAuthorizedToEdit
                                  ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                  : order.isOn
                                  ? 'bg-[#13231f] border-emerald-500/40 text-emerald-400 cursor-pointer'
                                  : 'bg-slate-900 border-slate-700 text-slate-500 cursor-pointer'
                              }`}
                            >
                              {isAssigned && order.isOn ? (
                                <>
                                  <ToggleRight className="w-4 h-4 text-emerald-400" />
                                  <span>ON</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4 text-slate-500" />
                                  <span>OFF</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="p-4">
                            {isAssigned && order.isOn && isAuthorizedToEdit ? (
                              <select
                                value={order.productStatus || 'Under Process'}
                                onChange={(e) => handleStatusChange(order.orderSheetNo, order.tagNumber, e.target.value)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border focus:outline-none bg-amber-900/30 text-amber-300 border-amber-600/40"
                              >
                                <option value="Under Process" className="bg-[#181b22] text-amber-300">Under Process</option>
                                <option value="Ready but bill pending" className="bg-[#181b22] text-emerald-300">Ready but bill pending</option>
                                <option value="Packed" className="bg-[#181b22] text-purple-300">Packed</option>
                              </select>
                            ) : (
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border whitespace-nowrap inline-block ${
                                !isAssigned || order.productStatus === '' || order.productStatus.includes('Not Assign')
                                  ? 'bg-slate-900/60 text-slate-400 border-slate-700/60'
                                  : (order.productStatus || '').toLowerCase() === 'packed'
                                  ? 'bg-purple-900/20 text-purple-300 border-purple-600/30'
                                  : (order.productStatus || '').toLowerCase().includes('bill pending')
                                  ? 'bg-emerald-900/20 text-emerald-300 border-emerald-600/30'
                                  : 'bg-amber-900/20 text-amber-300 border-amber-600/30'
                              }`}>
                                {isAssigned && order.productStatus && !order.productStatus.includes('Not Assign') ? order.productStatus : '--Not Assign--'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'off-orders' && (
          <div className="bg-[#181b22] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <PowerOff className="w-5 h-5" /> OFF Orders List
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Review all orders with the toggle currently turned OFF.</p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold">
                Total OFF Orders: {offOrders.length}
              </span>
            </div>

            <div className="bg-[#181b22] border border-slate-800/90 rounded-2xl overflow-x-auto shadow-2xl">
              <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[950px]">
                <thead className="bg-[#121419] text-amber-500/90 uppercase font-black tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-4 w-20">IMAGE</th>
                    <th className="p-4">ORDER SHEET / TAG</th>
                    <th className="p-4">CUSTOMER & SALES</th>
                    <th className="p-4">JEWELLERY SPECS</th>
                    <th className="p-4">ORDER EXECUTIVE</th>
                    <th className="p-4">PLACE ORDER ➔</th>
                    <th className="p-4 text-center">ON/OFF TOGGLE</th>
                    <th className="p-4">PRODUCT STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {offOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-slate-500 text-sm font-medium">
                        No OFF orders found.
                      </td>
                    </tr>
                  ) : (
                    offOrders.map((order, idx) => {
                      const isAssigned = order.karigarName || (order.productStatus && !order.productStatus.includes('Not Assign') && order.productStatus !== '');
                      return (
                        <tr key={idx} className="hover:bg-[#20242e]/60 transition-all group">
                          <td className="p-4">
                            {formatDriveUrl(order) ? (
                              <img src={formatDriveUrl(order)} alt="" onClick={() => setPreviewImage(formatDriveUrl(order))} className="w-14 h-14 rounded-xl object-cover bg-slate-900 border border-slate-700/60 shadow-md cursor-pointer" />
                            ) : (
                              <div className="w-14 h-14 bg-[#212530] rounded-xl flex items-center justify-center border border-slate-700/60 text-slate-500 text-[10px]">Product</div>
                            )}
                          </td>
                          <td className="p-4 space-y-1">
                            <h4 className="text-sm font-black text-amber-400">{order.orderSheetNo}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">{order.tagNumber}</p>
                          </td>
                          <td className="p-4 space-y-0.5">
                            <h4 className="text-sm font-bold text-slate-100">{order.customerName}</h4>
                            <p className="text-[11px] text-slate-400">{order.contactNumber}</p>
                            <p className="text-[11px] font-bold text-amber-400">Sales: {order.salesPerson}</p>
                          </td>
                          <td className="p-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200 text-sm">{order.jewelleryItem || 'Necklace'}</span>
                            {order.purity && <span className="text-[11px] font-black text-amber-300">({order.purity})</span>}
                          </div>
                          <div className="text-[11px] text-slate-300 space-x-1">
                            {order.goldWeight && <span>Gold: <strong className="text-amber-400 font-bold">{order.goldWeight}g</strong></span>}
                            {order.goldWeight && order.diamondWeight && <span className="text-slate-600">|</span>}
                            {order.diamondWeight && <span>Dia: <strong className="text-amber-400 font-bold">{order.diamondWeight}ct</strong></span>}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {order.colorTone || ''} {order.size ? `| Size: ${order.size}` : ''}
                          </p>
                          
                          {/* Order Description */}
                          <div className="mt-1 text-xs text-amber-300/90 pt-1 border-t border-slate-800 break-words whitespace-normal max-w-[280px]">
                            <span className="font-medium text-amber-400">ORDER DESCRIPTION - </span>
                            <span className="text-gray-300">{order.orderDescription || order.remarks || '--'}</span>
                          </div>

                          {/* Daily Remarks */}
                          <div className="mt-1 text-xs text-purple-300/90 pt-1 border-t border-slate-800/60 break-words whitespace-normal max-w-[280px]">
                            <span className="font-medium text-purple-400">DAILY REMARKS - </span>
                            <span className="text-gray-300">{order.dailyRemarks || '--'}</span>
                          </div>
                        </td>
                          <td className="p-4">
                            <span className="px-3 py-1.5 rounded-xl bg-[#232d42] text-blue-300 border border-blue-500/30 text-xs font-bold inline-block">
                              {order.orderPerson || 'Amardeep'}
                            </span>
                          </td>
                          <td className="p-4">
                            {!isAssigned ? (
                              <button
                                onClick={() => {
                                  if (!isAuthorizedToEdit) {
                                    alert("🔒 Restricted: Please login as Admin or Order Desk to place orders.");
                                    return;
                                  }
                                  setSelectedOrderForKarigar(order);
                                }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                                  isAuthorizedToEdit
                                    ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                                    : 'text-slate-500 bg-slate-900 border-slate-800 opacity-70'
                                }`}
                              >
                                Place order
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 inline-flex items-center gap-1.5 select-none cursor-default">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Assigned to Karigar</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              disabled={!isAssigned || !isAuthorizedToEdit}
                              onClick={() => isAssigned && isAuthorizedToEdit && toggleOrderSwitch(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-slate-900 border-slate-700 text-slate-500 cursor-pointer"
                            >
                              <ToggleLeft className="w-4 h-4 text-slate-500" />
                              <span>OFF</span>
                            </button>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border whitespace-nowrap inline-block ${
                              !isAssigned || order.productStatus === '' || order.productStatus.includes('Not Assign')
                                ? 'bg-slate-900/60 text-slate-400 border-slate-700/60'
                                : (order.productStatus || '').toLowerCase() === 'packed'
                                ? 'bg-purple-900/20 text-purple-300 border-purple-600/30'
                                : (order.productStatus || '').toLowerCase().includes('bill pending')
                                ? 'bg-emerald-900/20 text-emerald-300 border-emerald-600/30'
                                : 'bg-amber-900/20 text-amber-300 border-amber-600/30'
                            }`}>
                              {isAssigned && order.productStatus && !order.productStatus.includes('Not Assign') ? order.productStatus : '--Not Assign--'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'crm' && (
          <div className="bg-[#181b22] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <Users className="w-5 h-5" /> Client Directory & CRM History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage customer profiles, contact numbers, and complete order histories.</p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold">
                Total Unique Clients: {uniqueCustomers.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {uniqueCustomers.map((client, idx) => (
                <div key={idx} className="bg-[#111318] border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-xl hover:border-amber-500/40 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-slate-100">{client.customerName}</h4>
                      <p className="text-xs text-amber-400 font-mono mt-0.5">{client.contactNumber}</p>
                    </div>
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold">
                      {client.ordersCount} Order(s)
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <p>Associated Sales: <strong className="text-slate-200">{Array.from(client.salesPersons).join(', ')}</strong></p>
                  </div>

                  <button
                    onClick={() => setSelectedCustomerCRM(client)}
                    className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    View Client Purchase History
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'new-order' && (
          <div className="bg-[#181b22] border border-slate-800/90 rounded-2xl p-4 sm:p-6 max-w-4xl mx-auto shadow-2xl">
            <div className="border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <PlusCircle className="w-6 h-6" /> Sales Order Intake
              </h2>
              <p className="text-xs text-slate-400 mt-1">Sales team can enter new customer orders directly from mobile or desktop.</p>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sales Person Name *</label>
                  <select
                    required
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 cursor-pointer"
                    value={formData.salesPerson}
                    onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                  >
                    <option value="" disabled>Select Salesperson</option>
                    {['Sohil', 'Mohit', 'Hema', 'Akansha', 'Yogita', 'Ziya', 'Deepika'].map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Order Support Person *</label>
                  <select
                    required
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 cursor-pointer"
                    value={formData.orderPerson}
                    onChange={(e) => setFormData({ ...formData, orderPerson: e.target.value })}
                  >
                    <option value="" disabled>Select Executive</option>
                    <option value="Amardeep">Amardeep</option>
                    <option value="Gautam">Gautam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Order Type *</label>
                  <select
                    required
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 cursor-pointer"
                    value={formData.orderType}
                    onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                  >
                    <option value="" disabled>Select Order Type</option>
                    <option value="NEW">NEW</option>
                    <option value="REPAIR">REPAIR</option>
                    <option value="CUSTOMIZATION">CUSTOMIZATION</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name"
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Number</label>
                  <input
                    type="text"
                    placeholder="Enter contact number"
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Order Sheet Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NJ-2026-004"
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.orderSheetNo}
                    onChange={(e) => setFormData({ ...formData, orderSheetNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-[#111318] border border-slate-800/80 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-amber-400 uppercase">
                  📷 Product Photo Capture (Direct Camera / Upload)
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg">
                    <Camera className="w-4 h-4" /> Click / Take Photo
                    <input 
  type="file" 
  accept="image/*" 
  onChange={handleImageCapture} 
  className="hidden" 
/>
                  </label>
                  {formData.imagePreviewLocal && (
                    <img src={formData.imagePreviewLocal} alt="" onClick={() => setPreviewImage(formData.imagePreviewLocal)} className="w-12 h-12 rounded-lg object-cover border border-amber-500 cursor-pointer" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jewellery Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Necklace, Bangle, Ring"
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.jewelleryItem}
                    onChange={(e) => setFormData({ ...formData, jewelleryItem: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tag Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TAG-8821"
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.tagNumber}
                    onChange={(e) => setFormData({ ...formData, tagNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-[#111318] border border-slate-800/80 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase">Gold & Diamond Specifications</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Gold Wt (g)</label>
                    <input
                      type="text"
                      placeholder="e.g. 45.2"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                      value={formData.goldWeight}
                      onChange={(e) => setFormData({ ...formData, goldWeight: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Diamond Wt (ct)</label>
                    <input
                      type="text"
                      placeholder="e.g. 2.15"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                      value={formData.diamondWeight}
                      onChange={(e) => setFormData({ ...formData, diamondWeight: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Gold Purity *</label>
                    <select
                      required
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-sm text-slate-200 cursor-pointer"
                      value={formData.purity}
                      onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                    >
                      <option value="" disabled>Select Purity</option>
                      <option value="22kt">22kt Gold</option>
                      <option value="18kt">18kt Gold</option>
                      <option value="14kt">14kt Gold</option>
                      <option value="9kt">9kt Gold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Color Tone</label>
                    <input
                      type="text"
                      placeholder="e.g. Yellow Gold"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                      value={formData.colorTone}
                      onChange={(e) => setFormData({ ...formData, colorTone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Size (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 16 inch / 2.4"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Order Description *</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Enter order details..."
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.orderDescription}
                    onChange={(e) => setFormData({ ...formData, orderDescription: e.target.value })}
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Special Remarks</label>
                  <textarea
                    rows="3"
                    placeholder="Enter special remarks..."
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.specialRemarks}
                    onChange={(e) => setFormData({ ...formData, specialRemarks: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Order Taken Date</label>
                  <input
                    type="date"
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.orderTakenDate}
                    onChange={(e) => setFormData({ ...formData, orderTakenDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Promised Delivery Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {submitting ? 'Saving to Drive & Sheets...' : 'Save Order to Google Sheets'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'karigar' && (() => {
          const amardeepOrders = activeKarigarOrders.filter(o => (o.orderPerson || '').toLowerCase() === 'amardeep');
          const gautamOrders = activeKarigarOrders.filter(o => (o.orderPerson || '').toLowerCase() === 'gautam');
          const displayedKarigarOrders = karigarSubTab === 'Amardeep' ? amardeepOrders : gautamOrders;

          return (
            <div className="bg-[#181b22] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <Send className="w-5 h-5" /> Active Karigar Work Orders
                </h3>
                
                <div className="flex bg-[#111317] p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setKarigarSubTab('Amardeep')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      karigarSubTab === 'Amardeep'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Amardeep ({amardeepOrders.length})
                  </button>
                  <button
                    onClick={() => setKarigarSubTab('Gautam')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      karigarSubTab === 'Gautam'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Gautam ({gautamOrders.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {displayedKarigarOrders.length === 0 ? (
                  <div className="col-span-3 py-12 text-center text-slate-500 text-sm font-medium">
                    No active karigar orders found for {karigarSubTab}.
                  </div>
                ) : (
                  displayedKarigarOrders.map((order, idx) => (
                    <div key={idx} className="bg-[#111318] p-4 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-black text-amber-400">{order.orderSheetNo}</span>
                          <h4 className="text-sm font-bold text-slate-100">{order.jewelleryItem}</h4>
                        </div>
                        {formatDriveUrl(order) && (
                          <img src={formatDriveUrl(order)} alt="" onClick={() => setPreviewImage(formatDriveUrl(order))} className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-800 cursor-pointer" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400">Karigar: <strong className="text-amber-300">{order.karigarName || 'Unassigned'}</strong></p>
                      <p className="text-xs text-slate-400">Karigar DOD: <strong className="text-emerald-400">{extractDateOnly(order.karigarDod)}</strong></p>
                      <button onClick={() => setWhatsappModalData(order)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs w-full transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer">
                        <Send className="w-3.5 h-3.5" /> Send WhatsApp Slip
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}

        
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#181b22] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-400">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-md font-bold text-amber-400">Secure Access Login Required</h3>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Select Access Level</label>
                <select
                  className="w-full bg-[#111318] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  value={loginNameInput}
                  onChange={(e) => setLoginNameInput(e.target.value)}
                >
                  <option value="Admin">Admin</option>
                  <option value="Amardeep">Amardeep</option>
                  <option value="Gautam">Gautam</option>
                  <option value="Viewer">Read-Only View</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1.5 uppercase">Security PIN</label>
                <input
                  type="password"
                  placeholder="Enter security PIN..."
                  className="w-full bg-[#111318] border border-amber-500/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-400"
                  value={loginPinInput}
                  onChange={(e) => setLoginPinInput(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Authenticate & Open App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCustomerCRM && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181b22] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-md font-bold text-amber-400">{selectedCustomerCRM.customerName} - CRM Profile</h3>
                <p className="text-xs text-slate-400">Contact: {selectedCustomerCRM.contactNumber}</p>
              </div>
              <button onClick={() => setSelectedCustomerCRM(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Order History ({selectedCustomerCRM.ordersList.length})</h4>
              <div className="space-y-2">
                {selectedCustomerCRM.ordersList.map((ord, i) => (
                  <div key={i} className="bg-[#111318] border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-amber-400">{ord.orderSheetNo} - {ord.jewelleryItem}</p>
                      <p className="text-[11px] text-slate-400">Tag: {ord.tagNumber} | Salesperson: {ord.salesPerson}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg border font-bold text-xs ${
                      !ord.productStatus || ord.productStatus.includes('Not Assign')
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : ord.productStatus.toLowerCase() === 'packed'
                        ? 'bg-purple-900/20 text-purple-300 border-purple-600/30'
                        : ord.productStatus.toLowerCase().includes('bill pending')
                        ? 'bg-emerald-900/20 text-emerald-300 border-emerald-600/30'
                        : 'bg-amber-900/20 text-amber-300 border-amber-600/30'
                    }`}>
                      {ord.productStatus && !ord.productStatus.includes('Not Assign') ? ord.productStatus : '--Not Assign--'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button onClick={() => setSelectedCustomerCRM(null)} className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer">Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {selectedOrderForKarigar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181b22] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-md font-bold text-amber-400">
                {selectedOrderForKarigar.karigarName ? 'Update Karigar Placing Details' : 'Assign Order to Karigar'}
              </h3>
              <button onClick={() => setSelectedOrderForKarigar(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleKarigarSubmit} className="space-y-4">
              <div className="p-3 bg-[#111318] rounded-xl text-xs text-slate-300 space-y-1">
                <p><strong className="text-amber-400">Order Sheet:</strong> {selectedOrderForKarigar.orderSheetNo}</p>
                <p><strong className="text-amber-400">Tag Number:</strong> {selectedOrderForKarigar.tagNumber}</p>
                <p><strong className="text-amber-400">Jewellery Item:</strong> {selectedOrderForKarigar.jewelleryItem}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Karigar Name *</label>
                  <input
                    type="text"
                    required
                    name="karigarName"
                    defaultValue={selectedOrderForKarigar.karigarName || ''}
                    placeholder="e.g. Craftsman Vijay"
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Karigar Delivery Date (DOD) *</label>
                  <input
                    type="date"
                    required
                    name="karigarDod"
                    defaultValue={extractDateOnly(selectedOrderForKarigar.karigarDod) || ''}
                    className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#111318] border border-slate-800/80 rounded-xl space-y-3">
                <h4 className="text-[11px] font-bold text-amber-400 uppercase">Review / Override Specifications for Karigar</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Gold Weight (g)</label>
                    <input
                      type="text"
                      name="goldWeight"
                      defaultValue={selectedOrderForKarigar.goldWeight || ''}
                      placeholder="e.g. 45.2"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Diamond Weight (ct)</label>
                    <input
                      type="text"
                      name="diamondWeight"
                      defaultValue={selectedOrderForKarigar.diamondWeight || ''}
                      placeholder="e.g. 2.15"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Purity</label>
                    <select
                      name="purity"
                      defaultValue={selectedOrderForKarigar.purity || ''}
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="" disabled>Select Purity</option>
                      <option value="22kt">22kt</option>
                      <option value="18kt">18kt</option>
                      <option value="14kt">14kt</option>
                      <option value="9kt">9kt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Color Tone</label>
                    <input
                      type="text"
                      name="colorTone"
                      defaultValue={selectedOrderForKarigar.colorTone || ''}
                      placeholder="e.g. Yellow Gold"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Size</label>
                    <input
                      type="text"
                      name="size"
                      defaultValue={selectedOrderForKarigar.size || ''}
                      placeholder="e.g. 16 inch"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Order Description</label>
                  <textarea
                    name="orderDescription"
                    rows="2"
                    defaultValue={selectedOrderForKarigar.orderDescription || ''}
                    placeholder="Enter order description..."
                    className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  ></textarea>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Alteration Details / Special Instructions</label>
                <textarea
                  name="alterationDetails"
                  rows="2"
                  defaultValue={selectedOrderForKarigar.alterationDetails || ''}
                  placeholder="Instructions or alterations for karigar..."
                  className="w-full bg-[#111318] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setSelectedOrderForKarigar(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer">Save & Generate WhatsApp Slip</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {whatsappModalData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181b22] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-md font-bold text-emerald-400">WhatsApp Karigar Work Order</h3>
              <button onClick={() => setWhatsappModalData(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#111318] border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 whitespace-pre-wrap select-all">
              {buildWhatsAppMessage(whatsappModalData)}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildWhatsAppMessage(whatsappModalData));
                  alert("Message caption copied to clipboard!");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Message
              </button>
              <a
                href={'https://wa.me/?text=' + encodeURIComponent(buildWhatsAppMessage(whatsappModalData))}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" /> Open WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full border border-slate-700 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Instant Full-Size HD Preview (Pre-cached) */}
            <div className="relative flex items-center justify-center">
              <img 
                src={previewImage.includes('sz=') ? previewImage.replace(/sz=w\d+/, 'sz=w1200') : previewImage + '&sz=w1200'} 
                alt="Product Preview HD" 
                className="max-w-[85vw] max-h-[85vh] w-auto h-auto rounded-2xl object-contain border border-amber-500/50 shadow-2xl bg-slate-900"
                onClick={(e) => e.stopPropagation()} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}