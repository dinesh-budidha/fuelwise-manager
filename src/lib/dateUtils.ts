// Indian date format DD-MM-YYYY
export function toIndianDate(dateStr: string): string {
  if (!dateStr) return '';
  // Handle ISO format YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  // Already in DD-MM-YYYY
  return dateStr;
}

export function toISODate(indianDate: string): string {
  if (!indianDate) return '';
  const parts = indianDate.split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return indianDate;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function todayIndian(): string {
  return toIndianDate(todayISO());
}
