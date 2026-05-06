import { useState } from 'react';
import { CreditCard as Edit2, Save, X, CalendarDays } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PrototypeBanner } from '../../components/ui/PrototypeBanner';
import type { AvailabilityProfile, Resource } from '../../types';

export function AvailabilityPage() {
  const [profiles, setProfiles] = useState<AvailabilityProfile[]>([]);
  const resources: Resource[] = [];
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AvailabilityProfile>>({});

  const startEdit = (p: AvailabilityProfile) => {
    setEditId(p.id);
    setEditData({ ...p });
  };

  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const saveEdit = () => {
    setProfiles(prev => prev.map(p => p.id === editId ? { ...p, ...editData, updatedAt: new Date().toISOString() } : p));
    setEditId(null);
    setEditData({});
  };

  const unconfigured = resources.filter(r =>
    r.status === 'active' && !profiles.find(p => p.resourceId === r.id)
  );

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Availability Configuration</h2>
        <p className="text-xs text-gray-500 mt-0.5">Manage booking horizons, capacity, and scheduling rules per resource.</p>
      </div>

      <PrototypeBanner
        label="read_only_for_now"
        message="Availability profile reads are live. Deeper scheduling (slots, calendar blackouts) is pending API support."
      />

      <div className="space-y-4">
        {profiles.map(p => {
          const isEditing = editId === p.id;
          const d = isEditing ? editData : p;
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{p.resourceTitle}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Updated {new Date(p.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={saveEdit}><Save size={12} /> Save</Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}><X size={12} /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>
                    <Edit2 size={12} /> Edit
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ProfileField
                  label="Booking Horizon"
                  value={String(d.bookingHorizonDays)}
                  suffix="days"
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, bookingHorizonDays: parseInt(v) || 0 }))}
                />
                <ProfileField
                  label="Min Advance"
                  value={String(d.minAdvanceBookingHours)}
                  suffix="hours"
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, minAdvanceBookingHours: parseInt(v) || 0 }))}
                />
                <ProfileField
                  label="Max Advance"
                  value={String(d.maxAdvanceBookingDays)}
                  suffix="days"
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, maxAdvanceBookingDays: parseInt(v) || 0 }))}
                />
                <ProfileField
                  label="Default Capacity"
                  value={String(d.defaultCapacity)}
                  suffix="units"
                  editing={isEditing}
                  onChange={v => setEditData(prev => ({ ...prev, defaultCapacity: parseInt(v) || 0 }))}
                />
              </div>

              {!isEditing && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays size={13} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">Calendar & Exceptions</span>
                    <Badge variant="yellow">pending_api</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Blackout dates, slot configuration, and exception management will be available when the scheduling API is ready.
                  </p>
                </div>
              )}
            </Card>
          );
        })}

        {unconfigured.length > 0 && (
          <Card>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Resources without availability profile</h3>
            <div className="space-y-2">
              {unconfigured.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-xs font-medium text-gray-900">{r.title}</span>
                  <Badge variant="yellow">Not configured</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  suffix,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  suffix: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500 shrink-0">{suffix}</span>
        </div>
      ) : (
        <p className="text-sm font-semibold text-gray-900">{value} <span className="text-xs text-gray-500 font-normal">{suffix}</span></p>
      )}
    </div>
  );
}
