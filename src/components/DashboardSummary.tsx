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

  // Split by fuel type
  const dieselPurchased = sitePurchases.filter(p => p.fuelType !== 'Petrol').reduce((s, p) => s + p.liters, 0);
  const petrolPurchased = sitePurchases.filter(p => p.fuelType === 'Petrol').reduce((s, p) => s + p.liters, 0);

  const dieselAlloted = siteRecords.filter(r => r.fuelType !== 'Petrol').reduce((s, r) => s + r.fuelAlloted, 0);
  const petrolAlloted = siteRecords.filter(r => r.fuelType === 'Petrol').reduce((s, r) => s + r.fuelAlloted, 0);

  const dieselBalance = dieselPurchased - dieselAlloted;
  const petrolBalance = petrolPurchased - petrolAlloted;

  const dieselUsed = siteRecords.filter(r => r.fuelType !== 'Petrol').reduce((s, r) => s + r.usedInLtrs, 0);
  const petrolUsed = siteRecords.filter(r => r.fuelType === 'Petrol').reduce((s, r) => s + r.usedInLtrs, 0);

  const totalKm = siteRecords.reduce((s, r) => s + r.kilometers, 0);
  const totalHours = siteRecords.reduce((s, r) => s + r.hours, 0);
  const uniqueVehicles = new Set(siteRecords.map(r => r.vehicleNo).filter(Boolean)).size;
  const uniqueSites = new Set(siteRecords.map(r => r.siteName).filter(Boolean)).size;

  const isDieselLow = dieselBalance < 100 && dieselPurchased > 0;
  const isPetrolLow = petrolBalance < 100 && petrolPurchased > 0;

  return (
    <div className="space-y-3">
      {/* Opening Balance Cards - Diesel & Petrol side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Diesel Opening Balance */}
        <div className={`card-raised p-5 flex items-center justify-between ${isDieselLow ? 'ring-2 ring-destructive/50' : ''}`}>
          <div>
            <div className="label-uppercase mb-1 flex items-center gap-1.5">
              Opening Balance — Diesel {selectedSite && <span className="text-primary">({selectedSite})</span>}
              {isDieselLow && <AlertTriangle size={12} className="text-destructive" />}
            </div>
            <div className={`text-3xl font-bold tabular-nums ${isDieselLow ? 'text-destructive' : 'text-primary'}`}>
              {dieselBalance.toLocaleString()} L
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {dieselPurchased.toLocaleString()} purchased − {dieselAlloted.toLocaleString()} alloted
            </div>
          </div>
          {isDieselLow && (
            <div className="bg-destructive/10 text-destructive text-xs font-bold px-3 py-1.5 rounded">
              LOW
            </div>
          )}
        </div>

        {/* Petrol Opening Balance */}
        <div className={`card-raised p-5 flex items-center justify-between ${isPetrolLow ? 'ring-2 ring-destructive/50' : ''}`}>
          <div>
            <div className="label-uppercase mb-1 flex items-center gap-1.5">
              Opening Balance — Petrol {selectedSite && <span className="text-primary">({selectedSite})</span>}
              {isPetrolLow && <AlertTriangle size={12} className="text-destructive" />}
            </div>
            <div className={`text-3xl font-bold tabular-nums ${isPetrolLow ? 'text-destructive' : 'text-primary'}`}>
              {petrolBalance.toLocaleString()} L
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {petrolPurchased.toLocaleString()} purchased − {petrolAlloted.toLocaleString()} alloted
            </div>
          </div>
          {isPetrolLow && (
            <div className="bg-destructive/10 text-destructive text-xs font-bold px-3 py-1.5 rounded">
              LOW
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid - split by fuel type where relevant */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Droplets} label="Purchased (Diesel)" value={`${dieselPurchased.toLocaleString()} L`} accent="text-primary" />
        <StatCard icon={Droplets} label="Purchased (Petrol)" value={`${petrolPurchased.toLocaleString()} L`} accent="text-primary" />
        <StatCard icon={Package} label="Alloted (Diesel)" value={`${dieselAlloted.toLocaleString()} L`} />
        <StatCard icon={Package} label="Alloted (Petrol)" value={`${petrolAlloted.toLocaleString()} L`} />
        <StatCard icon={Fuel} label="Used (Diesel)" value={`${dieselUsed.toLocaleString()} L`} />
        <StatCard icon={Fuel} label="Used (Petrol)" value={`${petrolUsed.toLocaleString()} L`} />
        <StatCard icon={Gauge} label="Total Distance" value={`${totalKm.toLocaleString()} km`} />
        <StatCard icon={Clock} label="Total Hours" value={`${totalHours.toLocaleString()} hrs`} />
        <StatCard icon={Truck} label="Vehicles" value={uniqueVehicles} />
        <StatCard icon={MapPin} label="Sites" value={uniqueSites} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="card-raised p-4 flex items-center gap-3">
      <div className="p-2 rounded bg-muted">
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div>
        <div className={`text-lg font-semibold tabular-nums ${accent || 'text-foreground'}`}>{value}</div>
        <div className="label-uppercase">{label}</div>
      </div>
    </div>
  );
}
