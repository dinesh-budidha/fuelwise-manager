import { FuelRecord } from '@/types/fuel';
import { FuelPurchase } from '@/types/fuelPurchase';
import { Fuel, Truck, MapPin, Gauge, Droplets, AlertTriangle, Package, Clock } from 'lucide-react';

interface Props {
  records: FuelRecord[];
  purchases: FuelPurchase[];
  totalPurchased: number;
  totalAlloted: number;
  selectedSite: string;
}

export default function DashboardSummary({ records, purchases, totalPurchased, totalAlloted, selectedSite }: Props) {
  const siteRecords = selectedSite ? records.filter(r => r.siteName === selectedSite) : records;
  const sitePurchases = selectedSite ? purchases.filter(p => p.site === selectedSite) : purchases;

  const sitePurchased = sitePurchases.reduce((s, p) => s + p.liters, 0);
  const siteAlloted = siteRecords.reduce((s, r) => s + r.fuelAlloted, 0);
  const openingBalance = sitePurchased - siteAlloted;

  const totalUsed = siteRecords.reduce((s, r) => s + r.usedInLtrs, 0);
  const totalKm = siteRecords.reduce((s, r) => s + r.kilometers, 0);
  const totalHours = siteRecords.reduce((s, r) => s + r.hours, 0);
  const uniqueVehicles = new Set(siteRecords.map(r => r.vehicleNo).filter(Boolean)).size;
  const uniqueSites = new Set(siteRecords.map(r => r.siteName).filter(Boolean)).size;
  const isLowBalance = openingBalance < 100 && sitePurchased > 0;

  const stats = [
    { label: 'Total Purchased', value: `${sitePurchased.toLocaleString()} L`, icon: Droplets, accent: 'text-primary' },
    { label: 'Total Alloted', value: `${siteAlloted.toLocaleString()} L`, icon: Package, accent: 'text-foreground' },
    { label: 'Total Used', value: `${totalUsed.toLocaleString()} L`, icon: Fuel, accent: 'text-foreground' },
    { label: 'Total Distance', value: `${totalKm.toLocaleString()} km`, icon: Gauge, accent: 'text-foreground' },
    { label: 'Total Hours', value: `${totalHours.toLocaleString()} hrs`, icon: Clock, accent: 'text-foreground' },
    { label: 'Vehicles', value: uniqueVehicles, icon: Truck, accent: 'text-foreground' },
    { label: 'Sites', value: uniqueSites, icon: MapPin, accent: 'text-foreground' },
  ];

  return (
    <div className="space-y-3">
      <div className={`card-raised p-5 flex items-center justify-between ${isLowBalance ? 'ring-2 ring-destructive/50' : ''}`}>
        <div>
          <div className="label-uppercase mb-1 flex items-center gap-1.5">
            Opening Balance {selectedSite && <span className="text-primary">({selectedSite})</span>}
            {isLowBalance && <AlertTriangle size={12} className="text-destructive" />}
          </div>
          <div className={`text-3xl font-bold tabular-nums ${isLowBalance ? 'text-destructive' : 'text-primary'}`}>
            {openingBalance.toLocaleString()} L
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {sitePurchased.toLocaleString()} purchased − {siteAlloted.toLocaleString()} alloted
          </div>
        </div>
        {isLowBalance && (
          <div className="bg-destructive/10 text-destructive text-xs font-bold px-3 py-1.5 rounded">
            LOW BALANCE
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
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
