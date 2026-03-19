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

export function calculateFields(data: Partial<FuelFormData>): Pick<FuelFormData, 'kilometers' | 'kmPerLtr' | 'balanceLiters'> {
  const kilometers = (data.endingReading || 0) - (data.startingReading || 0);
  const kmPerLtr = data.fuelAlloted && data.fuelAlloted > 0
    ? Number((kilometers / data.fuelAlloted).toFixed(2))
    : 0;
  const balanceLiters = (data.litersPurchased || 0) - (data.usedInLtrs || 0);
  return { kilometers, kmPerLtr, balanceLiters };
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
