import React, { useEffect, useState } from 'react';
import { FuelFormData, EMPTY_FORM, calculateFields } from '@/types/fuel';
import { Plus, Save, X } from 'lucide-react';

interface Props {
  onSubmit: (data: FuelFormData) => Promise<boolean>;
  editData?: FuelFormData | null;
  onCancelEdit?: () => void;
  nextSlNo: number;
}

export default function FuelForm({ onSubmit, editData, onCancelEdit, nextSlNo }: Props) {
  const [form, setForm] = useState<FuelFormData>({ ...EMPTY_FORM, slNo: String(nextSlNo) });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm(editData);
    } else {
      setForm({ ...EMPTY_FORM, slNo: String(nextSlNo) });
    }
  }, [editData, nextSlNo]);

  useEffect(() => {
    const calcs = calculateFields(form);
    if (calcs.kilometers !== form.kilometers || calcs.kmPerLtr !== form.kmPerLtr || calcs.balanceLiters !== form.balanceLiters) {
      setForm(prev => ({ ...prev, ...calcs }));
    }
  }, [form.startingReading, form.endingReading, form.fuelAlloted, form.litersPurchased, form.usedInLtrs]);

  const handleChange = (field: keyof FuelFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const success = await onSubmit(form);
    if (success && !editData) {
      setForm({ ...EMPTY_FORM, slNo: String(nextSlNo + 1) });
    }
    setSubmitting(false);
  };

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
        <Field label="Sl.No." value={form.slNo} onChange={v => handleChange('slNo', v)} />
        <Field label="Site Name" value={form.siteName} onChange={v => handleChange('siteName', v)} />
        <Field label="Issued Date" type="date" value={form.issuedDate} onChange={v => handleChange('issuedDate', v)} />
        <SelectField
          label="Company / Private"
          value={form.vehicleOwnership}
          options={['Company', 'Private']}
          onChange={v => handleChange('vehicleOwnership', v)}
        />
        <Field label="Vehicle Type" value={form.vehicleType} onChange={v => handleChange('vehicleType', v)} />
        <Field label="Vehicle No" value={form.vehicleNo} onChange={v => handleChange('vehicleNo', v)} />
        <NumField label="Liters Purchased" value={form.litersPurchased} onChange={v => handleChange('litersPurchased', v)} />
        <NumField label="Fuel Alloted" value={form.fuelAlloted} onChange={v => handleChange('fuelAlloted', v)} />
        <NumField label="Used in Ltrs" value={form.usedInLtrs} onChange={v => handleChange('usedInLtrs', v)} />
        <NumField label="Starting Reading" value={form.startingReading} onChange={v => handleChange('startingReading', v)} />
        <NumField label="Ending Reading" value={form.endingReading} onChange={v => handleChange('endingReading', v)} />
        <NumField label="Hours" value={form.hours} onChange={v => handleChange('hours', v)} />

        {/* Calculated read-only fields */}
        <ReadOnly label="Kilometers" value={form.kilometers} />
        <ReadOnly label="KM per Ltr" value={form.kmPerLtr} />
        <ReadOnly label="Balance Liters" value={form.balanceLiters} />
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

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label-uppercase">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="input-recessed" />
    </div>
  );
}

function NumField({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label-uppercase">{label}</label>
      <input
        type="number"
        step="any"
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="input-recessed tabular-nums"
      />
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

function ReadOnly({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label-uppercase opacity-70">{label}</label>
      <div className="field-readonly">{value}</div>
    </div>
  );
}
