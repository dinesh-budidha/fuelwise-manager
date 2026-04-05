import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { FuelRecord, COLUMNS } from '@/types/fuel';
import * as XLSX from 'xlsx';

interface Props {
  records: FuelRecord[];
}

export default function ExportButton({ records }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchAllSheets = async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sheets-api?action=get_all`;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
      });
      if (!res.ok) throw new Error('Failed to fetch data');
      return await res.json();
    } catch {
      return null;
    }
  };

  const exportFile = async (type: 'xlsx' | 'csv') => {
    setExporting(true);
    try {
      const data = await fetchAllSheets();
      const wb = XLSX.utils.book_new();

      if (data?.sheet1) {
        // sheet1 includes headers as first row
        const ws1 = XLSX.utils.aoa_to_sheet(data.sheet1);
        XLSX.utils.book_append_sheet(wb, ws1, 'Sheet1');
      } else {
        // Fallback to local records
        const rows = records.map(r => ({
          [COLUMNS[0]]: r.slNo, [COLUMNS[1]]: r.siteName, [COLUMNS[2]]: r.vehicleSentToLocation || '',
          [COLUMNS[3]]: r.vehicleNo, [COLUMNS[4]]: r.vehicleType, [COLUMNS[5]]: r.fuelType,
          [COLUMNS[6]]: r.vehicleOwnership, [COLUMNS[7]]: r.issuedDate, [COLUMNS[8]]: r.fuelAlloted,
          [COLUMNS[9]]: r.issuedThrough, [COLUMNS[10]]: r.issuedThroughValue,
          [COLUMNS[11]]: r.startingReading, [COLUMNS[12]]: r.endingReading, [COLUMNS[13]]: r.kilometers,
          [COLUMNS[14]]: r.hours, [COLUMNS[15]]: r.kmPerLtr, [COLUMNS[16]]: r.usedInLtrs,
          [COLUMNS[17]]: r.balanceLiters, [COLUMNS[18]]: r.dgCapacity,
        }));
        const ws1 = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws1, 'Sheet1');
      }

      if (data?.purchases) {
        const ws2 = XLSX.utils.aoa_to_sheet(data.purchases);
        XLSX.utils.book_append_sheet(wb, ws2, 'FuelPurchases');
      }

      XLSX.writeFile(wb, `fuel-data.${type}`);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-secondary flex items-center gap-2">
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 card-raised border border-border py-1 min-w-[140px]">
            <button onClick={() => exportFile('xlsx')} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
              Excel (.xlsx)
            </button>
            <button onClick={() => exportFile('csv')} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
              CSV (.csv)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
