import React, { useEffect, useState } from 'react';
import { FuelFormData, EMPTY_FORM, calculateFields, VEHICLE_TYPES, VEHICLE_DEFAULTS, FUEL_TYPES, isHourBased, isManualMileage, getVehicleConfig, DG_CAPACITIES, DG_CAPACITY_OPTIONS, ISSUED_THROUGH_OPTIONS } from '@/types/fuel';
import { Plus, Save, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  onSubmit: (data: FuelFormData) => Promise<boolean>;
  editData?: FuelFormData | null;
  onCancelEdit?: () => void;
  nextSlNo: number;
  onVehicleNoBlur?: (vehicleNo: string) => Promise<string[] | null>;
}

export default function FuelForm({ onSubmit, editData, onCancelEdit, nextSlNo, onVehicleNoBlur }: Props) {
  const [form, setForm] = useState<FuelFormData>({ ...EMPTY_FORM, slNo: String(nextSlNo) });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchingVehicle, setFetchingVehicle] = useState(false);
  const [prevVehicleInfo, setPrevVehicleInfo] = useState<string | null>(null);

  useEffect(() => {
    if (editData) {
      setForm(editData);
      setPrevVehicleInfo(null);
    } else {
      setForm({ ...EMPTY_FORM, slNo: String(nextSlNo) });
      setPrevVehicleInfo(null);
    }
  }, [editData, nextSlNo]);

  useEffect(() => {
    if (isManualMileage(form.vehicleType)) {
      // For manual mileage vehicles, don't override kmPerLtr
      const config = getVehicleConfig(form.vehicleType);
      const kilometers = Math.max(0, form.endingReading - form.startingReading);
      const kmPerLtr = form.kmPerLtr || config?.rate || 0;
      const usedInLtrs = kmPerLtr > 0 ? Number((kilometers / kmPerLtr).toFixed(2)) : 0;
      const balanceLiters = Number((form.fuelAlloted - usedInLtrs).toFixed(2));
      setForm(prev => ({ ...prev, kilometers, usedInLtrs, balanceLiters }));
    } else {
      const calcs = calculateFields(form);
      setForm(prev => ({ ...prev, ...calcs }));
    }
  }, [form.startingReading, form.endingReading, form.fuelAlloted, form.hours, form.vehicleType, form.dgCapacity, form.kmPerLtr]);

  const handleVehicleTypeChange = (vehicleType: string) => {
    const config = getVehicleConfig(vehicleType);
    setForm(prev => ({
      ...prev,
      vehicleType,
      dgCapacity: vehicleType === 'Diesel Generator' ? prev.dgCapacity : '',
      kmPerLtr: config?.manualMileage ? config.rate : (prev.kmPerLtr),
      ...(config?.type === 'hour' ? { startingReading: 0, endingReading: 0 } : { hours: 0 }),
    }));
    setErrors({});
  };

  const handleVehicleNoBlur = async () => {
    const vehicleNo = form.vehicleNo.trim();
    if (!vehicleNo || editData || !onVehicleNoBlur) return;
    setFetchingVehicle(true);
    try {
      const lastRow = await onVehicleNoBlur(vehicleNo);
      if (lastRow) {
        const prevEndingReading = Number(lastRow[9]) || 0;
        const prevBalance = Number(lastRow[14]) || 0;
        const prevVehicleType = lastRow[5] || '';
        const prevSite = lastRow[1] || '';

        setForm(prev => ({
          ...prev,
          startingReading: prevEndingReading,
          vehicleType: prev.vehicleType || prevVehicleType,
          siteName: prev.siteName || prevSite,
        }));

        setPrevVehicleInfo(`Last entry: Ending Reading ${prevEndingReading}, Balance ${prevBalance} L`);

        if (prevVehicleType && !form.vehicleType) {
          handleVehicleTypeChange(prevVehicleType);
        }

        toast({ title: 'Vehicle found', description: `Auto-filled from previous entry (Reading: ${prevEndingReading})` });
      } else {
        setPrevVehicleInfo(null);
      }
    } catch {
      // silent fail
    } finally {
      setFetchingVehicle(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const config = getVehicleConfig(form.vehicleType);

    if (!form.vehicleType) newErrors.vehicleType = 'Select a vehicle type';
    if (!form.siteName.trim()) newErrors.siteName = 'Site name is required';
    if (!form.vehicleNo.trim()) newErrors.vehicleNo = 'Vehicle number is required';

    if (form.vehicleType === 'Diesel Generator' && !form.dgCapacity) {
      newErrors.dgCapacity = 'Select DG capacity';
    }

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FuelFormData, value: string | number) => {
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
      setPrevVehicleInfo(null);
    }
    setSubmitting(false);
  };

  const hourBased = isHourBased(form.vehicleType);
  const config = getVehicleConfig(form.vehicleType);
  const isDG = form.vehicleType === 'Diesel Generator';
  const manualMileage = isManualMileage(form.vehicleType);

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

        <SelectField label="Fuel Type" value={form.fuelType} options={[...FUEL_TYPES]} onChange={v => handleChange('fuelType', v)} />

        {/* Vehicle Type */}
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
          {config && !isDG && (
            <span className="text-[10px] text-muted-foreground">
              Default: {config.label} ({config.type === 'km' ? 'KM-based' : 'Hour-based'})
              {config.manualMileage && ' — Editable'}
            </span>
          )}
        </div>

        {/* DG Capacity */}
        {isDG && (
          <div className="flex flex-col gap-1">
            <label className="label-uppercase">DG Capacity</label>
            <select
              value={form.dgCapacity}
              onChange={e => handleChange('dgCapacity', e.target.value)}
              className={`input-recessed ${errors.dgCapacity ? 'ring-2 ring-destructive' : ''}`}
            >
              <option value="">Select Capacity...</option>
              {DG_CAPACITY_OPTIONS.map(c => (
                <option key={c} value={c}>{c} — {DG_CAPACITIES[c].label}</option>
              ))}
            </select>
            {errors.dgCapacity && <span className="text-[10px] text-destructive">{errors.dgCapacity}</span>}
            {form.dgCapacity && (
              <span className="text-[10px] text-muted-foreground">
                Rate: {DG_CAPACITIES[form.dgCapacity]?.label} (Hour-based)
              </span>
            )}
          </div>
        )}

        <SelectField
          label="Company / Private"
          value={form.vehicleOwnership}
          options={['Company', 'Private']}
          onChange={v => handleChange('vehicleOwnership', v)}
        />

        {/* Vehicle No */}
        <div className="flex flex-col gap-1">
          <label className="label-uppercase flex items-center gap-1">
            Vehicle No
            {fetchingVehicle && <Loader2 size={10} className="animate-spin text-primary" />}
          </label>
          <input
            value={form.vehicleNo}
            onChange={e => handleChange('vehicleNo', e.target.value)}
            onBlur={handleVehicleNoBlur}
            className={`input-recessed ${errors.vehicleNo ? 'ring-2 ring-destructive' : ''}`}
            placeholder="Enter & tab to auto-fill"
          />
          {errors.vehicleNo && <span className="text-[10px] text-destructive">{errors.vehicleNo}</span>}
          {prevVehicleInfo && (
            <span className="text-[10px] text-primary font-medium">{prevVehicleInfo}</span>
          )}
        </div>

        <NumField label="Fuel Alloted" value={form.fuelAlloted} onChange={v => handleChange('fuelAlloted', v)} error={errors.fuelAlloted} />

        {/* Issued Through */}
        <div className="flex flex-col gap-1">
          <label className="label-uppercase">Issued Through</label>
          <select
            value={form.issuedThrough}
            onChange={e => handleChange('issuedThrough', e.target.value)}
            className="input-recessed"
          >
            <option value="">Select...</option>
            {ISSUED_THROUGH_OPTIONS.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {form.issuedThrough === 'Indent' && (
          <Field
            label="Indent"
            value={form.issuedThroughValue}
            onChange={v => handleChange('issuedThroughValue', v)}
          />
        )}

        {!hourBased && (
          <>
            <NumField label="Starting Reading" value={form.startingReading} onChange={v => handleChange('startingReading', v)} />
            <NumField label="Ending Reading" value={form.endingReading} onChange={v => handleChange('endingReading', v)} error={errors.endingReading} />
          </>
        )}

        {hourBased && (
          <NumField label="Hours" value={form.hours} onChange={v => handleChange('hours', v)} error={errors.hours} />
        )}

        {!hourBased && <ReadOnly label="Kilometers" value={form.kilometers} />}

        {/* KM per Ltr - editable for Car/2 Wheeler, readonly for others */}
        {manualMileage ? (
          <NumField
            label="KM per Ltr (Editable)"
            value={form.kmPerLtr}
            onChange={v => handleChange('kmPerLtr', v)}
          />
        ) : (
          <ReadOnly
            label={hourBased ? 'Consumption Rate (Ltrs/Hr)' : 'KM per Ltr'}
            value={form.kmPerLtr}
          />
        )}

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
        type="number" step="any" min="0"
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
