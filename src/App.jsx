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
  PowerOff,
  RotateCcw
} from 'lucide-react';

const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzCUr7rdM-mOJ0xw9llzwPhO3aszIvC_FtJLNZ1ebWWoUUQ3qltPFTmrfHAJuZQsu1iWA/exec";

// Salesperson Phone Directory Lookup
const SALESPERSON_NUMBERS = {
  'Sohil': '9999629792',
  'Mohit': '9217714556',
  'Hema': '7042136377',
  'Akansha': '7042109377',
  'Yogita': '9217403201',
  'Deepika': '9217403202',
  'Ziya': '8368582277'
};

const ORDER_DEPARTMENT_NUMBER = '9217403206'; // Amardeep & Gautam

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

  // Dashboard specific local cross-filtering states
  const [dashboardSalesFilter, setDashboardSalesFilter] = useState('ALL');
  const [dashboardExecFilter, setDashboardExecFilter] = useState('ALL');
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState('ALL');

  const [selectedOrderForKarigar, setSelectedOrderForKarigar] = useState(null);
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [selectedCustomerCRM, setSelectedCustomerCRM] = useState(null);

  // New state for Suggestion #2: Success popup after submitting an item
  const [submittedOrderSuccessModal, setSubmittedOrderSuccessModal] = useState(false);
  const [lastSubmittedOrderData, setLastSubmittedOrderData] = useState(null);

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
    advanceAmount: '', // Added advance amount state
    orderDescription: '',
    orderTakenDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    orderPerson: '',
    specialRemarks: ''
  });

  const extractDateOnly = (dateStr) => {
    if (!dateStr) return 'N/A';
    const val = String(dateStr).trim();
    if (val.includes('Oct') || val.includes('Jan') || val.includes('Feb') || val.includes('Mar') || val.includes('Apr') || val.includes('May') || val.includes('Jun') || val.includes('Jul') || val.includes('Aug') || val.includes('Sep') || val.includes('Nov') || val.includes('Dec')) {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    if (val.includes('T')) return val.split('T')[0];
    if (val.includes(' ')) return val.split(' ')[0];
    return val;
  };

  const formatDriveUrl = (order) => {
    if (order.imagePreviewLocal) return order.imagePreviewLocal;

    const rawUrl = order.productImageLink || '';
    if (!rawUrl || typeof rawUrl !== 'string') return '';

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
              dailyRemarks: serverOrder.dailyRemarks || '',
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

      setLastSubmittedOrderData({ ...submissionData });
      setSubmittedOrderSuccessModal(true);

      setTimeout(() => {
        fetchOrdersFromSheet();
      }, 1500);

    } catch (err) {
      console.error("Failed to submit order:", err);
      alert("Order submission sent. Please verify Google Sheet.");
      fetchOrdersFromSheet();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAnotherItemSameCustomer = () => {
    if (!lastSubmittedOrderData) return;
    
    setFormData(prev => ({
      ...prev,
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
      advanceAmount: '',
      orderDescription: '',
      specialRemarks: ''
    }));

    setSubmittedOrderSuccessModal(false);
    setActiveTab('new-order');
  };

  const handleFinishAddingItems = () => {
    setSubmittedOrderSuccessModal(false);
    setLastSubmittedOrderData(null);
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
      advanceAmount: '',
      orderDescription: '',
      orderTakenDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      orderPerson: '',
      specialRemarks: ''
    });
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
      'Gold Weight(g)': data.get('goldWeight'),
      'Diamond Weight(ct)': data.get('diamondWeight'),
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
        'Gold Weight(g)': updatedOrder['Gold Weight(g)'] || '',
        'Diamond Weight(ct)': updatedOrder['Diamond Weight(ct)'] || '',
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
    const headers = "Order Sheet,Tag Number,Customer,Contact,Item,Purity,Gold Wt,Diamond Wt,Advance,Sales,Executive,Status\n";
    const rows = orders.map(o => `${o.orderSheetNo},${o.tagNumber},${o.customerName},${o.contactNumber},${o.jewelleryItem},${o.purity},${o['Gold Weight(g)'] || o.goldWeight},${o['Diamond Weight(ct)'] || o.diamondWeight},${o.advanceAmount || ''},${o.salesPerson},${o.orderPerson},${o.productStatus}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Namah_Jewellers_Orders.csv';
    a.click();
  };

  const buildWhatsAppMessage = (order) => {
    const fullOrder = (orders || []).find(o => 
      String(o.orderSheetNo || '').trim() === String(order.orderSheetNo || '').trim() &&
      String(o.tagNumber || '').trim() === String(order.tagNumber || '').trim()
    ) || order;

    const goldWt = fullOrder.goldWeight || '';
    const diamondWt = fullOrder.diamondWeight || '';
    const orderDesc = fullOrder.orderDescription || '';

    let msg = `*Karigar Work Order*\n\n` +
      `🔢 *Order Sheet:* ${fullOrder.orderSheetNo || 'N/A'}\n` +
      `💍 *Jewellery Item:* ${fullOrder.jewelleryItem || 'N/A'}\n` +
      `🏷️ *Tag Number:* ${fullOrder.tagNumber || 'N/A'}\n` +
      `🛠️ *Karigar:* ${fullOrder.karigarName || 'N/A'}\n`;

    if (goldWt) msg += `🟡 *Gold Weight:* ${goldWt}g\n`;
    if (diamondWt) msg += `💎 *Diamond Weight:* ${diamondWt}ct\n`;

    if (fullOrder.colorTone) msg += `🎨 *Color Tone:* ${fullOrder.colorTone}\n`;
    if (fullOrder.purity) msg += `✨ *Purity:* ${fullOrder.purity}\n`;
    if (fullOrder.size) msg += `📏 *Size:* ${fullOrder.size}\n`;
    
    if (orderDesc && orderDesc.trim() !== '') {
      msg += `📝 *Order Description:* ${orderDesc}\n`;
    }

    if (fullOrder.alterationDetails) msg += `🔄 *Alternation If Any:* ${fullOrder.alterationDetails}\n`;
    
    msg += `⏱️ *Karigar DOD:* ${extractDateOnly(fullOrder.karigarDod)}\n\n` +
      `📷 *Image URL:* ${formatDriveUrl(fullOrder)}`;

    return msg;
  };

  // Consolidated Customer Slip Builder with Salesperson Number & Order Dept Number
  const buildConsolidatedCustomerMessage = (client) => {
    const firstOrder = client.ordersList[0] || {};
    const salesPersonName = firstOrder.salesPerson || 'N/A';
    const salesPersonPhone = SALESPERSON_NUMBERS[salesPersonName] || 'N/A';
    const advanceTotal = client.ordersList.reduce((sum, ord) => sum + (parseFloat(ord.advanceAmount) || 0), 0);

    let msg = `*Namah Jewellers - Consolidated Order Slip*\n\n` +
      `👤 *Customer:* ${client.customerName}\n` +
      `📞 *Contact:* ${client.contactNumber}\n` +
      `🤝 *Sales Person:* ${salesPersonName} (${salesPersonPhone})\n` +
      `🛠️ *Order Department:* ${ORDER_DEPARTMENT_NUMBER}\n`;

    if (advanceTotal > 0) {
      msg += `💵 *Total Advance Paid:* ₹${advanceTotal}\n`;
    }

    msg += `📦 *Total Items Ordered:* ${client.ordersList.length}\n\n` +
      `-----------------------------------\n\n`;

    client.ordersList.forEach((ord, index) => {
      const goldWt = ord['Gold Weight(g)'] || ord.goldWeight || '';
      const diamondWt = ord['Diamond Weight(ct)'] || ord.diamondWeight || '';
      const imgUrl = formatDriveUrl(ord);

      msg += `*Item #${index + 1}: ${ord.jewelleryItem || 'Jewellery'}*\n` +
        `🔢 *Order Sheet:* ${ord.orderSheetNo || 'N/A'}\n` +
        `🏷️ *Tag Number:* ${ord.tagNumber || 'N/A'}\n` +
        `✨ *Purity:* ${ord.purity || 'N/A'}\n`;

      if (goldWt) msg += `🟡 *Gold Wt:* ${goldWt}g\n`;
      if (diamondWt) msg += `💎 *Diamond Wt:* ${diamondWt}ct\n`;
      if (ord.advanceAmount) msg += `💵 *Advance:* ₹${ord.advanceAmount}\n`;
      if (ord.productStatus) msg += `📌 *Status:* ${ord.productStatus}\n`;
      if (imgUrl) msg += `📷 *Image:* ${imgUrl}\n`;

      msg += `\n-----------------------------------\n\n`;
    });

    msg += `Thank you for shopping with Namah Jewellers! ✨`;
    return msg;
  };

  const orderBookAudits = useMemo(() => {
    const bookRanges = [
      { 
        name: 'Yogita', 
        books: [
          { start: 8151, end: 8225 },
          { start: 7476, end: 7550 },
          { start: 7776, end: 7850 }
        ] 
      },
      { 
        name: 'Hema', 
        books: [
          { start: 8226, end: 8300 },
          { start: 7776, end: 7850 }
        ] 
      },
      { 
        name: 'Sohil', 
        books: [
          { start: 7626, end: 7700 }
        ] 
      },
      { 
        name: 'Mohit', 
        books: [
          { start: 7551, end: 7625 }
        ] 
      },
      { 
        name: 'Akansha', 
        books: [
          { start: 8451, end: 8525 }
        ] 
      },
      { 
        name: 'Deepika', 
        books: [
          { start: 8526, end: 8600 }
        ] 
      },
      { 
        name: 'Ziya', 
        books: [
          { start: 7101, end: 7175 }
        ] 
      }
    ];

    const auditResults = {};

    bookRanges.forEach(({ name, books }) => {
      const personOrders = orders.filter(
        o => (o.salesPerson || '').toLowerCase() === name.toLowerCase()
      );

      const enteredNumbers = new Set(
        personOrders.map(o => parseInt(o.orderSheetNo, 10)).filter(num => !isNaN(num))
      );

      const enteredArray = Array.from(enteredNumbers).sort((a, b) => a - b);
      const maxEntered = enteredArray.length > 0 ? Math.max(...enteredArray) : 0;

      const skippedPages = [];

      books.forEach(book => {
        for (let i = book.start; i <= book.end; i++) {
          if (maxEntered > 0 && i <= maxEntered && !enteredNumbers.has(i)) {
            skippedPages.push(i);
          }
        }
      });

      const rangeDisplay = books.map(b => `${b.start} - ${b.end}`).join(', ');

      auditResults[name] = {
        expectedRange: rangeDisplay,
        totalEntriesFound: personOrders.length,
        maxEntered,
        enteredPages: enteredArray,
        skippedPages
      };
    });

    return auditResults;
  }, [orders]);

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

  const offOrders = useMemo(() => {
    return orders.filter(order => {
      if ((order.orderStatus || '').toLowerCase() === 'delivered' || (order.productStatus || '').toLowerCase() === 'delivered') {
        return false;
      }
      return !order.isOn;
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
          if (!(pStatus.includes('process') || pStatus === 'assigned')) {
            return false;
          }
        } else if (filterStatus === 'Ready but bill pending') {
          if (!(pStatus === 'ready but bill pending' || pStatus.includes('bill pending'))) {
            return false;
          }
        } else if (filterStatus === 'Packed') {
          if (!(pStatus === 'packed')) {
            return false;
          }
        } else if (filterStatus === '--Not Assign--') {
          if (!(!order.productStatus || order.productStatus === '' || pStatus.includes('not assign'))) {
            return false;
          }
        } else if (pStatus !== filterStatus.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, filterSalesperson, filterExecutive, filterWorkType, filterStatus]);

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
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Dashboard
          </button>
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
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Book Audit
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
        {activeTab === 'dashboard' && (() => {
          const allLiveOrders = orders.filter(o => {
            const isDelivered = (o.orderStatus || '').toLowerCase() === 'delivered' || (o.productStatus || '').toLowerCase() === 'delivered';
            return !isDelivered;
          });

          const formatDateDDMM = (dateStr) => {
            const clean = extractDateOnly(dateStr);
            if (!clean || clean === 'N/A') return 'N/A';
            const parts = clean.split('-');
            if (parts.length === 3) {
              return `${parts[2]}/${parts[1]}`;
            }
            return clean;
          };

          const getStatusStr = (o) => {
            const pStatus = (o.productStatus || '').toLowerCase();
            if (!o.productStatus || o.productStatus === '' || pStatus.includes('not assign')) {
              return '--Not Assign--';
            } else if (pStatus.includes('process') || pStatus === 'assigned') {
              return 'Under Process';
            } else if (pStatus === 'ready but bill pending' || pStatus.includes('bill pending')) {
              return 'Ready but bill pending';
            } else if (pStatus === 'packed') {
              return 'Packed';
            }
            return toProperCase(o.productStatus);
          };

          const ordersForSalesBreakdown = allLiveOrders.filter(o => {
            if (dashboardExecFilter !== 'ALL' && o.orderPerson !== dashboardExecFilter) return false;
            if (dashboardStatusFilter !== 'ALL' && getStatusStr(o) !== dashboardStatusFilter) return false;
            return true;
          });

          const ordersForExecBreakdown = allLiveOrders.filter(o => {
            if (dashboardSalesFilter !== 'ALL' && o.salesPerson !== dashboardSalesFilter) return false;
            if (dashboardStatusFilter !== 'ALL' && getStatusStr(o) !== dashboardStatusFilter) return false;
            return true;
          });

          const ordersForStatusBreakdown = allLiveOrders.filter(o => {
            if (dashboardSalesFilter !== 'ALL' && o.salesPerson !== dashboardSalesFilter) return false;
            if (dashboardExecFilter !== 'ALL' && o.orderPerson !== dashboardExecFilter) return false;
            return true;
          });

          const liveBySalesAll = {};
          ordersForSalesBreakdown.forEach(o => {
            const sp = o.salesPerson || 'Unassigned';
            liveBySalesAll[sp] = (liveBySalesAll[sp] || 0) + 1;
          });

          const liveByExecAll = {};
          ordersForExecBreakdown.forEach(o => {
            const ep = o.orderPerson || 'Unassigned';
            liveByExecAll[ep] = (liveByExecAll[ep] || 0) + 1;
          });

          const liveByStatusAll = {};
          ordersForStatusBreakdown.forEach(o => {
            const st = getStatusStr(o);
            liveByStatusAll[st] = (liveByStatusAll[st] || 0) + 1;
          });

          const dashboardFilteredOrders = allLiveOrders.filter(o => {
            if (dashboardSalesFilter !== 'ALL' && o.salesPerson !== dashboardSalesFilter) return false;
            if (dashboardExecFilter !== 'ALL' && o.orderPerson !== dashboardExecFilter) return false;
            if (dashboardStatusFilter !== 'ALL' && getStatusStr(o) !== dashboardStatusFilter) return false;
            return true;
          });

          const totalLiveOrders = dashboardFilteredOrders.length;

          const uniqueLiveOrdersMap = {};
          dashboardFilteredOrders.forEach(o => {
            const rawKey = o.orderSheetNo || o.tagNumber;
            if (rawKey) {
              const key = String(rawKey).trim().toUpperCase();
              uniqueLiveOrdersMap[key] = true;
            }
          });
          const totalUniqueLiveOrders = Object.keys(uniqueLiveOrdersMap).length;

          const dashboardOffOrdersCount = dashboardFilteredOrders.filter(o => !o.isOn).length;

          const todayDateStr = new Date().toISOString().split('T')[0];
          const todayTime = new Date(todayDateStr).getTime();

          const getDODTimelineStatus = (dodStr) => {
            const cleanDOD = extractDateOnly(dodStr);
            if (!cleanDOD || cleanDOD === 'N/A') return { text: 'ON TRACK', color: 'text-slate-400 bg-slate-800/30 border-slate-700', rank: 3 };

            const dodTime = new Date(cleanDOD).getTime();
            const diffDays = Math.round((dodTime - todayTime) / (1000 * 60 * 60 * 24));

            if (cleanDOD < todayDateStr) {
              return { text: 'OVERDUE ORDERS', color: 'text-red-400 bg-red-500/10 border-red-500/30', rank: 0 };
            } else if (cleanDOD === todayDateStr) {
              return { text: 'DUE TODAY', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', rank: 1 };
            } else if (diffDays <= 2) {
              return { text: 'DUE DATE COMING', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', rank: 2 };
            } else {
              return { text: 'ON TRACK', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', rank: 3 };
            }
          };

          const urgentDODOrdersList = dashboardFilteredOrders.filter(o => {
            const cleanDOD = extractDateOnly(o.karigarDod);
            if (!cleanDOD || cleanDOD === 'N/A') return false;
            const dodTime = new Date(cleanDOD).getTime();
            const diffDays = Math.round((dodTime - todayTime) / (1000 * 60 * 60 * 24));
            return diffDays <= 2;
          }).sort((a, b) => {
            const timeA = new Date(extractDateOnly(a.karigarDod)).getTime();
            const timeB = new Date(extractDateOnly(b.karigarDod)).getTime();
            return timeA - timeB;
          });

          const underProcessOrdersList = dashboardFilteredOrders.filter(o => {
            const st = getStatusStr(o);
            return st === 'Under Process';
          }).sort((a, b) => {
            const statA = getDODTimelineStatus(a.karigarDod);
            const statB = getDODTimelineStatus(b.karigarDod);

            if (statA.rank !== statB.rank) {
              return statA.rank - statB.rank;
            }

            const timeA = extractDateOnly(a.karigarDod) === 'N/A' ? Infinity : new Date(extractDateOnly(a.karigarDod)).getTime();
            const timeB = extractDateOnly(b.karigarDod) === 'N/A' ? Infinity : new Date(extractDateOnly(b.karigarDod)).getTime();
            return timeA - timeB;
          });

          const customerGroups = {};
          dashboardFilteredOrders.forEach(o => {
            const custKey = o.contactNumber || o.customerName || 'Unknown';
            if (!customerGroups[custKey]) {
              customerGroups[custKey] = { customerName: o.customerName, contactNumber: o.contactNumber, items: [] };
            }
            customerGroups[custKey].items.push(o);
          });

          const billPendingCustomers = [];
          const packedCustomers = [];

          Object.values(customerGroups).forEach(cust => {
            const allBillPending = cust.items.length > 0 && cust.items.every(item => {
              const st = (item.productStatus || '').toLowerCase();
              return st === 'ready but bill pending' || st.includes('bill pending');
            });
            if (allBillPending) billPendingCustomers.push(cust);

            const allPacked = cust.items.length > 0 && cust.items.every(item => {
              const st = (item.productStatus || '').toLowerCase();
              return st === 'packed';
            });
            if (allPacked) packedCustomers.push(cust);
          });

          return (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Comprehensive Business Dashboard
                </h3>
                <div className="flex items-center gap-3">
                  {(dashboardSalesFilter !== 'ALL' || dashboardExecFilter !== 'ALL' || dashboardStatusFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setDashboardSalesFilter('ALL');
                        setDashboardExecFilter('ALL');
                        setDashboardStatusFilter('ALL');
                      }}
                      className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear Dashboard Filters
                    </button>
                  )}
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold">
                    Active Live Metrics
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-[#181b22] border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <p className="text-xs text-slate-400 font-bold uppercase">TOTAL LIVE ORDERS (ON+OFF)</p>
                  <h4 className="text-2xl font-black text-white mt-1">{totalLiveOrders}</h4>
                </div>
                <div className="bg-[#181b22] border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <p className="text-xs text-slate-400 font-bold uppercase">Total Live Customers</p>
                  <h4 className="text-2xl font-black text-amber-400 mt-1">{totalUniqueLiveOrders}</h4>
                </div>
                <div className="bg-[#181b22] border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <p className="text-xs text-slate-400 font-bold uppercase">Bill Pending Customers</p>
                  <h4 className="text-2xl font-black text-emerald-400 mt-1">{billPendingCustomers.length}</h4>
                </div>
                <div className="bg-[#181b22] border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <p className="text-xs text-slate-400 font-bold uppercase">Fully Packed Customers</p>
                  <h4 className="text-2xl font-black text-purple-400 mt-1">{packedCustomers.length}</h4>
                </div>
                <div 
                  onClick={() => setActiveTab('off-orders')}
                  className="bg-[#181b22] border border-slate-800 p-4 rounded-2xl shadow-lg cursor-pointer hover:border-amber-500/50 transition-all"
                >
                  <p className="text-xs text-slate-400 font-bold uppercase">NOT PLACED TO KARIGAR ORDERS</p>
                  <h4 className="text-2xl font-black text-amber-500 mt-1">{dashboardOffOrdersCount}</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#181b22] border border-slate-800 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-amber-400 uppercase border-b border-slate-800 pb-2">Live Orders by Sales Person (Click to Filter Dashboard)</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(liveBySalesAll).map(([sp, count], i) => (
                      <div 
                        key={i} 
                        onClick={() => setDashboardSalesFilter(dashboardSalesFilter === sp ? 'ALL' : sp)}
                        className={`flex justify-between text-xs text-slate-300 bg-[#111318] px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                          dashboardSalesFilter === sp ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-300' : 'border-slate-800/80 hover:border-amber-500'
                        }`}
                      >
                        <span>{sp}</span>
                        <strong className="text-amber-400">{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#181b22] border border-slate-800 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-amber-400 uppercase border-b border-slate-800 pb-2">Live Orders by Order Person (Click to Filter Dashboard)</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(liveByExecAll).map(([ep, count], i) => (
                      <div 
                        key={i} 
                        onClick={() => setDashboardExecFilter(dashboardExecFilter === ep ? 'ALL' : ep)}
                        className={`flex justify-between text-xs text-slate-300 bg-[#111318] px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                          dashboardExecFilter === ep ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-300' : 'border-slate-800/80 hover:border-amber-500'
                        }`}
                      >
                        <span>{ep}</span>
                        <strong className="text-amber-400">{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#181b22] border border-slate-800 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-amber-400 uppercase border-b border-slate-800 pb-2">Product Status Wise (Click to Filter Dashboard)</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(liveByStatusAll).map(([st, count], i) => (
                      <div 
                        key={i} 
                        onClick={() => setDashboardStatusFilter(dashboardStatusFilter === st ? 'ALL' : st)}
                        className={`flex justify-between text-xs text-slate-300 bg-[#111318] px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                          dashboardStatusFilter === st ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-300' : 'border-slate-800/80 hover:border-amber-500'
                        }`}
                      >
                        <span>{st}</span>
                        <strong className="text-amber-400">{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. ORDERS ON KARIGAR */}
              <div className="bg-[#181b22] border border-slate-800 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-black text-amber-400 uppercase">
                  ORDERS ON KARIGAR ({underProcessOrdersList.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[950px]">
                    <thead className="bg-[#121419] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3 w-20">IMAGE</th>
                        <th className="p-3">Order / Tag</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Sales Person</th>
                        <th className="p-3">Order Person</th>
                        <th className="p-3">Karigar Name</th>
                        <th className="p-3">Karigar DOD</th>
                        <th className="p-3 text-center">DOD Timeline Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {underProcessOrdersList.length === 0 ? (
                        <tr><td colSpan="8" className="p-6 text-center text-slate-500">No under process orders found.</td></tr>
                      ) : (
                        underProcessOrdersList.map((ord, idx) => {
                          const timeline = getDODTimelineStatus(ord.karigarDod);
                          const imageUrl = formatDriveUrl(ord);
                          return (
                            <tr key={idx} className="hover:bg-[#111318]/50">
                              <td className="p-3">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt=""
                                    onClick={() => setPreviewImage(imageUrl)}
                                    className="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-slate-700/60 shadow-md cursor-pointer hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-[#212530] rounded-xl flex items-center justify-center border border-slate-700/60 text-slate-500 text-[9px]">
                                    Product
                                  </div>
                                )}
                              </td>
                              <td className="p-3 font-bold text-amber-400">
                                {ord.orderSheetNo} <span className="text-slate-500 font-mono font-normal">({ord.tagNumber})</span>
                              </td>
                              <td className="p-3 font-bold text-slate-100">{ord.customerName}</td>
                              <td className="p-3 text-amber-300 font-medium">{ord.salesPerson || 'N/A'}</td>
                              <td className="p-3 text-blue-300 font-medium">{ord.orderPerson || 'N/A'}</td>
                              <td className="p-3">{ord.karigarName || 'Not Assigned'}</td>
                              <td className="p-3 font-mono font-bold text-amber-300">{formatDateDDMM(ord.karigarDod)}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${timeline.color}`}>
                                  {timeline.text}
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

              {/* 2. CUSTOMERS WITH ALL ITEMS "READY BUT BILL PENDING" */}
              <div className="bg-[#181b22] border border-slate-800 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-black text-emerald-400 uppercase">
                  CUSTOMERS WITH ALL ITEMS "READY BUT BILL PENDING" ({billPendingCustomers.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[900px]">
                    <thead className="bg-[#121419] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Contact Number</th>
                        <th className="p-3">Sales Person</th>
                        <th className="p-3">Order Person</th>
                        <th className="p-3">Total Items</th>
                        <th className="p-3">Order Sheets / Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {billPendingCustomers.length === 0 ? (
                        <tr><td colSpan="6" className="p-6 text-center text-slate-500">No customers found with all items ready and bill pending.</td></tr>
                      ) : (
                        billPendingCustomers.map((cust, idx) => {
                          const salesPersons = Array.from(new Set(cust.items.map(i => i.salesPerson).filter(Boolean))).join(', ');
                          const orderPersons = Array.from(new Set(cust.items.map(i => i.orderPerson).filter(Boolean))).join(', ');
                          return (
                            <tr key={idx} className="hover:bg-[#111318]/50">
                              <td className="p-3 font-bold text-emerald-300">{cust.customerName}</td>
                              <td className="p-3 font-mono">{cust.contactNumber}</td>
                              <td className="p-3 text-amber-300 font-medium">{salesPersons || 'N/A'}</td>
                              <td className="p-3 text-blue-300 font-medium">{orderPersons || 'N/A'}</td>
                              <td className="p-3">{cust.items.length}</td>
                              <td className="p-3 text-amber-400 font-mono">
                                {cust.items.map(i => `${i.orderSheetNo} (${i.tagNumber})`).join(', ')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. CUSTOMERS WITH ALL ITEMS "PACKED" */}
              <div className="bg-[#181b22] border border-slate-800 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-black text-purple-400 uppercase">
                  CUSTOMERS WITH ALL ITEMS "PACKED" ({packedCustomers.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[900px]">
                    <thead className="bg-[#121419] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Contact Number</th>
                        <th className="p-3">Sales Person</th>
                        <th className="p-3">Order Person</th>
                        <th className="p-3">Total Items</th>
                        <th className="p-3">Order Sheets / Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {packedCustomers.length === 0 ? (
                        <tr><td colSpan="6" className="p-6 text-center text-slate-500">No customers found with all items packed.</td></tr>
                      ) : (
                        packedCustomers.map((cust, idx) => {
                          const salesPersons = Array.from(new Set(cust.items.map(i => i.salesPerson).filter(Boolean))).join(', ');
                          const orderPersons = Array.from(new Set(cust.items.map(i => i.orderPerson).filter(Boolean))).join(', ');
                          return (
                            <tr key={idx} className="hover:bg-[#111318]/50">
                              <td className="p-3 font-bold text-purple-300">{cust.customerName}</td>
                              <td className="p-3 font-mono">{cust.contactNumber}</td>
                              <td className="p-3 text-amber-300 font-medium">{salesPersons || 'N/A'}</td>
                              <td className="p-3 text-blue-300 font-medium">{orderPersons || 'N/A'}</td>
                              <td className="p-3">{cust.items.length}</td>
                              <td className="p-3 text-amber-400 font-mono">
                                {cust.items.map(i => `${i.orderSheetNo} (${i.tagNumber})`).join(', ')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. 🚨 URGENT ORDERS DOD (<= 2 DAYS) */}
              <div className="bg-[#181b22] border border-orange-500/30 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-orange-500/20 pb-3">
                  <h4 className="text-sm font-black text-orange-400 flex items-center gap-2 uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-orange-400" /> 🚨 Urgent Orders (DOD Due in 2 Days or Less / Overdue) ({urgentDODOrdersList.length})
                  </h4>
                  <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-xl text-xs font-bold">
                    Action Required
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[950px]">
                    <thead className="bg-[#121419] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3 w-20">IMAGE</th>
                        <th className="p-3">Order / Tag</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Sales Person</th>
                        <th className="p-3">Karigar Name</th>
                        <th className="p-3">Karigar DOD</th>
                        <th className="p-3 text-center">Timeline Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {urgentDODOrdersList.length === 0 ? (
                        <tr><td colSpan="7" className="p-6 text-center text-slate-500">✨ No urgent orders due in 2 days or less. All caught up!</td></tr>
                      ) : (
                        urgentDODOrdersList.map((ord, idx) => {
                          const timeline = getDODTimelineStatus(ord.karigarDod);
                          const imageUrl = formatDriveUrl(ord);
                          return (
                            <tr key={idx} className="hover:bg-[#111318]/50">
                              <td className="p-3">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt=""
                                    onClick={() => setPreviewImage(imageUrl)}
                                    className="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-slate-700/60 shadow-md cursor-pointer hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-[#212530] rounded-xl flex items-center justify-center border border-slate-700/60 text-slate-500 text-[9px]">
                                    Product
                                  </div>
                                )}
                              </td>
                              <td className="p-3 font-bold text-amber-400">
                                {ord.orderSheetNo} <span className="text-slate-500 font-mono font-normal">({ord.tagNumber})</span>
                              </td>
                              <td className="p-3 font-bold text-slate-100">{ord.customerName}</td>
                              <td className="p-3 text-amber-300 font-medium">{ord.salesPerson || 'N/A'}</td>
                              <td className="p-3">{ord.karigarName || 'Not Assigned'}</td>
                              <td className="p-3 font-mono font-bold text-amber-300">{formatDateDDMM(ord.karigarDod)}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${timeline.color}`}>
                                  {timeline.text}
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

              {/* 5. MASTER LIST OF ALL ACTIVE LIVE ORDERS (LAST) */}
              <div className="bg-[#181b22] border border-slate-800 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-black text-amber-400 uppercase">
                  Master List of All Active Live Orders ({dashboardFilteredOrders.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[1100px]">
                    <thead className="bg-[#121419] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3 w-20">IMAGE</th>
                        <th className="p-3">Order / Tag</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Sales Person</th>
                        <th className="p-3">Order Person</th>
                        <th className="p-3">DOD (Promised)</th>
                        <th className="p-3">Product Status</th>
                        <th className="p-3">Daily Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {dashboardFilteredOrders.length === 0 ? (
                        <tr><td colSpan="8" className="p-6 text-center text-slate-500">No active live orders found.</td></tr>
                      ) : (
                        dashboardFilteredOrders.map((ord, idx) => {
                          const rawStatus = ord.productStatus ? String(ord.productStatus).trim() : '';
                          const isUnassigned = !rawStatus || rawStatus === '' || rawStatus.toLowerCase().includes('not assign');
                          const imageUrl = formatDriveUrl(ord);

                          return (
                            <tr key={idx} className="hover:bg-[#111318]/50">
                              <td className="p-3">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt=""
                                    onClick={() => setPreviewImage(imageUrl)}
                                    className="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-slate-700/60 shadow-md cursor-pointer hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-[#212530] rounded-xl flex items-center justify-center border border-slate-700/60 text-slate-500 text-[9px]">
                                    Product
                                  </div>
                                )}
                              </td>
                              <td className="p-3 font-bold text-amber-400">
                                {ord.orderSheetNo} <span className="text-slate-500 font-mono font-normal">({ord.tagNumber})</span>
                              </td>
                              <td className="p-3 font-bold text-slate-100">{ord.customerName || 'N/A'}</td>
                              <td className="p-3 text-amber-300 font-medium">{ord.salesPerson || 'N/A'}</td>
                              <td className="p-3 text-blue-300 font-medium">{ord.orderPerson || 'N/A'}</td>
                              <td className="p-3 font-mono">{formatDateDDMM(ord.deliveryDate)}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                                  isUnassigned
                                    ? 'bg-slate-900 text-slate-400 border-slate-700'
                                    : 'bg-amber-900/20 text-amber-300 border-amber-600/30'
                                }`}>
                                  {isUnassigned ? '--Not Assign--' : ord.productStatus}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300 max-w-xs truncate">
                                {ord.dailyRemarks || '--'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

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
                      return pStatus.includes('process') || pStatus === 'assigned';
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
                      return pStatus === 'ready but bill pending' || pStatus.includes('bill pending');
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
                      return pStatus === 'packed';
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
                    <option value="--Not Assign--" className="bg-[#181b22]">--Not Assign--</option>
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
                              {(() => {
                                const gWt = order['Gold Weight(g)'] || order.goldWeight;
                                const dWt = order['Diamond Weight(ct)'] || order.diamondWeight;
                                const adv = order.advanceAmount;
                                return (
                                  <>
                                    {gWt && <span>Gold: <strong className="text-amber-400 font-bold">{gWt}g</strong></span>}
                                    {gWt && dWt && <span className="text-slate-600">|</span>}
                                    {dWt && <span>Dia: <strong className="text-amber-400 font-bold">{dWt}ct</strong></span>}
                                    {adv && <><br /><span>Adv: <strong className="text-emerald-400 font-bold">₹{adv}</strong></span></>}
                                  </>
                                );
                              })()}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {order.colorTone || ''} {order.size ? `| Size: ${order.size}` : ''}
                            </p>
                            
                            <div className="mt-1 text-xs text-amber-300/90 pt-1 border-t border-slate-800 break-words whitespace-normal max-w-[280px]">
                              <span className="font-medium text-amber-400">ORDER DESCRIPTION - </span>
                              <span className="text-gray-300">{order.orderDescription || order.remarks || '--'}</span>
                            </div>

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
                              {(() => {
                                const gWt = order['Gold Weight(g)'] || order.goldWeight;
                                const dWt = order['Diamond Weight(ct)'] || order.diamondWeight;
                                return (
                                  <>
                                    {gWt && <span>Gold: <strong className="text-amber-400 font-bold">{gWt}g</strong></span>}
                                    {gWt && dWt && <span className="text-slate-600">|</span>}
                                    {dWt && <span>Dia: <strong className="text-amber-400 font-bold">{dWt}ct</strong></span>}
                                  </>
                                );
                              })()}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {order.colorTone || ''} {order.size ? `| Size: ${order.size}` : ''}
                            </p>
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

        {activeTab === 'audit' && (
          <div className="bg-[#181b22] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Order Book & Active Gap Audit
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detects skipped blank pages only within active entry ranges (ignoring unreached future pages).
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold">
                Smart Range Inspection Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(orderBookAudits).map(([name, data], idx) => (
                <div key={idx} className="bg-[#111318] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-100">{name}</h4>
                    <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      Range: {data.expectedRange}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#181b22] p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">LAST ENTERED PAGE</span>
                      <strong className="text-amber-400 text-sm">#{data.maxEntered || 'None'}</strong>
                    </div>
                    <div className="bg-[#181b22] p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">SKIPPED GAPS FOUND</span>
                      <strong className={data.skippedPages.length > 0 ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'}>
                        {data.skippedPages.length} pages
                      </strong>
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-400 block">Entered Page Numbers Found in System:</span>
                    <p className="text-xs font-mono text-slate-300 max-h-20 overflow-y-auto">
                      {data.enteredPages.length > 0 ? data.enteredPages.join(', ') : 'None entered yet'}
                    </p>
                  </div>

                  {data.skippedPages.length > 0 ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1">
                      <span className="text-[11px] font-bold text-red-400 block">⚠️ Skipped Gap Pages (Blank pages before last entry #{data.maxEntered}):</span>
                      <p className="text-xs font-mono text-slate-300 max-h-20 overflow-y-auto">
                        {data.skippedPages.join(', ')}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-center text-xs font-bold text-emerald-400">
                      ✨ No Gaps! All pages up to #{data.maxEntered} are filled properly.
                    </div>
                  )}
                </div>
              ))}
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
                      required
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
                <h4 className="text-xs font-bold text-amber-400 uppercase">Gold, Diamond & Advance Specifications</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
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
                    <label className="block text-xs text-slate-400 mb-1">Advance (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      className="w-full bg-[#181b22] border border-amber-500/50 rounded-lg px-2 py-1.5 text-sm text-amber-300 font-bold"
                      value={formData.advanceAmount}
                      onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
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
                    <label className="block text-xs text-slate-400 mb-1">Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 16 inch"
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

      {/* Suggestion #2: Success Prompt Modal after submitting an order item */}
      {submittedOrderSuccessModal && lastSubmittedOrderData && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#181b22] border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-amber-400">Item Successfully Saved!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Customer: <strong className="text-white">{lastSubmittedOrderData.customerName}</strong><br />
                Sheet No: <strong className="text-amber-300">{lastSubmittedOrderData.orderSheetNo}</strong> | Item: <strong className="text-white">{lastSubmittedOrderData.jewelleryItem}</strong>
              </p>
            </div>

            <div className="bg-[#111318] border border-slate-800 rounded-2xl p-3 text-xs text-slate-400">
              Does this customer have **another item** under this same order sheet?
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleAddAnotherItemSameCustomer}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Add Another Item (Keep Customer Details Locked)
              </button>
              <button
                onClick={handleFinishAddingItems}
                className="w-full py-2.5 bg-[#222630] hover:bg-[#2c3240] text-slate-300 border border-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Finish & View Orders Table
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedCustomerCRM.ordersList.map((ord, i) => (
                  <div key={i} className="bg-[#111318] border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-amber-400">{ord.orderSheetNo} - {ord.jewelleryItem}</p>
                      <p className="text-[11px] text-slate-400">Tag: {ord.tagNumber} | Salesperson: {ord.salesPerson} {ord.advanceAmount ? `| Advance: ₹${ord.advanceAmount}` : ''}</p>
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

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildConsolidatedCustomerMessage(selectedCustomerCRM));
                  alert("Consolidated client slip copied to clipboard!");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Full Slip
              </button>
              
              <a
                href={'https://wa.me/?text=' + encodeURIComponent(buildConsolidatedCustomerMessage(selectedCustomerCRM))}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Send className="w-4 h-4" /> Send Consolidated WhatsApp Slip
              </a>
              
              <button 
                onClick={() => setSelectedCustomerCRM(null)} 
                className="px-4 py-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer border border-slate-800"
              >
                Close Profile
              </button>
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
                      defaultValue={selectedOrderForKarigar['Gold Weight(g)'] || selectedOrderForKarigar.goldWeight || ''}
                      placeholder="e.g. 45.2"
                      className="w-full bg-[#181b22] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Diamond Weight (ct)</label>
                    <input
                      type="text"
                      name="diamondWeight"
                      defaultValue={selectedOrderForKarigar['Diamond Weight(ct)'] || selectedOrderForKarigar.diamondWeight || ''}
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