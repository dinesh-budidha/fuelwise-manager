export interface FuelRecord {
  id: string;
  slNo: string;
  siteName: string;
  litersPurchased: number;
  issuedDate: string;
  vehicleOwnership: 'Company' | 'Private';
  vehicleType: string;
  vehicleNo: string;
  fuelAlloted: number;
  startingReading: number;
  endingReading: number;
  kilometers: number;
  hours: number;
  kmPerLtr: number;
  usedInLtrs: number;
  balanceLiters: number;
  fuelType: string;
  dgCapacity: string;
  issuedThrough: string;
  issuedThroughValue: string;
}

export type FuelFormData = Omit<FuelRecord, 'id'>;

export const FUEL_TYPES = ['Diesel', 'Petrol'] as const;

export const ISSUED_THROUGH_OPTIONS = ['Barrel', 'Indent'] as const;

export interface VehicleConfig {
  type: 'km' | 'hour';
  rate: number;
  label: string;
  manualMileage?: boolean;
}

export const VEHICLE_DEFAULTS: Record<string, VehicleConfig> = {
  'Transit Mixer': { type: 'km', rate: 2, label: '2 Km/Ltr' },
  'Tipper': { type: 'km', rate: 2, label: '2 Km/Ltr' },
  'Tractor': { type: 'km', rate: 7, label: '7 Km/Ltr' },
  'Camper': { type: 'km', rate: 15, label: '15 Km/Ltr' },
  'Water Tanker': { type: 'km', rate: 2, label: '2 Km/Ltr' },
  'Trailer': { type: 'km', rate: 2, label: '2 Km/Ltr' },
  'Roller': { type: 'hour', rate: 8, label: '8 Ltrs/Hr' },
  'JCB': { type: 'hour', rate: 5, label: '5 Ltrs/Hr' },
  'Excavator': { type: 'hour', rate: 14, label: '14 Ltrs/Hr' },
  '2 Wheeler': { type: 'km', rate: 40, label: '40 Km/Ltr', manualMileage: true },
  'Car': { type: 'km', rate: 12, label: '12 Km/Ltr', manualMileage: true },
  'Diesel Generator': { type: 'hour', rate: 3, label: 'Select DG Capacity' },
};

export const DG_CAPACITIES: Record<string, { rate: number; label: string }> = {
  '15 KV': { rate: 3, label: '3 Ltrs/Hr' },
  '20 KV': { rate: 6, label: '6 Ltrs/Hr' },
  '40 KV': { rate: 6, label: '6 Ltrs/Hr' },
  '125 KV': { rate: 14, label: '14 Ltrs/Hr' },
  '180 KV': { rate: 18, label: '18 Ltrs/Hr' },
};

export const DG_CAPACITY_OPTIONS = Object.keys(DG_CAPACITIES);

export const VEHICLE_TYPES = Object.keys(VEHICLE_DEFAULTS);

export function isHourBased(vehicleType: string): boolean {
  return VEHICLE_DEFAULTS[vehicleType]?.type === 'hour';
}

export function getVehicleConfig(vehicleType: string): VehicleConfig | undefined {
  return VEHICLE_DEFAULTS[vehicleType];
}

export function getDGRate(dgCapacity: string): number {
  return DG_CAPACITIES[dgCapacity]?.rate || 3;
}

export function isManualMileage(vehicleType: string): boolean {
  return VEHICLE_DEFAULTS[vehicleType]?.manualMileage === true;
}

export const EMPTY_FORM: FuelFormData = {
  slNo: '',
  siteName: '',
  litersPurchased: 0,
  issuedDate: new Date().toISOString().split('T')[0],
  vehicleOwnership: 'Company',
  vehicleType: '',
  vehicleNo: '',
  fuelAlloted: 0,
  startingReading: 0,
  endingReading: 0,
  kilometers: 0,
  hours: 0,
  kmPerLtr: 0,
  usedInLtrs: 0,
  balanceLiters: 0,
  fuelType: 'Diesel',
  dgCapacity: '',
  issuedThrough: '',
  issuedThroughValue: '',
};

export const COLUMNS = [
  'Sl.No.', 'Site Name', 'Vehicle No', 'Vehicle Type', 'Fuel Type',
  'Company/Private', 'Issued Date', 'Fuel Alloted', 'Issued Through',
  'Indent Number', 'Starting Reading', 'Ending Reading', 'Kilometers',
  'Hours', 'KM per Ltr', 'Used in Ltrs', 'Balance Liters', 'DG Capacity',
] as const;

export function calculateFields(data: Partial<FuelFormData>): Pick<FuelFormData, 'kilometers' | 'kmPerLtr' | 'usedInLtrs' | 'balanceLiters'> {
  const config = getVehicleConfig(data.vehicleType || '');
  const kilometers = Math.max(0, (data.endingReading || 0) - (data.startingReading || 0));

  let kmPerLtr = data.kmPerLtr || 0;
  let usedInLtrs = 0;

  if (config) {
    if (data.vehicleType === 'Diesel Generator' && data.dgCapacity) {
      const dgRate = getDGRate(data.dgCapacity);
      kmPerLtr = dgRate;
      usedInLtrs = Number(((data.hours || 0) * dgRate).toFixed(2));
    } else if (config.manualMileage) {
      kmPerLtr = data.kmPerLtr || config.rate;
      usedInLtrs = kmPerLtr > 0 ? Number((kilometers / kmPerLtr).toFixed(2)) : 0;
    } else if (config.type === 'km') {
      kmPerLtr = config.rate;
      usedInLtrs = kmPerLtr > 0 ? Number((kilometers / kmPerLtr).toFixed(2)) : 0;
    } else {
      kmPerLtr = config.rate;
      usedInLtrs = Number(((data.hours || 0) * config.rate).toFixed(2));
    }
  }

  const balanceLiters = Number(((data.fuelAlloted || 0) - usedInLtrs).toFixed(2));

  return { kilometers, kmPerLtr, usedInLtrs, balanceLiters };
}

export function recordToRow(record: FuelFormData): string[] {
  const raw = [
    record.slNo,                        // 0: Sl.No.
    record.siteName,                     // 1: Site Name
    record.vehicleNo,                    // 2: Vehicle No
    record.vehicleType,                  // 3: Vehicle Type
    record.fuelType || 'Diesel',         // 4: Fuel Type
    record.vehicleOwnership,             // 5: Company/Private
    record.issuedDate,                   // 6: Issued Date
    String(record.fuelAlloted),          // 7: Fuel Alloted
    record.issuedThrough || '',          // 8: Issued Through
    record.issuedThroughValue || '',     // 9: Indent Number
    String(record.startingReading),      // 10: Starting Reading
    String(record.endingReading),        // 11: Ending Reading
    String(record.kilometers),           // 12: Kilometers
    String(record.hours),                // 13: Hours
    String(record.kmPerLtr),             // 14: KM per Ltr
    String(record.usedInLtrs),           // 15: Used in Ltrs
    String(record.balanceLiters),        // 16: Balance Liters
    record.dgCapacity || '',             // 17: DG Capacity
  ];
  return raw;
}

// Helper to handle "-" from sheet as empty
function str(val: string | undefined): string {
  if (!val || val === '-') return '';
  return val;
}

function num(val: string | undefined): number {
  if (!val || val === '-') return 0;
  return Number(val) || 0;
}

export function rowToRecord(row: string[], index: number): FuelRecord {
  return {
    id: `row-${index}`,
    slNo: str(row[0]),
    siteName: str(row[1]),
    vehicleNo: str(row[2]),
    vehicleType: str(row[3]),
    fuelType: str(row[4]) || 'Diesel',
    vehicleOwnership: (row[5] === 'Private' ? 'Private' : 'Company'),
    issuedDate: str(row[6]),
    fuelAlloted: num(row[7]),
    issuedThrough: str(row[8]),
    issuedThroughValue: str(row[9]),
    startingReading: num(row[10]),
    endingReading: num(row[11]),
    kilometers: num(row[12]),
    hours: num(row[13]),
    kmPerLtr: num(row[14]),
    usedInLtrs: num(row[15]),
    balanceLiters: num(row[16]),
    dgCapacity: str(row[17]),
    litersPurchased: 0,
  };
}
