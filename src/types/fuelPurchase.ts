export interface FuelPurchase {
  id: string;
  date: string;
  liters: number;
  site: string;
  fuelType: string;
}

export function purchaseToRow(p: Omit<FuelPurchase, 'id'>): string[] {
  return [p.date, String(p.liters), p.site || '', p.fuelType || 'Diesel'];
}

export function rowToPurchase(row: string[], index: number): FuelPurchase {
  return {
    id: `purchase-${index}`,
    date: row[0] || '',
    liters: Number(row[1]) || 0,
    site: row[2] || '',
    fuelType: (() => {
      const raw = row[3] || '';
      if (!raw) return 'Diesel';
      return raw.toUpperCase() === 'PETROL' ? 'Petrol' : 'Diesel';
    })(),
  };
}
