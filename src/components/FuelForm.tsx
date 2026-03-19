import React, { useEffect, useState } from 'react';
import { FuelFormData, EMPTY_FORM, calculateFields, VEHICLE_TYPES, VEHICLE_DEFAULTS, isHourBased, getVehicleConfig } from '@/types/fuel';
import { Plus, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  onSubmit: (data: FuelFormData) => Promise<boolean>;
  editData?: FuelFormData | null;
  onCancelEdit?: () => void;
  nextSlNo: number;
}

export default function FuelForm({ onSubmit, editData, onCancelEdit, nextSlNo }: Props) {
  const [form, setForm] = useState<FuelFormData>({ ...EMPTY_FORM, slNo: String(nextSlNo) });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editData) {
      setForm(editData);
    } else {
      setForm({ ...EMPTY_FORM, slNo: String(nextSlNo) });
    }
  }, [editData, nextSlNo]);

  // Auto-calculate when inputs change
  useEffect(() => {
    const calcs = calculateFields(form);
    setForm(prev => ({ ...prev, ...calcs }));
  }, [form.startingReading, form.endingReading, form.fuelAlloted, form.hours, form.vehicleType]);

  // Auto-fill defaults when vehicle type changes
  const handleVehicleTypeChange = (vehicleType: string) => {
    const config = getVehicleConfig(vehicleType);
    setForm(prev => ({
      ...prev,
      vehicleType,
      // Reset irrelevant fields
      ...(config?.type === 'hour' ? { startingReading: 0, endingReading: 0 } : { hours: 0 }),
    }));
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const config = getVehicleConfig(form.vehicleType);

    if (!form.vehicleType) newErrors.vehicleType = 'Select a vehicle type';
    if (!form.siteName.trim()) newErrors.siteName = 'Site name is required';
    if (!form.vehicleNo.trim()) newErrors.vehicleNo = 'Vehicle number is required';

    if (config?.type === 'km') {
      if (form.endingReading < form.startingReading) {
        newErrors.endingReading = 'Must be ≥ Starting Reading';
      }
    }

    if (config?.type === 'hour') {
      if (form.hours <= 0) {
        newErrors.hours = 'Hours must be > 0';
      }
    }

    if (form.fuelAlloted < 0) newErrors.fuelAlloted = 'Cannot be negative';
    if (form.litersPurchased < 0) newErrors.litersPurchased = 'Cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FuelFormData, value: string | number) => {
    // Prevent negative numbers
    if (typeof value === 'number' && value < 0) value = 0;
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ title: 'Validation Error', description: 'Please fix the highlighted fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const success = await onSubmit(form);
    if (success && !editData) {
      setForm({ ...EMPTY_FORM, slNo: String(nextSlNo + 1) });
      setErrors({});
    }
    setSubmitting(false);
  };

  const hourBased = isHourBased(form.vehicleType);
  const config = getVehicleConfig(form.vehicleType);

  return (
    <form onSubmit={handleSubmit} className="card-raised p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold flex items-center gap-2">
          {editData ? (
            <><Save size={14} className="text-primary" /> EDIT RECORD</>
          ) : (
            <><Plus size={14} className="text-primary" /> NEW ENTRY</>
          )}
        </h2>
        {editData && onCancelEdit && (
          <button type="button" onClick={onCancelEdit} className="btn-secondary flex items-center gap-1 text-xs py-1 px-2">
            <X size={12} /> Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Sl.No." value={form.slNo} onChange={v => handleChange('slNo', v)} error={errors.slNo} />
        <Field label="Site Name" value={form.siteName} onChange={v => handleChange('siteName', v)} error={errors.siteName} />
        <Field label="Issued Date" type="date" value={form.issuedDate} onChange={v => handleChange('issuedDate', v)} />

        {/* Vehicle Type - Dropdown */}
        <div className="flex flex-col gap-1">
          <label className="label-uppercase">Vehicle Type</label>
          <select
            value={form.vehicleType}
            onChange={e => handleVehicleTypeChange(e.target.value)}
            className={`input-recessed ${errors.vehicleType ? 'ring-2 ring-destructive' : ''}`}
          >
            <option value="">Select Type...</option>
            {VEHICLE_TYPES.map(t => (
              <option key={t} value={t}>{t} — {VEHICLE_DEFAULTS[t].label}</option>
            ))}
          </select>
          {errors.vehicleType && <span className="text-[10px] text-destructive">{errors.vehicleType}</span>}
          {config && (
            <span className="text-[10px] text-muted-foreground">
              Default: {config.label} ({config.type === 'km' ? 'KM-based' : 'Hour-based'})
            </span>
          )}
        </div>

        <SelectField
          label="Company / Private"
          value={form.vehicleOwnership}
          options={['Company', 'Private']}
          onChange={v => handleChange('vehicleOwnership', v)}
        />
        <Field label="Vehicle No" value={form.vehicleNo} onChange={v => handleChange('vehicleNo', v)} error={errors.vehicleNo} />

        <NumField label="Fuel Alloted" value={form.fuelAlloted} onChange={v => handleChange('fuelAlloted', v)} error={errors.fuelAlloted} />

        {/* Conditional fields based on vehicle type */}
        {!hourBased && (
          <>
            <NumField label="Starting Reading" value={form.startingReading} onChange={v => handleChange('startingReading', v)} />
            <NumField label="Ending Reading" value={form.endingReading} onChange={v => handleChange('endingReading', v)} error={errors.endingReading} />
          </>
        )}

        {hourBased && (
          <NumField label="Hours" value={form.hours} onChange={v => handleChange('hours', v)} error={errors.hours} />
        )}

        {/* Auto-calculated read-only fields */}
        {!hourBased && <ReadOnly label="Kilometers" value={form.kilometers} />}
        <ReadOnly
          label={hourBased ? 'Consumption Rate (Ltrs/Hr)' : 'KM per Ltr'}
          value={form.kmPerLtr}
        />
        <ReadOnly label="Used in Ltrs" value={form.usedInLtrs} />
        <ReadOnly label="Balance Liters" value={form.balanceLiters} highlight={form.balanceLiters < 0} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full mt-5 py-2.5 disabled:opacity-50"
      >
        {submitting ? 'Saving...' : editData ? 'Update Record' : 'Save to Cloud'}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = 'text', error }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label-uppercase">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className={`input-recessed ${error ? 'ring-2 ring-destructive' : ''}`} />
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  );
}

function NumField({ label, value, onChange, error }: {
  label: string; value: number; onChange: (v: number) => void; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label-uppercase">{label}</label>
      <input
        type="number"
        step="any"
        min="0"
        value={value || ''}
        onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={`input-recessed tabular-nums ${error ? 'ring-2 ring-destructive' : ''}`}
      />
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label-uppercase">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input-recessed">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ReadOnly({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label-uppercase opacity-70 flex items-center gap-1">
        {label}
        <span className="text-[9px] font-normal text-muted-foreground bg-muted px-1 rounded">Auto</span>
      </label>
      <div className={`field-readonly tabular-nums ${highlight ? 'text-destructive font-semibold' : ''}`}>
        {value}
      </div>
    </div>
  );
}
