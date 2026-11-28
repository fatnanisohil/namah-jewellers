import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  TrendingUp, Scale, Gem, IndianRupee, AlertTriangle,
  CheckCircle2, Clock, Users, Hammer, Filter, RotateCcw
} from 'lucide-react';

const GOLD_PALETTE = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];

// Robust Date Parser for Google Sheets GMT strings, ISO strings, and DD/MM/YYYY
function parseSheetDate(raw) {
  if (!raw || raw === 'N/A' || raw === '-') return null;
  const str = String(raw).trim();

  // Check DD/MM/YYYY or DD-MM-YYYY first
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Check YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Fallback for JS Date strings like "Fri Nov 20 2026 00:00:00 GMT+0530..."
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

// Format Date in Indian Style: "28-11-2026"
function formatIndianDate(raw) {
  const dt = parseSheetDate(raw);
  if (!dt) return 'N/A';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Short Indian Label for Charts: "28 Nov"
function formatShortIndianDate(dt) {
  if (!dt) return '';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Sortable YYYY-MM-DD key
function toSortKey(dt) {
  if (!dt) return '';
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ExecutiveDashboard({ orders = [], onSelectOrder }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [salesFilter, setSalesFilter] = useState('ALL');
  const [karigarFilter, setKarigarFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  // Today's date at midnight IST (local browser time)
  const todayMidnight = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const salesPersons = useMemo(() => {
    const set = new Set(orders.map(o => String(o.salesPerson || '').trim()).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [orders]);

  const karigars = useMemo(() => {
    const set = new Set(orders.map(o => String(o.karigarName || '').trim()).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const fromDt = dateFrom ? parseSheetDate(dateFrom) : null;
    const toDt = dateTo ? parseSheetDate(dateTo) : null;

    return orders.filter(o => {
      const status = String(o.productStatus || o.orderStatus || o.status || '').trim().toLowerCase();
      const isDelivered = status === 'delivered';

      if (statusFilter === 'ACTIVE' && isDelivered) return false;
      if (statusFilter === 'DELIVERED' && !isDelivered) return false;

      if (salesFilter !== 'ALL' && String(o.salesPerson || '').trim() !== salesFilter) return false;
      if (karigarFilter !== 'ALL' && String(o.karigarName || '').trim() !== karigarFilter) return false;

      const orderDt = parseSheetDate(o.orderTakenDate || o.timestamp);
      if (fromDt && orderDt && orderDt < fromDt) return false;
      if (toDt && orderDt && orderDt > toDt) return false;

      return true;
    });
  }, [orders, statusFilter, salesFilter, karigarFilter, dateFrom, dateTo]);

  // Helper to check if an order is Overdue at Karigar
  const isOrderKarigarOverdue = (o) => {
    const status = String(o.productStatus || o.orderStatus || o.status || '').toLowerCase();
    const karigar = String(o.karigarName || '').trim();
    if (!karigar || status === 'delivered' || status.includes('ready') || status.includes('received')) {
      return false;
    }
    const kDodDt = parseSheetDate(o.karigarDod || o.karigarDeliveryDate || o['Karigar DOD']);
    return kDodDt ? kDodDt < todayMidnight : false;
  };

  // Executive KPIs
  const kpis = useMemo(() => {
    let totalGold = 0;
    let totalDiamond = 0;
    let totalAdvance = 0;
    let overdueKarigar = 0;
    let unassignedKarigar = 0;
    let readyCount = 0;

    filteredOrders.forEach(o => {
      totalGold += parseFloat(o['Gold Weight(g)'] || o.goldWeight || 0) || 0;
      totalDiamond += parseFloat(o['Diamond Weight(ct)'] || o.diamondWeight || 0) || 0;
      totalAdvance += parseFloat(o.advanceAmount || 0) || 0;

      const status = String(o.productStatus || o.orderStatus || o.status || '').toLowerCase();
      const karigar = String(o.karigarName || '').trim();

      if (status.includes('ready')) readyCount++;
      if (!karigar && status !== 'delivered') unassignedKarigar++;
      if (isOrderKarigarOverdue(o)) overdueKarigar++;
    });

    return {
      count: filteredOrders.length,
      totalGold: totalGold.toFixed(2),
      totalDiamond: totalDiamond.toFixed(2),
      totalAdvance: Math.round(totalAdvance).toLocaleString('en-IN'),
      overdueKarigar,
      unassignedKarigar,
      readyCount
    };
  }, [filteredOrders, todayMidnight]);

  // Chart 1: Salesperson Performance
  const salesChartData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const sp = String(o.salesPerson || 'Unassigned').trim() || 'Unassigned';
      if (!map[sp]) map[sp] = { name: sp, orders: 0, gold: 0, advance: 0 };
      map[sp].orders += 1;
      map[sp].gold += parseFloat(o['Gold Weight(g)'] || o.goldWeight || 0) || 0;
      map[sp].advance += parseFloat(o.advanceAmount || 0) || 0;
    });
    return Object.values(map)
      .map(item => ({ ...item, gold: Number(item.gold.toFixed(1)) }))
      .sort((a, b) => b.orders - a.orders);
  }, [filteredOrders]);

  // Chart 2: Karigar Workload & Overdue Split
  const karigarChartData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const k = String(o.karigarName || '').trim();
      if (!k) return;
      if (!map[k]) map[k] = { name: k, onTime: 0, overdue: 0, gold: 0 };
      if (isOrderKarigarOverdue(o)) map[k].overdue += 1;
      else map[k].onTime += 1;
      map[k].gold += parseFloat(o['Gold Weight(g)'] || o.goldWeight || 0) || 0;
    });
    return Object.values(map)
      .map(item => ({ ...item, gold: Number(item.gold.toFixed(1)) }))
      .sort((a, b) => (b.onTime + b.overdue) - (a.onTime + a.overdue));
  }, [filteredOrders, todayMidnight]);

  // Chart 3: Order Type Split
  const orderTypeData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const t = String(o.orderType || 'NEW').trim().toUpperCase();
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Chart 4: Purity Mix
  const purityData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const p = String(o.purity || 'Other').trim();
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Chart 5: Daily Intake Trend in Clean Indian Date Format ("28 Nov")
  const dailyTrendData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const dt = parseSheetDate(o.orderTakenDate || o.timestamp);
      if (!dt) return;
      const key = toSortKey(dt);
      if (!map[key]) {
        map[key] = {
          date: formatShortIndianDate(dt),
          fullDate: formatIndianDate(dt),
          sortKey: key,
          orders: 0,
          gold: 0
        };
      }
      map[key].orders += 1;
      map[key].gold += parseFloat(o['Gold Weight(g)'] || o.goldWeight || 0) || 0;
    });
    return Object.values(map)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-14)
      .map(d => ({ ...d, gold: Number(d.gold.toFixed(1)) }));
  }, [filteredOrders]);

  // Critical Overdue Karigar Watchlist (Sorted Oldest Overdue First)
  const overdueList = useMemo(() => {
    return filteredOrders
      .filter(isOrderKarigarOverdue)
      .map(o => {
        const kDodDt = parseSheetDate(o.karigarDod || o.karigarDeliveryDate || o['Karigar DOD']);
        const daysLate = kDodDt ? Math.floor((todayMidnight - kDodDt) / (1000 * 60 * 60 * 24)) : 0;
        return { ...o, _kDodDt: kDodDt, _daysLate: daysLate };
      })
      .sort((a, b) => (a._kDodDt?.getTime() || 0) - (b._kDodDt?.getTime() || 0))
      .slice(0, 15);
  }, [filteredOrders, todayMidnight]);

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSalesFilter('ALL');
    setKarigarFilter('ALL');
    setStatusFilter('ACTIVE');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Filter Bar */}
      <div className="bg-[#161922] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mr-2 py-2">
          <Filter className="w-4 h-4" /> BI Filters
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Pipeline Scope</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0f1117] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-amber-500 outline-none"
          >
            <option value="ACTIVE">Active Orders Only</option>
            <option value="ALL">All Orders (Incl. Delivered)</option>
            <option value="DELIVERED">Delivered History</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Salesperson</label>
          <select
            value={salesFilter}
            onChange={(e) => setSalesFilter(e.target.value)}
            className="bg-[#0f1117] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-amber-500 outline-none"
          >
            {salesPersons.map(sp => <option key={sp} value={sp}>{sp === 'ALL' ? 'All Sales Team' : sp}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Karigar</label>
          <select
            value={karigarFilter}
            onChange={(e) => setKarigarFilter(e.target.value)}
            className="bg-[#0f1117] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-amber-500 outline-none"
          >
            {karigars.map(k => <option key={k} value={k}>{k === 'ALL' ? 'All Karigars' : k}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[#0f1117] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:border-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-[#0f1117] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:border-amber-500 outline-none"
          />
        </div>

        <button
          onClick={resetFilters}
          className="ml-auto px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Executive KPI Scorecard Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-gradient-to-br from-[#191d28] to-[#12151d] border border-slate-800 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-1">
            <span>Total Pieces</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{kpis.count}</p>
          <p className="text-[11px] text-emerald-400 mt-1">{kpis.readyCount} Ready for Delivery</p>
        </div>

        <div className="bg-gradient-to-br from-[#191d28] to-[#12151d] border border-amber-500/20 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-1">
            <span>Est. Gold Weight</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{kpis.totalGold} <span className="text-xs font-normal">g</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Across filtered orders</p>
        </div>

        <div className="bg-gradient-to-br from-[#191d28] to-[#12151d] border border-cyan-500/20 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-1">
            <span>Est. Diamond Wt</span>
            <Gem className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300">{kpis.totalDiamond} <span className="text-xs font-normal">ct</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Total carat pipeline</p>
        </div>

        <div className="bg-gradient-to-br from-[#191d28] to-[#12151d] border border-emerald-500/20 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-1">
            <span>Advance Collected</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">₹{kpis.totalAdvance}</p>
          <p className="text-[11px] text-slate-500 mt-1">Booking advances</p>
        </div>

        <div className="bg-gradient-to-br from-[#191d28] to-[#12151d] border border-rose-500/30 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-1">
            <span>Overdue Karigar</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400">{kpis.overdueKarigar}</p>
          <p className="text-[11px] text-rose-300/80 mt-1">Past Karigar DOD</p>
        </div>

        <div className="bg-gradient-to-br from-[#191d28] to-[#12151d] border border-orange-500/20 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-1">
            <span>Unassigned</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-orange-300">{kpis.unassignedKarigar}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting Karigar</p>
        </div>
      </div>

      {/* Main Analytics Row 1: Salesperson & Karigar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Salesperson Order & Gold Volume
            </h3>
            <span className="text-[11px] text-slate-400">Pieces vs Gold (g)</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="orders" name="Orders" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gold" name="Gold (g)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-emerald-400" /> Karigar Workload & Delay Health
            </h3>
            <span className="text-[11px] text-slate-400">On-Time vs Overdue</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={karigarChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={11} width={90} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="onTime" name="On Schedule" stackId="a" fill="#10b981" />
                <Bar dataKey="overdue" name="Overdue DOD" stackId="a" fill="#f43f5e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Analytics Row 2: Order Intake Trend + Order Type & Purity Donuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-100 mb-4">Recent Order Intake Trend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  contentStyle={{ backgroundColor: '#0f1117', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" fillOpacity={1} fill="url(#goldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Order Category Split</h3>
          <div className="h-56 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={orderTypeData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={4}>
                  {orderTypeData.map((_, i) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 text-xs pr-2 shrink-0">
              {orderTypeData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GOLD_PALETTE[i % GOLD_PALETTE.length] }} />
                  <span className="text-slate-300 truncate max-w-[110px]">{entry.name}</span>
                  <span className="font-bold text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Gold Purity Breakdown</h3>
          <div className="h-56 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={purityData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={4}>
                  {purityData.map((_, i) => <Cell key={i} fill={GOLD_PALETTE[(i + 2) % GOLD_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 text-xs pr-2 shrink-0">
              {purityData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GOLD_PALETTE[(i + 2) % GOLD_PALETTE.length] }} />
                  <span className="text-slate-300">{entry.name}</span>
                  <span className="font-bold text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Karigar Priority Watchlist */}
      <div className="bg-[#161922] border border-rose-500/20 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Priority Overdue Karigar Watchlist ({kpis.overdueKarigar})
          </h3>
          <span className="text-xs text-slate-400">Oldest overdue items first (DD-MM-YYYY)</span>
        </div>

        {overdueList.length === 0 ? (
          <div className="text-xs text-emerald-400 flex items-center gap-2 py-4">
            <CheckCircle2 className="w-4 h-4" /> Zero overdue Karigar orders in the current filter!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Order Sheet</th>
                  <th className="py-2.5 px-3">Item & Tag</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Salesperson</th>
                  <th className="py-2.5 px-3">Karigar</th>
                  <th className="py-2.5 px-3">Karigar DOD</th>
                  <th className="py-2.5 px-3">Delay</th>
                  <th className="py-2.5 px-3">Client DOD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {overdueList.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onSelectOrder && onSelectOrder(item)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-amber-400">{item.orderSheetNo}</td>
                    <td className="py-2.5 px-3 text-slate-200">{item.jewelleryItem} <span className="text-slate-500">({item.tagNumber || 'NA'})</span></td>
                    <td className="py-2.5 px-3 text-slate-300">{item.customerName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{item.salesPerson}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{item.karigarName}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-400">{formatIndianDate(item.karigarDod || item.karigarDeliveryDate || item['Karigar DOD'])}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-bold text-[10px]">
                        {item._daysLate}d late
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{formatIndianDate(item.promisedDeliveryDate || item.clientDod)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}