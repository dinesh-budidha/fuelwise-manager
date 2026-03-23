import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { FuelRecord, COLUMNS } from '@/types/fuel';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface Props {
  records: FuelRecord[];
}

export default function ExportButton({ records }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchLatestData = async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sheets-api?action=get`;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
      });
      if (!res.ok) throw new Error('Failed to fetch latest data');
      const data = await res.json();
      return data.rows as string[][] || [];
    } catch {
      // Fallback to local records
      return null;
    }
  };

  const getData = (rows: string[][] | null) => {
    if (rows) {
      return rows.map(row =>
        COLUMNS.reduce((obj, col, i) => ({ ...obj, [col]: row[i] || '' }), {} as Record<string, string>)
      );
    }
    // Fallback to local records
    return records.map(r => ({
      [COLUMNS[0]]: r.slNo,
      [COLUMNS[1]]: r.siteName,
      [COLUMNS[2]]: r.vehicleNo,
      [COLUMNS[3]]: r.vehicleType,
      [COLUMNS[4]]: r.fuelType,
      [COLUMNS[5]]: r.vehicleOwnership,
      [COLUMNS[6]]: r.issuedDate,
      [COLUMNS[7]]: r.fuelAlloted,
      [COLUMNS[8]]: r.issuedThrough,
      [COLUMNS[9]]: r.issuedThroughValue,
      [COLUMNS[10]]: r.startingReading,
      [COLUMNS[11]]: r.endingReading,
      [COLUMNS[12]]: r.kilometers,
      [COLUMNS[13]]: r.hours,
      [COLUMNS[14]]: r.kmPerLtr,
      [COLUMNS[15]]: r.usedInLtrs,
      [COLUMNS[16]]: r.balanceLiters,
      [COLUMNS[17]]: r.dgCapacity,
    }));
  };

  const exportFile = async (type: 'xlsx' | 'csv') => {
    setExporting(true);
    try {
      const rows = await fetchLatestData();
      const ws = XLSX.utils.json_to_sheet(getData(rows));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fuel Data');
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
