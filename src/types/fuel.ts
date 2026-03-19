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
}

export type FuelFormData = Omit<FuelRecord, 'id'>;

// Vehicle type configuration
export interface VehicleConfig {
  type: 'km' | 'hour';
  rate: number; // km/ltr for km-based, ltrs/hr for hour-based
  label: string;
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
};

export const VEHICLE_TYPES = Object.keys(VEHICLE_DEFAULTS);

export function isHourBased(vehicleType: string): boolean {
  return VEHICLE_DEFAULTS[vehicleType]?.type === 'hour';
}

export function getVehicleConfig(vehicleType: string): VehicleConfig | undefined {
  return VEHICLE_DEFAULTS[vehicleType];
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
};

export const COLUMNS = [
  'Sl.No.', 'Site Name', 'Liters Purchased', 'Issued Date',
  'Company/Private', 'Vehicle Type', 'Vehicle No', 'Fuel Alloted',
  'Starting Reading', 'Ending Reading', 'Kilometers', 'Hours',
  'KM per Ltr', 'Used in Ltrs', 'Balance Liters',
] as const;

export function calculateFields(data: Partial<FuelFormData>): Pick<FuelFormData, 'kilometers' | 'kmPerLtr' | 'usedInLtrs' | 'balanceLiters'> {
  const config = getVehicleConfig(data.vehicleType || '');
  const kilometers = Math.max(0, (data.endingReading || 0) - (data.startingReading || 0));

  let kmPerLtr = data.kmPerLtr || 0;
  let usedInLtrs = 0;

  if (config) {
    if (config.type === 'km') {
      kmPerLtr = config.rate;
      usedInLtrs = kmPerLtr > 0 ? Number((kilometers / kmPerLtr).toFixed(2)) : 0;
    } else {
      // Hour-based: rate is ltrs per hour
      kmPerLtr = config.rate; // Store consumption rate in this field
      usedInLtrs = Number(((data.hours || 0) * config.rate).toFixed(2));
    }
  }

  const balanceLiters = Number(((data.fuelAlloted || 0) - usedInLtrs).toFixed(2));

  return { kilometers, kmPerLtr, usedInLtrs, balanceLiters };
}

export function recordToRow(record: FuelFormData): string[] {
  return [
    record.slNo,
    record.siteName,
    String(record.litersPurchased),
    record.issuedDate,
    record.vehicleOwnership,
    record.vehicleType,
    record.vehicleNo,
    String(record.fuelAlloted),
    String(record.startingReading),
    String(record.endingReading),
    String(record.kilometers),
    String(record.hours),
    String(record.kmPerLtr),
    String(record.usedInLtrs),
    String(record.balanceLiters),
  ];
}

export function rowToRecord(row: string[], index: number): FuelRecord {
  return {
    id: `row-${index}`,
    slNo: row[0] || '',
    siteName: row[1] || '',
    litersPurchased: Number(row[2]) || 0,
    issuedDate: row[3] || '',
    vehicleOwnership: (row[4] === 'Private' ? 'Private' : 'Company'),
    vehicleType: row[5] || '',
    vehicleNo: row[6] || '',
    fuelAlloted: Number(row[7]) || 0,
    startingReading: Number(row[8]) || 0,
    endingReading: Number(row[9]) || 0,
    kilometers: Number(row[10]) || 0,
    hours: Number(row[11]) || 0,
    kmPerLtr: Number(row[12]) || 0,
    usedInLtrs: Number(row[13]) || 0,
    balanceLiters: Number(row[14]) || 0,
  };
}
