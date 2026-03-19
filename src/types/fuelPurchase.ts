export interface FuelPurchase {
  id: string;
  date: string;
  liters: number;
}

export function purchaseToRow(p: Omit<FuelPurchase, 'id'>): string[] {
  return [p.date, String(p.liters)];
}

export function rowToPurchase(row: string[], index: number): FuelPurchase {
  return {
    id: `purchase-${index}`,
    date: row[0] || '',
    liters: Number(row[1]) || 0,
  };
}
