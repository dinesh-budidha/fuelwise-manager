import { useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useFuelData } from '@/hooks/useFuelData';
import { FuelRecord, FuelFormData } from '@/types/fuel';
import FuelForm from '@/components/FuelForm';
import FuelTable from '@/components/FuelTable';
import DashboardSummary from '@/components/DashboardSummary';
import ExportButton from '@/components/ExportButton';

export default function Index() {
  const {
    records, allRecords, loading, searchTerm, setSearchTerm,
    fetchRecords, addRecord, updateRecord, deleteRecord,
  } = useFuelData();

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<FuelFormData | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleEdit = (index: number, record: FuelRecord) => {
    setEditIndex(index);
    const { id, ...formData } = record;
    setEditData(formData);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (data: FuelFormData) => {
    if (editIndex !== null) {
      const success = await updateRecord(editIndex, data);
      if (success) {
        setEditIndex(null);
        setEditData(null);
      }
      return success;
    }
    return addRecord(data);
  };

  const handleDelete = async (index: number) => {
    await deleteRecord(index);
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditData(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Header */}
      <header className="max-w-[1600px] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Fuel Operations</h1>
          <p className="text-muted-foreground text-sm">Fleet telemetry and consumption tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRecords} className="btn-secondary flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <ExportButton records={allRecords} />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto space-y-6">
        {/* Summary */}
        <DashboardSummary records={allRecords} />

        {/* Form + Table */}
        <div className="grid grid-cols-12 gap-6">
          {/* Form Panel */}
          <div className="col-span-12 xl:col-span-4">
            <FuelForm
              onSubmit={handleSubmit}
              editData={editData}
              onCancelEdit={handleCancelEdit}
              nextSlNo={allRecords.length + 1}
            />
          </div>

          {/* Table Panel */}
          <div className="col-span-12 xl:col-span-8 space-y-3">
            {/* Search */}
            <div className="card-raised p-3 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input
                  placeholder="Search Vehicle No, Type, or Site..."
                  className="input-recessed w-full pl-9"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {records.length} of {allRecords.length} records
              </span>
            </div>

            <FuelTable
              records={records}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
