import { useState, useCallback } from 'react';
import { FuelPurchase, rowToPurchase, purchaseToRow } from '@/types/fuelPurchase';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

async function apiFetch(action: string, body?: Record<string, unknown>) {
  if (body) {
    const { data, error } = await supabase.functions.invoke('sheets-api', {
      body: { ...body, action },
    });
    if (error) throw new Error(error.message);
    return data;
  } else {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sheets-api?action=${action}`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}

export function useFuelPurchases() {
  const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('get_purchases');
      const rows: string[][] = data.rows || [];
      setPurchases(rows.map((row, i) => rowToPurchase(row, i)));
    } catch (err: any) {
      toast({ title: 'Error fetching purchases', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const addPurchase = useCallback(async (date: string, liters: number, site: string, fuelType: string) => {
    try {
      await apiFetch('append_purchase', { row: purchaseToRow({ date, liters, site, fuelType }) });
      toast({ title: 'Purchase recorded' });
      await fetchPurchases();
      return true;
    } catch (err: any) {
      toast({ title: 'Error adding purchase', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [fetchPurchases]);

  const deletePurchase = useCallback(async (index: number) => {
    try {
      await apiFetch('delete_purchase', { rowIndex: index + 2 });
      toast({ title: 'Purchase deleted' });
      await fetchPurchases();
      return true;
    } catch (err: any) {
      toast({ title: 'Error deleting purchase', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [fetchPurchases]);

  const totalPurchased = purchases.reduce((s, p) => s + p.liters, 0);

  return { purchases, loading, fetchPurchases, addPurchase, deletePurchase, totalPurchased };
}
