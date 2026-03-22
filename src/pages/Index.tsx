import { useEffect, useState } from 'react';
import { Search, RefreshCw, Fuel, Truck, MapPin } from 'lucide-react';
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
    fetchRecords, addRecord, updateRecord, deleteRecord, getVehicleLastEntry,
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
  const [globalSite, setGlobalSite] = useState('');

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

  const totalAlloted = allRecords.reduce((s, r) => s + r.fuelAlloted, 0);

  // Build site-wise alloted map
  const siteAllotedMap: Record<string, number> = {};
  allRecords.forEach(r => {
    if (r.siteName) {
      siteAllotedMap[r.siteName] = (siteAllotedMap[r.siteName] || 0) + r.fuelAlloted;
    }
  });

  // Collect all unique sites
  const allSites = [...new Set([
    ...allRecords.map(r => r.siteName).filter(Boolean),
    ...purchases.map(p => p.site).filter(Boolean),
  ])].sort();

  const uniqueVehicles = [...new Set(allRecords.map(r => r.vehicleNo).filter(Boolean))];

  // Apply global site filter then local filters
  const globalFiltered = globalSite ? records.filter(r => r.siteName === globalSite) : records;
  const filteredRecords = globalFiltered.filter(r => {
    if (filterVehicle && r.vehicleNo !== filterVehicle) return false;
    if (filterSite && r.siteName !== filterSite) return false;
    return true;
  });

  // Purchases filtered by global site
  const displayedPurchases = globalSite ? purchases.filter(p => p.site === globalSite) : purchases;
  const displayedTotalPurchased = displayedPurchases.reduce((s, p) => s + p.liters, 0);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Company Header */}
      <div className="max-w-[1600px] mx-auto mb-6 text-center">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
          SRI KEERTHI PROJECTS PVT. LTD.
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Fuel Consumption Tracking</p>
      </div>

      <header className="max-w-[1600px] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-muted-foreground" />
            <select
              value={globalSite}
              onChange={e => setGlobalSite(e.target.value)}
              className="input-recessed text-sm min-w-[160px]"
            >
              <option value="">All Sites</option>
              {allSites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <ExportButton records={allRecords} />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto space-y-6">
        <DashboardSummary
          records={allRecords}
          purchases={purchases}
          totalPurchased={totalPurchased}
          totalAlloted={totalAlloted}
          selectedSite={globalSite}
        />

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

        {activeTab === 'vehicle' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-4">
              <FuelForm
                onSubmit={handleSubmit}
                editData={editData}
                onCancelEdit={handleCancelEdit}
                nextSlNo={allRecords.length + 1}
                onVehicleNoBlur={getVehicleLastEntry}
              />
            </div>
            <div className="col-span-12 xl:col-span-8 space-y-3">
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
                <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} className="input-recessed text-xs min-w-[120px]">
                  <option value="">All Vehicles</option>
                  {uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="input-recessed text-xs min-w-[120px]">
                  <option value="">All Sites</option>
                  {allSites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {filteredRecords.length} of {allRecords.length} records
                </span>
              </div>
              <FuelTable records={filteredRecords} loading={loading} onEdit={handleEdit} onDelete={deleteRecord} />
            </div>
          </div>
        )}

        {activeTab === 'purchase' && (
          <div className="max-w-3xl">
            <FuelPurchaseForm
              purchases={displayedPurchases}
              allPurchases={purchases}
              loading={purchasesLoading}
              onAdd={addPurchase}
              onDelete={deletePurchase}
              totalPurchased={displayedTotalPurchased}
              totalAlloted={totalAlloted}
              siteAllotedMap={siteAllotedMap}
              siteOptions={allSites}
              selectedSite={globalSite}
            />
          </div>
        )}
      </main>
    </div>
  );
}
