import { FuelRecord } from '@/types/fuel';
import { Fuel, Truck, MapPin, Gauge, Droplets, AlertTriangle } from 'lucide-react';

interface Props {
  records: FuelRecord[];
  totalPurchased: number;
}

export default function DashboardSummary({ records, totalPurchased }: Props) {
  const totalUsed = records.reduce((s, r) => s + r.usedInLtrs, 0);
  const totalKm = records.reduce((s, r) => s + r.kilometers, 0);
  const uniqueVehicles = new Set(records.map(r => r.vehicleNo).filter(Boolean)).size;
  const uniqueSites = new Set(records.map(r => r.siteName).filter(Boolean)).size;
  const openingBalance = totalPurchased - totalUsed;
  const isLowBalance = openingBalance < 100 && totalPurchased > 0;

  const stats = [
    { label: 'Total Purchased', value: `${totalPurchased.toLocaleString()} L`, icon: Droplets, accent: 'text-primary' },
    { label: 'Total Used', value: `${totalUsed.toLocaleString()} L`, icon: Fuel, accent: 'text-foreground' },
    { label: 'Total Distance', value: `${totalKm.toLocaleString()} km`, icon: Gauge, accent: 'text-foreground' },
    { label: 'Vehicles', value: uniqueVehicles, icon: Truck, accent: 'text-foreground' },
    { label: 'Sites', value: uniqueSites, icon: MapPin, accent: 'text-foreground' },
  ];

  return (
    <div className="space-y-3">
      {/* Opening Balance - Hero Card */}
      <div className={`card-raised p-5 flex items-center justify-between ${isLowBalance ? 'ring-2 ring-destructive/50' : ''}`}>
        <div>
          <div className="label-uppercase mb-1 flex items-center gap-1.5">
            Opening Balance
            {isLowBalance && <AlertTriangle size={12} className="text-destructive" />}
          </div>
          <div className={`text-3xl font-bold tabular-nums ${isLowBalance ? 'text-destructive' : 'text-primary'}`}>
            {openingBalance.toLocaleString()} L
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totalPurchased.toLocaleString()} purchased − {totalUsed.toLocaleString()} used
          </div>
        </div>
        {isLowBalance && (
          <div className="bg-destructive/10 text-destructive text-xs font-bold px-3 py-1.5 rounded">
            LOW BALANCE
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.label} className="card-raised p-4 flex items-center gap-3">
            <div className="p-2 rounded bg-muted">
              <s.icon size={16} className="text-muted-foreground" />
            </div>
            <div>
              <div className={`text-lg font-semibold tabular-nums ${s.accent}`}>{s.value}</div>
              <div className="label-uppercase">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
