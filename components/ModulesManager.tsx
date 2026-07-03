import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Package, 
  Bell, 
  Truck, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Search, 
  User, 
  MapPin, 
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';

interface WorkOrder {
  id: string;
  order_number: number;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  client_name?: string;
  reported_issue?: string;
  confirmed_diagnosis?: string;
  assigned_technician?: string;
  ramp_number?: number;
  status: string;
  priority: string;
  created_at: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  min_stock: number;
  cost_per_unit: number;
  sale_price: number;
  location?: string;
  supplier?: string;
}

interface LogisticsItem {
  id: string;
  part_name: string;
  plate?: string;
  supplier?: string;
  tracking_number?: string;
  status: string;
  eta_date?: string;
  notes?: string;
}

interface SystemAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  keywords_detected?: string[];
  is_resolved: boolean;
  created_at: string;
}

interface Approval {
  id: string;
  work_order_id?: string;
  plate: string;
  description: string;
  estimated_cost?: number;
  requested_by: string;
  approved_by?: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  created_at: string;
}

interface ModulesManagerProps {
  type: 'ordenes' | 'inventario' | 'alertas';
}

export default function ModulesManager({ type }: ModulesManagerProps) {
  // Common loading / error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Specific states
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logistics, setLogistics] = useState<LogisticsItem[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Add inventory item form state
  const [showAddInv, setShowAddInv] = useState(false);
  const [newInv, setNewInv] = useState({
    sku: '',
    name: '',
    category: 'REPUESTO',
    unit: 'unidad',
    quantity: 0,
    min_stock: 0,
    cost_per_unit: 0,
    sale_price: 0,
    location: '',
    supplier: ''
  });

  // Action feedback states
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Fetch function
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        if (type === 'ordenes') {
          const [woRes, appRes] = await Promise.all([
            fetch('/api/dashboard/data?table=work_orders'),
            fetch('/api/dashboard/data?table=approvals')
          ]);
          if (!woRes.ok || !appRes.ok) throw new Error('Error al cargar órdenes y aprobaciones');
          const woData = await woRes.json();
          const appData = await appRes.json();
          setWorkOrders(woData.data || []);
          setApprovals(appData.data || []);
        } else if (type === 'inventario') {
          const invRes = await fetch('/api/dashboard/data?table=inventory');
          if (!invRes.ok) throw new Error('Error al cargar inventario');
          const invData = await invRes.json();
          setInventory(invData.data || []);
        } else if (type === 'alertas') {
          const [altRes, logRes] = await Promise.all([
            fetch('/api/dashboard/data?table=alerts'),
            fetch('/api/dashboard/data?table=logistics')
          ]);
          if (!altRes.ok || !logRes.ok) throw new Error('Error al cargar alertas y logística');
          const altData = await altRes.json();
          const logData = await logRes.json();
          setAlerts(altData.data || []);
          setLogistics(logData.data || []);
        }
      } catch (err: any) {
        setError(err.message || 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, refreshTrigger]);

  // Approve / Reject handlers
  const handleApprovalAction = async (id: string, status: 'APROBADO' | 'RECHAZADO') => {
    setActioningId(id);
    try {
      const res = await fetch('/api/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_approval_status',
          data: {
            id,
            status,
            approved_by: 'Administrador Web'
          }
        })
      });
      if (!res.ok) throw new Error('No se pudo procesar la respuesta');
      
      // Update local state
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status, approved_by: 'Administrador Web' } : a));
      
      // Refresh after a brief delay to reflect changes in orders
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Error al procesar acción');
    } finally {
      setActioningId(null);
    }
  };

  // Add Inventory Item handler
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_item',
          table: 'inventory',
          data: {
            ...newInv,
            quantity: Number(newInv.quantity),
            min_stock: Number(newInv.min_stock),
            cost_per_unit: Number(newInv.cost_per_unit),
            sale_price: Number(newInv.sale_price)
          }
        })
      });
      if (!res.ok) throw new Error('Error guardando item');
      
      setShowAddInv(false);
      setNewInv({
        sku: '',
        name: '',
        category: 'REPUESTO',
        unit: 'unidad',
        quantity: 0,
        min_stock: 0,
        cost_per_unit: 0,
        sale_price: 0,
        location: '',
        supplier: ''
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Error al guardar item');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APROBADO':
      case 'LISTO_PARA_ENTREGA':
      case 'ENTREGADO':
      case 'RECIBIDO':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'ESPERANDO_APROBACION':
      case 'PENDIENTE':
      case 'EN_TRANSITO':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'RECHAZADO':
      case 'CANCELADO':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'EN_REPARACION':
      case 'EN_DIAGNOSTICO':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'ESPERANDO_REPUESTOS':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENTE':
      case 'CRITICA':
        return 'text-rose-400 bg-rose-500/10 border border-rose-500/20 font-bold';
      case 'ALTA':
        return 'text-amber-400 bg-amber-500/10 border border-amber-500/20 font-bold';
      case 'NORMAL':
        return 'text-sky-400 bg-sky-500/10 border border-sky-500/20';
      default:
        return 'text-zinc-400 bg-zinc-800/40 border border-zinc-700/30';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            {type === 'ordenes' && <Wrench className="text-sky-400" />}
            {type === 'inventario' && <Package className="text-sky-400" />}
            {type === 'alertas' && <Bell className="text-sky-400" />}
            {type === 'ordenes' && 'Órdenes de Trabajo y Aprobaciones'}
            {type === 'inventario' && 'Control de Inventario de Repuestos'}
            {type === 'alertas' && 'Monitoreo de Alertas y Logística'}
          </h2>
          <p className="text-xs text-zinc-450 mt-1">
            {type === 'ordenes' && 'Visualiza el flujo de vehículos en el taller y aprueba cotizaciones adicionales enviadas por mecánicos.'}
            {type === 'inventario' && 'Control de repuestos y fluidos en stock. Los ítems con stock menor al mínimo muestran alertas automáticas.'}
            {type === 'alertas' && 'Alertas preventivas clasificadas por IA mediante análisis semántico en Telegram y rastreo logístico.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setRefreshTrigger(p => p + 1)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-850 px-3.5 py-2 rounded-xl transition"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          
          {type === 'inventario' && (
            <button 
              onClick={() => setShowAddInv(!showAddInv)}
              className="flex items-center gap-1.5 text-xs text-white bg-sky-500 hover:bg-sky-400 px-4 py-2 rounded-xl font-semibold shadow-md shadow-sky-500/10 transition"
            >
              <Plus size={14} />
              Agregar Repuesto
            </button>
          )}
        </div>
      </div>

      {/* Loading States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-zinc-900/20 border border-zinc-850 rounded-2xl">
          <RefreshCw size={32} className="text-sky-400 animate-spin" />
          <span className="text-xs font-semibold text-zinc-400">Consultando base de datos remota...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/5 text-rose-400 border border-rose-500/10 text-xs p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Error al cargar datos:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* RENDER VIEW: WORK ORDERS & APPROVALS */}
      {!loading && !error && type === 'ordenes' && (
        <div className="space-y-6">
          
          {/* Pending Approvals Sub-section */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileCheck size={16} className="text-amber-400" />
              Solicitudes de Trabajo Adicionales Pendientes
              {approvals.filter(a => a.status === 'PENDIENTE').length > 0 && (
                <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                  {approvals.filter(a => a.status === 'PENDIENTE').length} Por resolver
                </span>
              )}
            </h3>

            {approvals.filter(a => a.status === 'PENDIENTE').length === 0 ? (
              <div className="text-zinc-500 text-xs py-6 text-center bg-zinc-950/40 rounded-xl border border-zinc-900">
                ✅ No hay solicitudes de aprobación adicionales pendientes.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvals.filter(a => a.status === 'PENDIENTE').map(appr => (
                  <div key={appr.id} className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-4 shadow hover:border-zinc-800 transition">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div>
                        <span className="font-bold text-xs text-white block">Orden de Trabajo</span>
                        <span className="text-zinc-400 font-mono text-[10px]">Vehículo: {appr.plate}</span>
                      </div>
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold">
                        Pendiente
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                        {appr.description}
                      </p>
                      {appr.estimated_cost && (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                          <DollarSign size={13} />
                          Costo Estimado: {appr.estimated_cost.toFixed(2)} USD
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        <User size={10} />
                        Solicitado por: <span className="text-zinc-400">{appr.requested_by}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-zinc-900 pt-3">
                      <button
                        onClick={() => handleApprovalAction(appr.id, 'APROBADO')}
                        disabled={actioningId !== null}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        Autorizar
                      </button>
                      <button
                        onClick={() => handleApprovalAction(appr.id, 'RECHAZADO')}
                        disabled={actioningId !== null}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold py-2 rounded-lg transition disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Work Orders Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders size={15} className="text-sky-400" />
                Flujo de Órdenes de Trabajo Activas
              </h3>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Buscar placa o modelo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500/40 w-44"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {workOrders
                .filter(wo => {
                  const matchSearch = wo.plate.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      wo.model.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      wo.brand.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchSearch;
                })
                .map(wo => (
                  <div key={wo.id} className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                        <span className="font-bold text-sm text-white">OT #{wo.order_number}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(wo.status)}`}>
                          {wo.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-sky-400 block">{wo.brand} {wo.model}</span>
                        <span className="text-[10px] text-zinc-550 block font-mono">Placa: {wo.plate} {wo.year ? `| Año: ${wo.year}` : ''}</span>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed italic bg-zinc-950/40 p-2 rounded border border-zinc-900">
                        {wo.reported_issue || 'Sin falla reportada inicialmente'}
                      </p>
                    </div>

                    <div className="border-t border-zinc-850 pt-2 flex items-center justify-between text-[10px] text-zinc-500">
                      <span className={`px-2 py-0.2 rounded ${getPriorityColor(wo.priority)}`}>
                        Prioridad: {wo.priority}
                      </span>
                      <span>Mecánico: <strong className="text-zinc-400">{wo.assigned_technician || 'Sin asignar'}</strong></span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>
      )}

      {/* RENDER VIEW: INVENTORY */}
      {!loading && !error && type === 'inventario' && (
        <div className="space-y-6">
          
          {/* Add inventory form */}
          {showAddInv && (
            <form onSubmit={handleAddInventory} className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">SKU</label>
                <input 
                  type="text" 
                  value={newInv.sku}
                  onChange={(e) => setNewInv(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="OIL-5W30-TAC" 
                  required
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-sky-500/40"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Nombre del repuesto/fluido</label>
                <input 
                  type="text" 
                  value={newInv.name}
                  onChange={(e) => setNewInv(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Aceite Tacoma 5W-30 (Litro)" 
                  required
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-sky-500/40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Categoría</label>
                <select 
                  value={newInv.category}
                  onChange={(e) => setNewInv(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-sky-500/40"
                >
                  <option value="REPUESTO">Repuesto</option>
                  <option value="FLUIDO">Fluido</option>
                  <option value="CONSUMIBLE">Consumible</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Stock Actual</label>
                <input 
                  type="number" 
                  step="any"
                  value={newInv.quantity}
                  onChange={(e) => setNewInv(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Stock Mínimo</label>
                <input 
                  type="number" 
                  step="any"
                  value={newInv.min_stock}
                  onChange={(e) => setNewInv(prev => ({ ...prev, min_stock: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Costo Unitario ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={newInv.cost_per_unit}
                  onChange={(e) => setNewInv(prev => ({ ...prev, cost_per_unit: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Precio Venta ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={newInv.sale_price}
                  onChange={(e) => setNewInv(prev => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Ubicación</label>
                <input 
                  type="text" 
                  value={newInv.location}
                  onChange={(e) => setNewInv(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Pasillo A-04" 
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Proveedor</label>
                <input 
                  type="text" 
                  value={newInv.supplier}
                  onChange={(e) => setNewInv(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="AutoParts Distribuidor" 
                  className="w-full bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs text-white rounded-lg focus:outline-none"
                />
              </div>
              <div className="md:col-span-4 flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddInv(false)}
                  className="text-xs text-zinc-400 hover:text-white px-4 py-2"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="text-xs text-white bg-sky-500 hover:bg-sky-400 px-5 py-2 rounded-xl font-bold transition"
                >
                  Guardar en Inventario
                </button>
              </div>
            </form>
          )}

          {/* Low stock notifications */}
          {inventory.filter(item => item.quantity <= item.min_stock).length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold text-xs text-amber-300 block">Alerta: Niveles de Stock Críticos Detectados</span>
                <span className="text-zinc-400 text-[11px] leading-relaxed">
                  Hay {inventory.filter(item => item.quantity <= item.min_stock).length} artículo(s) que han alcanzado o bajado de su stock mínimo de advertencia.
                </span>
              </div>
            </div>
          )}

          {/* Inventory Table */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-850 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4">SKU</th>
                    <th className="p-4">Artículo</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Costo / Venta</th>
                    <th className="p-4">Ubicación</th>
                    <th className="p-4">Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => {
                    const isLow = item.quantity <= item.min_stock;
                    return (
                      <tr 
                        key={item.id} 
                        className={`border-b border-zinc-850/50 hover:bg-zinc-850/20 transition ${
                          isLow ? 'bg-amber-500/2' : ''
                        }`}
                      >
                        <td className="p-4 font-mono text-[11px] text-zinc-400">{item.sku}</td>
                        <td className="p-4 font-bold text-white">
                          {item.name}
                          {isLow && (
                            <span className="ml-2 text-[9px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                              STOCK BAJO
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            item.category === 'FLUIDO' ? 'bg-teal-500/5 text-teal-400 border-teal-500/10' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white">
                          <span className={isLow ? 'text-amber-400' : 'text-zinc-200'}>
                            {item.quantity} {item.unit}s
                          </span>
                          <span className="block text-[10px] text-zinc-550 font-normal">Mínimo: {item.min_stock}</span>
                        </td>
                        <td className="p-4 text-zinc-300">
                          <strong>${item.cost_per_unit.toFixed(2)}</strong> / <strong className="text-emerald-400">${item.sale_price.toFixed(2)}</strong>
                        </td>
                        <td className="p-4 text-zinc-400 font-medium">
                          {item.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="text-zinc-500" />
                              {item.location}
                            </span>
                          ) : 'N/A'}
                        </td>
                        <td className="p-4 text-zinc-400">{item.supplier || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* RENDER VIEW: ALERTS & LOGISTICS */}
      {!loading && !error && type === 'alertas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Real-time System Alerts */}
          <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl shadow space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-500" />
              Alertas del Sistema Clasificadas por IA
            </h3>

            {alerts.length === 0 ? (
              <div className="text-zinc-500 text-xs py-10 text-center bg-zinc-950/40 border border-zinc-900 rounded-xl">
                🟢 No hay alertas operativas detectadas por el bot.
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {alerts.map(alt => (
                  <div 
                    key={alt.id} 
                    className={`p-4 border rounded-xl space-y-2 transition ${
                      alt.severity === 'CRITICA' 
                        ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40' 
                        : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white block">{alt.title}</span>
                      <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-extrabold border ${
                        alt.severity === 'CRITICA' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {alt.severity}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {alt.message}
                    </p>

                    {alt.keywords_detected && alt.keywords_detected.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-zinc-850">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Tags detectados:</span>
                        {alt.keywords_detected.map((tag, idx) => (
                          <span key={idx} className="bg-zinc-800 text-zinc-300 text-[9px] px-1.5 py-0.2 rounded border border-zinc-700">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logistics Tracking */}
          <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl shadow space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Truck size={16} className="text-sky-400" />
              Rastreo Logístico de Repuestos (Tránsito)
            </h3>

            {logistics.length === 0 ? (
              <div className="text-zinc-500 text-xs py-10 text-center bg-zinc-950/40 border border-zinc-900 rounded-xl">
                📦 No hay repuestos en tránsito en este momento.
              </div>
            ) : (
              <div className="space-y-3">
                {logistics.map(log => (
                  <div key={log.id} className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-3 hover:border-zinc-850 transition">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div>
                        <strong className="text-xs text-white block">{log.part_name}</strong>
                        {log.plate && <span className="text-[10px] text-zinc-500 font-mono">Vehículo: {log.plate}</span>}
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                      <div>
                        <span className="text-zinc-550 block text-[9px] uppercase font-bold">Courier / Tracking</span>
                        <span>{log.tracking_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-550 block text-[9px] uppercase font-bold">Fecha Estimada (ETA)</span>
                        <span>{log.eta_date || 'Sin fecha'}</span>
                      </div>
                    </div>

                    {log.notes && (
                      <p className="text-[10px] text-zinc-500 bg-zinc-900/40 p-2 rounded border border-zinc-850">
                        <strong>Nota:</strong> {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
