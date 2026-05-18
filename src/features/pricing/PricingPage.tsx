import { useState } from 'react';
import { Plus, Trash2, CreditCard as Edit2, Save, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PrototypeBanner } from '../../components/ui/PrototypeBanner';
import type { PricingPolicy, PricingAdjustment } from '../../types';

export function PricingPage() {
  const [policies, setPolicies] = useState<PricingPolicy[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PricingPolicy>>({});

  const startEdit = (p: PricingPolicy) => {
    setEditId(p.id);
    setEditData({ ...p, adjustments: [...p.adjustments] });
  };
  const cancelEdit = () => { setEditId(null); setEditData({}); };
  const saveEdit = () => {
    setPolicies(prev => prev.map(p => p.id === editId ? { ...p, ...editData, updatedAt: new Date().toISOString() } : p));
    cancelEdit();
  };

  const addAdjustment = () => {
    const adj: PricingAdjustment = {
      id: `adj-${Date.now()}`,
      type: 'percentage',
      amount: -10,
      condition: '',
      label: 'Новая корректировка',
    };
    setEditData(prev => ({ ...prev, adjustments: [...(prev.adjustments || []), adj] }));
  };

  const removeAdjustment = (id: string) => {
    setEditData(prev => ({ ...prev, adjustments: (prev.adjustments || []).filter(a => a.id !== id) }));
  };

  const updateAdjustment = (id: string, field: keyof PricingAdjustment, value: string | number) => {
    setEditData(prev => ({
      ...prev,
      adjustments: (prev.adjustments || []).map(a => a.id === id ? { ...a, [field]: value } : a),
    }));
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Настройка цен</h2>
        <p className="text-xs text-gray-500 mt-0.5">Настройте базовые цены и корректировки для офферов.</p>
      </div>

      <PrototypeBanner label="ожидает API" message="Запись цен пока работает только в прототипе. Поддержка API будет подключена позже." />

      <div className="space-y-4">
        {policies.map(p => {
          const isEditing = editId === p.id;
          const d = isEditing ? editData : p;
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{p.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Обновлено {new Date(p.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={saveEdit}><Save size={12} /> Сохранить</Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}><X size={12} /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>
                    <Edit2 size={12} /> Редактировать
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Базовая цена</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={String(d.basePrice)}
                      onChange={e => setEditData(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                    />
                  ) : (
                    <p className="text-lg font-bold text-gray-900">{p.basePrice.toLocaleString()} <span className="text-sm font-normal text-gray-500">{p.currency}</span></p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Корректировки</p>
                  {isEditing && (
                    <Button size="sm" variant="ghost" onClick={addAdjustment}>
                      <Plus size={12} /> Добавить
                    </Button>
                  )}
                </div>
                {(d.adjustments || []).length === 0 ? (
                  <p className="text-xs text-gray-500">Корректировки не настроены.</p>
                ) : (
                  <div className="space-y-2">
                    {(d.adjustments || []).map(adj => (
                      <div key={adj.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-md">
                        {isEditing ? (
                          <>
                            <Input
                              value={adj.label}
                              onChange={e => updateAdjustment(adj.id, 'label', e.target.value)}
                              className="flex-1"
                              placeholder="Название"
                            />
                            <Select
                              options={[{ value: 'percentage', label: '%' }, { value: 'fixed', label: 'Фикс.' }]}
                              value={adj.type}
                              onChange={e => updateAdjustment(adj.id, 'type', e.target.value)}
                              className="w-24"
                            />
                            <Input
                              type="number"
                              value={String(adj.amount)}
                              onChange={e => updateAdjustment(adj.id, 'amount', Number(e.target.value))}
                              className="w-24"
                            />
                            <button onClick={() => removeAdjustment(adj.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-900">{adj.label}</p>
                              <p className="text-[11px] text-gray-500">{adj.condition}</p>
                            </div>
                            <Badge variant={adj.amount < 0 ? 'green' : 'yellow'}>
                              {adj.type === 'percentage' ? `${adj.amount > 0 ? '+' : ''}${adj.amount}%` : `${adj.amount > 0 ? '+' : ''}${adj.amount} RUB`}
                            </Badge>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Предпросмотр расчета</h3>
          <Badge variant="yellow">ожидает API</Badge>
        </div>
        <p className="text-xs text-gray-500">
          Предпросмотр расчета станет доступен после подключения API ценообразования. Можно будет проверять итоговые цены для разных дат и длительностей.
        </p>
      </Card>
    </div>
  );
}
