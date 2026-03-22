import React, { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { FuelPurchase } from '@/types/fuelPurchase';
import { FUEL_TYPES } from '@/types/fuel';
import { toIndianDate } from '@/lib/dateUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle } from
'@/components/ui/alert-dialog';

interface Props {
  purchases: FuelPurchase[];
  allPurchases: FuelPurchase[];
  loading: boolean;
  onAdd: (date: string, liters: number, site: string, fuelType: string) => Promise<boolean>;
  onDelete: (index: number) => Promise<boolean>;
  totalPurchased: number;
  totalAlloted: number;
  siteAllotedMap: Record<string, number>;
  siteOptions: string[];
  selectedSite: string;
}

export default function FuelPurchaseForm({ purchases, allPurchases, loading, onAdd, onDelete, totalPurchased, totalAlloted, siteAllotedMap, siteOptions, selectedSite }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [liters, setLiters] = useState<number>(0);
  const [site, setSite] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [submitting, setSubmitting] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [filterSite, setFilterSite] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || liters <= 0 || !site.trim()) return;
    setSubmitting(true);
    const success = await onAdd(date, liters, site.trim(), fuelType);
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

  const filteredPurchases = purchases.filter((p) => {
    if (filterSite && p.site !== filterSite) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        p.date.toLowerCase().includes(term) ||
        p.site.toLowerCase().includes(term) ||
        p.fuelType.toLowerCase().includes(term));

    }
    return true;
  });

  // Calculate site-wise running totals for opening balance
  // Each site's balance = cumulative purchased for that site - total alloted for that site
  const siteRunningTotals: Record<string, number> = {};

  return (
    <div className="card-raised p-5 space-y-4">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <Plus size={14} className="text-primary" /> FUEL PURCHASE ENTRY
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="label-uppercase">Purchase Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-recessed" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-uppercase">FUEL PURCHASED IN LITERS</label>
          <input
            type="number" step="any" min="0"
            value={liters || ''}
            onChange={(e) => setLiters(Math.max(0, Number(e.target.value) || 0))}
            className="input-recessed tabular-nums" />
          
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-uppercase">Site Location *</label>
          <input
            list="purchase-sites"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="input-recessed"
            placeholder="Select or type site"
            required />
          
          <datalist id="purchase-sites">
            {siteOptions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-uppercase">Fuel Type</label>
          <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="input-recessed">
            {FUEL_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
          </select>
        </div>
        <button type="submit" disabled={submitting || liters <= 0 || !site.trim()} className="btn-primary py-2 px-4 disabled:opacity-50">
          {submitting ? 'Saving...' : 'Add Purchase'}
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            placeholder="Search date, site, fuel type..."
            className="input-recessed w-full pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} />
          
        </div>
        <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} className="input-recessed text-xs min-w-[120px]">
          <option value="">All Sites</option>
          {siteOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-muted-foreground tabular-nums">
          {filteredPurchases.length} of {purchases.length} records
        </span>
      </div>

      {/* Purchase History */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="label-uppercase">Purchase History</span>
          <span className="text-xs font-semibold text-primary tabular-nums">
            Total: {totalPurchased.toLocaleString()} L
          </span>
        </div>

        {loading ?
        <p className="text-sm text-muted-foreground py-3">Loading...</p> :
        filteredPurchases.length === 0 ?
        <p className="text-sm text-muted-foreground py-3">No purchases recorded yet</p> :

        <div className="max-h-[300px] overflow-y-auto border border-border rounded">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="th-header">Date</th>
                  <th className="th-header">Site</th>
                  <th className="th-header">Fuel Type</th>
                  <th className="th-header text-right">Liters</th>
                  <th className="th-header text-right">Opening Balance</th>
                  <th className="th-header text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredPurchases.map((p, i) => {
                // Running total per site independently
                const siteName = p.site;
                if (!siteRunningTotals[siteName]) siteRunningTotals[siteName] = 0;
                siteRunningTotals[siteName] += p.liters;
                const siteAlloted = siteAllotedMap[siteName] || 0;
                const openingBal = siteRunningTotals[siteName] - siteAlloted;

                const origIdx = allPurchases.findIndex((op) => op.id === p.id);
                return (
                  <tr key={p.id} className="hover:bg-primary/[0.03] group">
                      <td className="td-cell text-muted-foreground">{toIndianDate(p.date)}</td>
                      <td className="td-cell">{p.site}</td>
                      <td className="td-cell">{p.fuelType}</td>
                      <td className="td-cell text-right tabular-nums font-medium">{p.liters.toLocaleString()}</td>
                      <td className={`td-cell text-right tabular-nums font-medium ${openingBal < 100 ? 'text-destructive' : 'text-primary'}`}>
                        {openingBal.toLocaleString()} L
                      </td>
                      <td className="td-cell text-center">
                        <button
                        onClick={() => setDeleteIdx(origIdx)}
                        className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                        
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>);

              })}
              </tbody>
            </table>
          </div>
        }
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
    </div>);

}