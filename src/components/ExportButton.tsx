import { useState } from 'react';
import { Download } from 'lucide-react';
import { FuelRecord, COLUMNS } from '@/types/fuel';
import * as XLSX from 'xlsx';

interface Props {
  records: FuelRecord[];
}

export default function ExportButton({ records }: Props) {
  const [open, setOpen] = useState(false);

  const getData = () => {
    return records.map(r => ({
      [COLUMNS[0]]: r.slNo,
      [COLUMNS[1]]: r.siteName,
      [COLUMNS[2]]: r.litersPurchased,
      [COLUMNS[3]]: r.issuedDate,
      [COLUMNS[4]]: r.vehicleOwnership,
      [COLUMNS[5]]: r.vehicleType,
      [COLUMNS[6]]: r.vehicleNo,
      [COLUMNS[7]]: r.fuelAlloted,
      [COLUMNS[8]]: r.startingReading,
      [COLUMNS[9]]: r.endingReading,
      [COLUMNS[10]]: r.kilometers,
      [COLUMNS[11]]: r.hours,
      [COLUMNS[12]]: r.kmPerLtr,
      [COLUMNS[13]]: r.usedInLtrs,
      [COLUMNS[14]]: r.balanceLiters,
    }));
  };

  const exportFile = (type: 'xlsx' | 'csv') => {
    const ws = XLSX.utils.json_to_sheet(getData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fuel Data');
    XLSX.writeFile(wb, `fuel-data.${type}`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-secondary flex items-center gap-2">
        <Download size={14} /> Export
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
