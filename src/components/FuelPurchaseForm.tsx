import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FuelPurchase } from '@/types/fuelPurchase';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  purchases: FuelPurchase[];
  loading: boolean;
  onAdd: (date: string, liters: number) => Promise<boolean>;
  onDelete: (index: number) => Promise<boolean>;
  totalPurchased: number;
  totalAlloted: number;
}

export default function FuelPurchaseForm({ purchases, loading, onAdd, onDelete, totalPurchased, totalAlloted }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [liters, setLiters] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || liters <= 0) return;
    setSubmitting(true);
    const success = await onAdd(date, liters);
    if (success) {
      setLiters(0);
      setDate(new Date().toISOString().split('T')[0]);
    }
    setSubmitting(false);
  };

  const confirmDelete = async () => {
    if (deleteIdx !== null) {
      await onDelete(deleteIdx);
      setDeleteIdx(null);
    }
  };

  // Running balance per row
  let runningTotal = 0;

  return (
    <div className="card-raised p-5 space-y-4">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <Plus size={14} className="text-primary" /> FUEL PURCHASE ENTRY
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="label-uppercase">Purchase Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-recessed" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
          <label className="label-uppercase">Liters Purchased</label>
          <input
            type="number" step="any" min="0"
            value={liters || ''}
            onChange={e => setLiters(Math.max(0, Number(e.target.value) || 0))}
            className="input-recessed tabular-nums"
          />
        </div>
        <button type="submit" disabled={submitting || liters <= 0} className="btn-primary py-2 px-4 disabled:opacity-50">
          {submitting ? 'Saving...' : 'Add Purchase'}
        </button>
      </form>

      {/* Purchase History with Opening Balance */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="label-uppercase">Purchase History</span>
          <span className="text-xs font-semibold text-primary tabular-nums">
            Total: {totalPurchased.toLocaleString()} L
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-3">Loading...</p>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No purchases recorded yet</p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto border border-border rounded">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="th-header">Date</th>
                  <th className="th-header text-right">Liters</th>
                  <th className="th-header text-right">Opening Balance</th>
                  <th className="th-header text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {purchases.map((p, i) => {
                  runningTotal += p.liters;
                  const openingBal = runningTotal - totalUsed;
                  return (
                    <tr key={p.id} className="hover:bg-primary/[0.03] group">
                      <td className="td-cell text-muted-foreground">{p.date}</td>
                      <td className="td-cell text-right tabular-nums font-medium">{p.liters.toLocaleString()}</td>
                      <td className={`td-cell text-right tabular-nums font-medium ${openingBal < 100 ? 'text-destructive' : 'text-primary'}`}>
                        {openingBal.toLocaleString()} L
                      </td>
                      <td className="td-cell text-center">
                        <button
                          onClick={() => setDeleteIdx(i)}
                          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={deleteIdx !== null} onOpenChange={() => setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
            <AlertDialogDescription>Remove this fuel purchase record permanently?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
