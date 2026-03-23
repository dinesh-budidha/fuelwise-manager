import React, { useState } from 'react';
import { FuelRecord } from '@/types/fuel';
import { toIndianDate } from '@/lib/dateUtils';
import { Edit3, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  records: FuelRecord[];
  loading: boolean;
  onEdit: (index: number, record: FuelRecord) => void;
  onDelete: (index: number) => void;
}

type SortKey = keyof FuelRecord;
type SortDir = 'asc' | 'desc';

const COLS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'slNo', label: 'Sl.No.' },
  { key: 'siteName', label: 'Site' },
  { key: 'vehicleNo', label: 'Vehicle No' },
  { key: 'vehicleType', label: 'Type' },
  { key: 'fuelType', label: 'Fuel' },
  { key: 'vehicleOwnership', label: 'Own.' },
  { key: 'issuedDate', label: 'Date' },
  { key: 'fuelAlloted', label: 'Fuel Allot.', numeric: true },
  { key: 'issuedThrough', label: 'ISSUED THROUGH\n(BARREL/INDENT)' },
  { key: 'issuedThroughValue', label: 'INDENT NUMBER' },
  { key: 'startingReading', label: 'Start', numeric: true },
  { key: 'endingReading', label: 'End', numeric: true },
  { key: 'kilometers', label: 'KMs', numeric: true },
  { key: 'hours', label: 'Hrs', numeric: true },
  { key: 'kmPerLtr', label: 'KM/L', numeric: true },
  { key: 'usedInLtrs', label: 'Used', numeric: true },
  { key: 'balanceLiters', label: 'Balance', numeric: true },
];

export default function FuelTable({ records, loading, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('slNo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...records].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const confirmDelete = () => {
    if (deleteIdx !== null) {
      const originalIndex = records.indexOf(sorted[deleteIdx] || records[deleteIdx]);
      onDelete(originalIndex >= 0 ? originalIndex : deleteIdx);
      setDeleteIdx(null);
    }
  };

  return (
    <div className="card-raised overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1400px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`th-header cursor-pointer select-none hover:text-foreground transition-colors whitespace-pre-line ${col.numeric ? 'text-right' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                    )}
                  </span>
                </th>
              ))}
              <th className="th-header text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr>
                <td colSpan={18} className="td-cell text-center text-muted-foreground py-12">
                  Loading records...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={18} className="td-cell text-center text-muted-foreground py-12">
                  No records found
                </td>
              </tr>
            ) : (
              sorted.map((rec, i) => {
                const origIdx = records.findIndex(r => r.id === rec.id);
                return (
                  <tr key={rec.id} className="hover:bg-primary/[0.03] transition-colors group">
                    <td className="td-cell font-medium">{rec.slNo}</td>
                    <td className="td-cell">{rec.siteName}</td>
                    <td className="td-cell tabular-nums font-medium">{rec.vehicleNo}</td>
                    <td className="td-cell">{rec.vehicleType}{rec.dgCapacity ? ` (${rec.dgCapacity})` : ''}</td>
                    <td className="td-cell">{rec.fuelType}</td>
                    <td className="td-cell">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        rec.vehicleOwnership === 'Company' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {rec.vehicleOwnership === 'Company' ? 'CO' : 'PV'}
                      </span>
                    </td>
                    <td className="td-cell text-muted-foreground">{toIndianDate(rec.issuedDate)}</td>
                    <td className="td-cell text-right tabular-nums">{rec.fuelAlloted}</td>
                    <td className="td-cell">{rec.issuedThrough || '—'}</td>
                    <td className="td-cell">{rec.issuedThroughValue || '—'}</td>
                    <td className="td-cell text-right tabular-nums">{rec.startingReading}</td>
                    <td className="td-cell text-right tabular-nums">{rec.endingReading}</td>
                    <td className="td-cell text-right tabular-nums font-medium">{rec.kilometers}</td>
                    <td className="td-cell text-right tabular-nums">{rec.hours}</td>
                    <td className="td-cell text-right tabular-nums font-semibold text-primary">{rec.kmPerLtr}</td>
                    <td className="td-cell text-right tabular-nums">{rec.usedInLtrs}</td>
                    <td className="td-cell text-right tabular-nums">{rec.balanceLiters}</td>
                    <td className="td-cell text-center">
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(origIdx, rec)}
                          className="p-1 text-muted-foreground hover:text-primary rounded transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteIdx(i)}
                          className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={deleteIdx !== null} onOpenChange={() => setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
