import { useEffect, useState } from 'react';
import { Search, RefreshCw, Fuel, Truck } from 'lucide-react';
import { useFuelData } from '@/hooks/useFuelData';
import { useFuelPurchases } from '@/hooks/useFuelPurchases';
import { FuelRecord, FuelFormData } from '@/types/fuel';
import FuelForm from '@/components/FuelForm';
import FuelTable from '@/components/FuelTable';
import FuelPurchaseForm from '@/components/FuelPurchaseForm';
import DashboardSummary from '@/components/DashboardSummary';
import ExportButton from '@/components/ExportButton';

export default function Index() {
  const {
    records, allRecords, loading, searchTerm, setSearchTerm,
    fetchRecords, addRecord, updateRecord, deleteRecord,
  } = useFuelData();

  const {
    purchases, loading: purchasesLoading, fetchPurchases,
    addPurchase, deletePurchase, totalPurchased,
  } = useFuelPurchases();

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<FuelFormData | null>(null);
  const [activeTab, setActiveTab] = useState<'vehicle' | 'purchase'>('vehicle');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterSite, setFilterSite] = useState('');

  useEffect(() => {
    fetchRecords();
    fetchPurchases();
  }, [fetchRecords, fetchPurchases]);

  const handleRefresh = () => {
    fetchRecords();
    fetchPurchases();
  };

  const handleEdit = (index: number, record: FuelRecord) => {
    setEditIndex(index);
    const { id, ...formData } = record;
    setEditData(formData);
    setActiveTab('vehicle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (data: FuelFormData) => {
    if (editIndex !== null) {
      const success = await updateRecord(editIndex, data);
      if (success) { setEditIndex(null); setEditData(null); }
      return success;
    }
    return addRecord(data);
  };

  const handleCancelEdit = () => { setEditIndex(null); setEditData(null); };

  // Unique values for filters
  const uniqueVehicles = [...new Set(allRecords.map(r => r.vehicleNo).filter(Boolean))];
  const uniqueSites = [...new Set(allRecords.map(r => r.siteName).filter(Boolean))];

  // Apply filters on top of search
  const filteredRecords = records.filter(r => {
    if (filterVehicle && r.vehicleNo !== filterVehicle) return false;
    if (filterSite && r.siteName !== filterSite) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Header */}
      <header className="max-w-[1600px] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Fuel Operations</h1>
          <p className="text-muted-foreground text-sm">Fleet telemetry and consumption tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <ExportButton records={allRecords} />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto space-y-6">
        {/* Summary with Opening Balance */}
        <DashboardSummary records={allRecords} totalPurchased={totalPurchased} />

        {/* Tab Switcher */}
        <div className="card-raised p-1 flex gap-1 w-fit">
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'vehicle' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Truck size={14} /> Vehicle Entry
          </button>
          <button
            onClick={() => setActiveTab('purchase')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'purchase' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Fuel size={14} /> Fuel Purchase
          </button>
        </div>

        {/* Vehicle Entry Tab */}
        {activeTab === 'vehicle' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-4">
              <FuelForm
                onSubmit={handleSubmit}
                editData={editData}
                onCancelEdit={handleCancelEdit}
                nextSlNo={allRecords.length + 1}
              />
            </div>
            <div className="col-span-12 xl:col-span-8 space-y-3">
              {/* Search + Filters */}
              <div className="card-raised p-3 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <input
                    placeholder="Search Vehicle No, Type, or Site..."
                    className="input-recessed w-full pl-9"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterVehicle}
                  onChange={e => setFilterVehicle(e.target.value)}
                  className="input-recessed text-xs min-w-[120px]"
                >
                  <option value="">All Vehicles</option>
                  {uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select
                  value={filterSite}
                  onChange={e => setFilterSite(e.target.value)}
                  className="input-recessed text-xs min-w-[120px]"
                >
                  <option value="">All Sites</option>
                  {uniqueSites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {filteredRecords.length} of {allRecords.length} records
                </span>
              </div>
              <FuelTable records={filteredRecords} loading={loading} onEdit={handleEdit} onDelete={deleteRecord} />
            </div>
          </div>
        )}

        {/* Fuel Purchase Tab */}
        {activeTab === 'purchase' && (
          <div className="max-w-2xl">
            <FuelPurchaseForm
              purchases={purchases}
              loading={purchasesLoading}
              onAdd={addPurchase}
              onDelete={deletePurchase}
              totalPurchased={totalPurchased}
            />
          </div>
        )}
      </main>
    </div>
  );
}
