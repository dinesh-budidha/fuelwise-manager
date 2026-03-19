import { useState, useCallback } from 'react';
import { FuelRecord, FuelFormData, EMPTY_FORM, calculateFields, recordToRow, rowToRecord } from '@/types/fuel';
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
    // GET request - use query param
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sheets-api?action=${action}`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}

export function useFuelData() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/sheets-api?action=get');
      const rows: string[][] = data.rows || [];
      setRecords(rows.map((row, i) => rowToRecord(row, i)));
    } catch (err: any) {
      toast({ title: 'Error fetching data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const addRecord = useCallback(async (formData: FuelFormData) => {
    const calcs = calculateFields(formData);
    const full = { ...formData, ...calcs };
    try {
      await apiFetch('append', { row: recordToRow(full) });
      toast({ title: 'Record added successfully' });
      await fetchRecords();
      return true;
    } catch (err: any) {
      toast({ title: 'Error adding record', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [fetchRecords]);

  const updateRecord = useCallback(async (index: number, formData: FuelFormData) => {
    const calcs = calculateFields(formData);
    const full = { ...formData, ...calcs };
    try {
      await apiFetch('update', { rowIndex: index + 2, row: recordToRow(full) });
      toast({ title: 'Record updated successfully' });
      await fetchRecords();
      return true;
    } catch (err: any) {
      toast({ title: 'Error updating record', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (index: number) => {
    try {
      await apiFetch('/sheets-api', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', rowIndex: index + 2 }),
      });
      toast({ title: 'Record deleted successfully' });
      await fetchRecords();
      return true;
    } catch (err: any) {
      toast({ title: 'Error deleting record', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [fetchRecords]);

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.vehicleNo.toLowerCase().includes(term) ||
      r.vehicleType.toLowerCase().includes(term) ||
      r.siteName.toLowerCase().includes(term)
    );
  });

  return {
    records: filteredRecords,
    allRecords: records,
    loading,
    searchTerm,
    setSearchTerm,
    fetchRecords,
    addRecord,
    updateRecord,
    deleteRecord,
  };
}
