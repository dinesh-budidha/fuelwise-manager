import { FuelRecord } from '@/types/fuel';
import { Fuel, Truck, MapPin, Gauge } from 'lucide-react';

interface Props {
  records: FuelRecord[];
}

export default function DashboardSummary({ records }: Props) {
  const totalFuel = records.reduce((s, r) => s + r.litersPurchased, 0);
  const totalKm = records.reduce((s, r) => s + r.kilometers, 0);
  const uniqueVehicles = new Set(records.map(r => r.vehicleNo).filter(Boolean)).size;
  const uniqueSites = new Set(records.map(r => r.siteName).filter(Boolean)).size;
  const avgKmPerLtr = records.length > 0
    ? (records.reduce((s, r) => s + r.kmPerLtr, 0) / records.length).toFixed(1)
    : '0';

  const stats = [
    { label: 'Total Fuel', value: `${totalFuel.toLocaleString()} L`, icon: Fuel, accent: 'text-primary' },
    { label: 'Total Distance', value: `${totalKm.toLocaleString()} km`, icon: Gauge, accent: 'text-primary' },
    { label: 'Vehicles', value: uniqueVehicles, icon: Truck, accent: 'text-foreground' },
    { label: 'Sites', value: uniqueSites, icon: MapPin, accent: 'text-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
  );
}
