import { useEffect, useState } from 'react';
import { Building2, CreditCard, MapPin, Plus, Save, Shield, Trash2, UserRound, UsersRound } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useAuth } from '../../context/useAuth';
import { ApiError, acquiringApi, profileApi, providerMembersApi } from '../../lib/api-client';
import type { AcquiringConnection, AcquiringOnboardingPayload, ProviderInvitation, ProviderMember, ProviderMemberRoleOption } from '../../types';
import { LocationsPage } from '../locations/LocationsPage';
import { PolicyPage } from '../policy/PolicyPage';

type SettingsTab = 'profile' | 'policy' | 'locations' | 'account' | 'employees' | 'payments';

interface SettingsPageProps {
  tab: SettingsTab;
  onNavigate: (path: string) => void;
}

const tabs: { id: SettingsTab; label: string; path: string; icon: typeof Building2 }[] = [
  { id: 'account', label: 'Аккаунт', path: '/settings/account', icon: UserRound },
  { id: 'profile', label: 'Магазин', path: '/settings/profile', icon: Building2 },
  { id: 'employees', label: 'Сотрудники', path: '/settings/employees', icon: UsersRound },
  { id: 'locations', label: 'Пункты выдачи', path: '/settings/locations', icon: MapPin },
  { id: 'policy', label: 'Правила', path: '/settings/policy', icon: Shield },
  { id: 'payments', label: 'Оплата', path: '/settings/payments', icon: CreditCard },
];

export function SettingsPage({ tab, onNavigate }: SettingsPageProps) {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="shrink-0 border-b border-gray-200 bg-white px-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map(item => {
            const Icon = item.icon;
            const active = item.id === tab;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition ${
                  active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-white">
        {tab === 'profile' && <ShopProfileSettings />}
        {tab === 'policy' && <PolicyPage embedded />}
        {tab === 'locations' && <LocationsPage embedded />}
        {tab === 'employees' && <EmployeesSettings />}
        {tab === 'payments' && <PaymentSettings />}
        {tab === 'account' && <AccountSettings />}
      </div>
    </div>
  );
}

function ShopProfileSettings() {
  const { activeMembership } = useAuth();
  const [form, setForm] = useState({
    displayName: activeMembership?.displayName ?? '',
    legalName: '',
    contactEmail: '',
    contactPhone: '',
    city: '',
    addressLine: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');
    profileApi.get()
      .then(nextProfile => {
        if (cancelled) return;
        setForm({
          displayName: nextProfile.displayName ?? activeMembership?.displayName ?? '',
          legalName: nextProfile.legalName ?? '',
          contactEmail: nextProfile.contactEmail ?? '',
          contactPhone: nextProfile.contactPhone ?? '',
          city: nextProfile.city ?? '',
          addressLine: nextProfile.addressLine ?? '',
          description: nextProfile.description ?? '',
        });
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof ApiError ? `Профиль магазина пока недоступен: ${err.message}` : 'Профиль магазина пока недоступен.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeMembership?.displayName]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await profileApi.patch({
        displayName: form.displayName.trim(),
        legalName: form.legalName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        city: form.city.trim() || undefined,
        addressLine: form.addressLine.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? `Не удалось сохранить профиль: ${err.message}` : 'Не удалось сохранить профиль.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-none border-0 p-6 shadow-none">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Основная информация</h2>
          <p className="mt-0.5 text-xs text-gray-500">Название, контакты и описание текущего магазина.</p>
        </div>
        {saved && <Badge variant="green">сохранено</Badge>}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Загружаем профиль магазина...</p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Название магазина"
              value={form.displayName}
              onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))}
            />
            <Input
              label="Юридическое название"
              value={form.legalName}
              onChange={event => setForm(current => ({ ...current, legalName: event.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              value={form.contactEmail}
              onChange={event => setForm(current => ({ ...current, contactEmail: event.target.value }))}
            />
            <Input
              label="Телефон"
              value={form.contactPhone}
              onChange={event => setForm(current => ({ ...current, contactPhone: event.target.value }))}
            />
            <Input
              label="Город"
              value={form.city}
              onChange={event => setForm(current => ({ ...current, city: event.target.value }))}
            />
            <Input
              label="Адрес"
              value={form.addressLine}
              onChange={event => setForm(current => ({ ...current, addressLine: event.target.value }))}
            />
          </div>
          <Textarea
            label="Описание"
            rows={4}
            value={form.description}
            onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
            placeholder="Коротко о прокате, условиях выдачи и особенностях магазина..."
          />
          <Button variant="primary" onClick={() => void save()} loading={saving}>
            <Save size={14} /> Сохранить
          </Button>
        </div>
      )}
    </Card>
  );
}

function EmployeesSettings() {
  const { user, activeMembership } = useAuth();
  const [view, setView] = useState<'staff' | 'invites'>('staff');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [members, setMembers] = useState<ProviderMember[]>([]);
  const [invitations, setInvitations] = useState<ProviderInvitation[]>([]);
  const [roleOptions, setRoleOptions] = useState<ProviderMemberRoleOption[]>([]);
  const [form, setForm] = useState({ email: '', role: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');
  const [inviteError, setInviteError] = useState('');
  const providerId = activeMembership?.providerId ?? '';
  const isSelfOwner = (member: ProviderMember) => member.userId === user?.id && isOwnerRole(member.role);

  const loadMembers = async () => {
    if (!providerId) {
      setLoading(false);
      setPageError('Не найден активный магазин.');
      return;
    }

    setLoading(true);
    setPageError('');
    try {
      const [nextOptions, nextMembers, nextInvitations] = await Promise.all([
        providerMembersApi.options(providerId),
        providerMembersApi.listMembers(providerId),
        providerMembersApi.listInvitations(providerId),
      ]);
      setRoleOptions(nextOptions.roles);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
      setForm(current => current.role ? current : { ...current, role: nextOptions.roles[0]?.value ?? '' });
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : 'Не удалось загрузить сотрудников.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [providerId]);

  const addMember = async () => {
    if (!form.email.trim()) {
      setInviteError('Укажите email сотрудника.');
      return;
    }
    if (!form.role) {
      setInviteError('Выберите роль сотрудника.');
      return;
    }

    setSaving(true);
    setInviteError('');
    try {
      await providerMembersApi.invite(providerId, {
        email: form.email.trim(),
        role: form.role,
      });
      const nextInvitations = await providerMembersApi.listInvitations(providerId);
      setInvitations(nextInvitations);
      setForm({ email: '', role: roleOptions[0]?.value ?? '' });
      setInviteOpen(false);
      setView('invites');
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : 'Не удалось отправить приглашение.');
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member: ProviderMember, role: string) => {
    if (role === member.role) return;
    if (isSelfOwner(member)) {
      setPageError('Нельзя изменить собственную роль владельца.');
      return;
    }

    setUpdatingMemberId(member.membershipId);
    setPageError('');
    try {
      const updated = await providerMembersApi.updateRole(providerId, member.membershipId, role);
      setMembers(current => current.map(item => item.membershipId === updated.membershipId ? updated : item));
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : 'Не удалось изменить роль.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const removeMember = async (member: ProviderMember) => {
    if (isSelfOwner(member)) {
      setPageError('Нельзя удалить собственный доступ владельца.');
      return;
    }

    if (!window.confirm(`Удалить доступ для ${member.email ?? memberName(member)}?`)) return;

    setUpdatingMemberId(member.membershipId);
    setPageError('');
    try {
      await providerMembersApi.remove(providerId, member.membershipId);
      setMembers(current => current.filter(item => item.membershipId !== member.membershipId));
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : 'Не удалось удалить доступ.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <>
      <Card className="rounded-none border-0 p-6 shadow-none">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">Сотрудники</h2>
            <p className="mt-0.5 text-xs text-gray-500">Доступы команды к кабинету магазина.</p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setInviteError('');
              setInviteOpen(true);
            }}
            disabled={!providerId || roleOptions.length === 0}
          >
            <Plus size={14} /> Пригласить
          </Button>
        </div>

        <div className="mb-4 inline-flex rounded-md border bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setView('staff')}
            className={`h-8 rounded px-3 text-xs font-medium transition ${
              view === 'staff' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Список сотрудников
          </button>
          <button
            type="button"
            onClick={() => setView('invites')}
            className={`h-8 rounded px-3 text-xs font-medium transition ${
              view === 'invites' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            История приглашений
          </button>
        </div>

        {pageError && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{pageError}</p>}

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Загружаем сотрудников...</div>
        ) : view === 'staff' ? (
          <div className="overflow-hidden border-y border-gray-100">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                <tr>
                  <th className="w-[38%] px-3 py-2">Сотрудник</th>
                  <th className="w-[34%] px-3 py-2">Email</th>
                  <th className="w-[180px] px-3 py-2">Роль</th>
                  <th className="w-14 px-3 py-2 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map(member => {
                  const owner = isOwnerRole(member.role);
                  const memberBusy = updatingMemberId === member.membershipId;

                  return (
                    <tr key={member.membershipId} className="align-middle">
                      <td className="min-w-0 px-3 py-3">
                        <p className="truncate font-medium text-gray-900">{memberName(member)}</p>
                      </td>
                      <td className="min-w-0 px-3 py-3">
                        <p className="truncate text-gray-600">{member.email ?? 'email не указан'}</p>
                      </td>
                      <td className="px-3 py-3">
                        {owner ? (
                          <Badge variant="gray">{roleLabel(member.role, roleOptions)}</Badge>
                        ) : (
                          <Select
                            aria-label="Роль сотрудника"
                            value={member.role}
                            options={roleOptions}
                            disabled={memberBusy}
                            className="w-full"
                            onChange={event => void changeRole(member, event.target.value)}
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {!owner && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            disabled={memberBusy}
                            onClick={() => void removeMember(member)}
                            title="Удалить доступ"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {members.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500">Сотрудников пока нет.</div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden border-y border-gray-100">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                <tr>
                  <th className="w-[30%] px-3 py-2">Email</th>
                  <th className="w-[160px] px-3 py-2">Роль</th>
                  <th className="w-[140px] px-3 py-2">Статус</th>
                  <th className="w-[24%] px-3 py-2">Пригласил</th>
                  <th className="w-[180px] px-3 py-2">Срок</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitations.map(invitation => (
                  <tr key={invitation.invitationId} className="align-middle">
                    <td className="min-w-0 px-3 py-3">
                      <p className="truncate font-medium text-gray-900">{invitation.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="gray">{roleLabel(invitation.role, roleOptions)}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={invitationStatusVariant(invitation.status)}>
                        {invitationStatusLabel(invitation.status)}
                      </Badge>
                    </td>
                    <td className="min-w-0 px-3 py-3">
                      <p className="truncate text-gray-600">{invitation.invitedByName || invitation.invitedByEmail || '—'}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{formatDate(invitation.sentAt)}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {invitation.status === 'pending' ? formatDate(invitation.expiresAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invitations.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500">Приглашений пока нет.</div>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInviteError('');
        }}
        title="Пригласить сотрудника"
        size="sm"
      >
        <div className="space-y-3">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={event => {
              setInviteError('');
              setForm(current => ({ ...current, email: event.target.value }));
            }}
            placeholder="ivan@example.com"
          />
          <Select
            label="Роль"
            value={form.role}
            options={roleOptions}
            onChange={event => {
              setInviteError('');
              setForm(current => ({ ...current, role: event.target.value }));
            }}
          />
          {inviteError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{inviteError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
              Отмена
            </Button>
            <Button type="button" variant="primary" onClick={() => void addMember()} loading={saving} disabled={!form.role}>
              <Plus size={14} /> Отправить приглашение
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function AccountSettings() {
  const { user } = useAuth();

  return (
    <div>
      <Card className="rounded-none border-0 p-6 shadow-none">
        <h2 className="text-sm font-semibold text-gray-900">Аккаунт</h2>
        <div className="mt-4 space-y-3 text-sm">
          <InfoRow label="Имя" value={user?.name ?? '—'} />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Роли" value={user?.roles?.join(', ') || user?.role || '—'} />
          <InfoRow label="Email подтвержден" value={user?.emailVerified === false ? 'Нет' : 'Да'} />
        </div>
      </Card>
    </div>
  );
}

function PaymentSettings() {
  const { user, activeMembership } = useAuth();
  const [connections, setConnections] = useState<AcquiringConnection[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    legalEntityName: activeMembership?.displayName ?? '',
    taxpayerNumber: '',
    registrationNumber: '',
    registeredAddress: '',
    contactSurname: '',
    contactName: user?.name ?? '',
    contactEmail: user?.email ?? '',
    contactPhone: '',
    contactPosition: 'Директор',
    billingDescriptor: activeMembership?.displayName ?? '',
    shortName: activeMembership?.displayName ?? '',
    siteUrl: '',
    okved: '77.21',
    actualAddress: '',
    bankName: '',
    bankAccount: '',
    correspondentAccount: '',
    bik: '',
    beneficiaryName: activeMembership?.displayName ?? '',
  });

  const selected = connections.find(connection => connection.connectionId === selectedId) ?? connections[0] ?? null;
  const routability = selected?.routability;

  const loadConnections = async () => {
    setLoading(true);
    setError('');
    try {
      const nextConnections = await acquiringApi.list();
      setConnections(nextConnections);
      setSelectedId(current => current || nextConnections[0]?.connectionId || '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить платежную настройку.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConnections();
  }, []);

  const createConnection = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const connection = await acquiringApi.create('t_bank');
      setConnections(current => [connection, ...current]);
      setSelectedId(connection.connectionId);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать платежную заявку.');
    } finally {
      setSaving(false);
    }
  };

  const submitOnboarding = async () => {
    if (!selected) return;

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload: AcquiringOnboardingPayload = {
        legalProfile: {
          legalEntityName: form.legalEntityName.trim(),
          legalName: form.legalEntityName.trim(),
          taxpayerNumber: form.taxpayerNumber.trim(),
          registrationNumber: form.registrationNumber.trim(),
          registeredAddress: form.registeredAddress.trim(),
        },
        contactProfile: {
          surname: form.contactSurname.trim(),
          name: form.contactName.trim(),
          email: form.contactEmail.trim(),
          phone: form.contactPhone.trim(),
          position: form.contactPosition.trim(),
        },
        businessProfile: {
          billingDescriptor: form.billingDescriptor.trim(),
          shortName: form.shortName.trim(),
          siteUrl: form.siteUrl.trim(),
          okved: form.okved.trim(),
          actualAddress: form.actualAddress.trim() || form.registeredAddress.trim(),
          comment: null,
        },
        chiefExecutive: null,
        founders: [],
        settlementProfile: {
          mode: 'bank_account',
          bankName: form.bankName.trim(),
          bankAccount: form.bankAccount.trim(),
          correspondentAccount: form.correspondentAccount.trim(),
          bik: form.bik.trim(),
          beneficiaryName: form.beneficiaryName.trim(),
          phone: form.contactPhone.trim(),
          sbpMemberId: null,
          displayBankName: form.bankName.trim(),
        },
      };
      const updated = await acquiringApi.submitOnboarding(selected.connectionId, payload);
      setConnections(current => current.map(connection => connection.connectionId === updated.connectionId ? updated : connection));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить платежную заявку.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-none border-0 p-6 shadow-none">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Оплата</h2>
          <p className="mt-0.5 text-xs text-gray-500">T-Bank, маршрут выплат и статус привязки сделки.</p>
        </div>
        {saved && <Badge variant="green">сохранено</Badge>}
      </div>

      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Загружаем платежную настройку...</div>
      ) : !selected ? (
        <div className="border-y border-gray-100 py-8">
          <p className="text-sm font-medium text-gray-900">Черновик платежной заявки еще не создан.</p>
          <p className="mt-1 max-w-xl text-xs text-gray-500">
            Создайте черновик T-Bank, заполните данные по разделам и отправьте заявку на проверку.
          </p>
          <Button className="mt-4" type="button" variant="primary" onClick={() => void createConnection()} loading={saving}>
            <Plus size={14} /> Создать черновик
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="border-y border-gray-100 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Черновик платежной заявки</h3>
                <p className="mt-0.5 text-xs text-gray-500">Заявка T-Bank и операторская готовность маршрута выплат.</p>
              </div>
              <Badge variant={routability?.paymentRouteable ? 'green' : selected.status === 'draft' ? 'yellow' : 'gray'}>
                {routability?.paymentRouteable ? 'готово' : selected.status}
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <PaymentState label="Статус" value={selected.status} />
              <PaymentState label="Магазин" value={selected.shopCode || '—'} />
              <PaymentState label="Маршрут" value={selected.routing?.routeStatus ?? (routability?.recipientRouteReady ? 'ready' : 'missing')} />
              <PaymentState label="Сделка" value={selected.dealBinding?.status ?? (routability?.dealBindingReady ? 'ready' : 'missing')} />
            </div>
          </div>

          {routability && (
            <div className={`rounded-md border px-3 py-2 text-xs ${
              routability.paymentRouteable ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}>
              {routability.paymentRouteable
                ? 'Платежный маршрут готов.'
                : `Платежный маршрут ожидает настройки: ${routability.reasonCodes.join(', ') || 'проверка не завершена'}.`}
            </div>
          )}

          <PaymentDraftSection title="Юридические данные">
            <Input label="Юридическое лицо" value={form.legalEntityName} onChange={event => setForm(current => ({ ...current, legalEntityName: event.target.value }))} />
            <Input label="ИНН" value={form.taxpayerNumber} onChange={event => setForm(current => ({ ...current, taxpayerNumber: event.target.value }))} />
            <Input label="ОГРН" value={form.registrationNumber} onChange={event => setForm(current => ({ ...current, registrationNumber: event.target.value }))} />
            <Input label="Юридический адрес" value={form.registeredAddress} onChange={event => setForm(current => ({ ...current, registeredAddress: event.target.value }))} />
          </PaymentDraftSection>

          <PaymentDraftSection title="Контактное лицо">
            <Input label="Фамилия" value={form.contactSurname} onChange={event => setForm(current => ({ ...current, contactSurname: event.target.value }))} />
            <Input label="Имя" value={form.contactName} onChange={event => setForm(current => ({ ...current, contactName: event.target.value }))} />
            <Input label="Email" type="email" value={form.contactEmail} onChange={event => setForm(current => ({ ...current, contactEmail: event.target.value }))} />
            <Input label="Телефон" value={form.contactPhone} onChange={event => setForm(current => ({ ...current, contactPhone: event.target.value }))} />
            <Input label="Должность" value={form.contactPosition} onChange={event => setForm(current => ({ ...current, contactPosition: event.target.value }))} />
          </PaymentDraftSection>

          <PaymentDraftSection title="Бизнес-профиль">
            <Input label="Краткое название" value={form.shortName} onChange={event => setForm(current => ({ ...current, shortName: event.target.value }))} />
            <Input label="Название в выписке" value={form.billingDescriptor} onChange={event => setForm(current => ({ ...current, billingDescriptor: event.target.value }))} />
            <Input label="Сайт" value={form.siteUrl} onChange={event => setForm(current => ({ ...current, siteUrl: event.target.value }))} />
            <Input label="ОКВЭД" value={form.okved} onChange={event => setForm(current => ({ ...current, okved: event.target.value }))} />
            <Input label="Фактический адрес" value={form.actualAddress} onChange={event => setForm(current => ({ ...current, actualAddress: event.target.value }))} />
          </PaymentDraftSection>

          <PaymentDraftSection title="Расчетный счет">
            <Input label="Банк" value={form.bankName} onChange={event => setForm(current => ({ ...current, bankName: event.target.value }))} />
            <Input label="Расчетный счет" value={form.bankAccount} onChange={event => setForm(current => ({ ...current, bankAccount: event.target.value }))} />
            <Input label="Корреспондентский счет" value={form.correspondentAccount} onChange={event => setForm(current => ({ ...current, correspondentAccount: event.target.value }))} />
            <Input label="БИК" value={form.bik} onChange={event => setForm(current => ({ ...current, bik: event.target.value }))} />
            <Input label="Получатель" value={form.beneficiaryName} onChange={event => setForm(current => ({ ...current, beneficiaryName: event.target.value }))} />
          </PaymentDraftSection>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="primary" onClick={() => void submitOnboarding()} loading={saving}>
              <Save size={14} /> Отправить заявку
            </Button>
            <Button type="button" variant="secondary" onClick={() => void loadConnections()} disabled={saving}>
              Обновить статус
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function PaymentState({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function PaymentDraftSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-gray-100 bg-gray-50/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function roleLabel(role: string, options: ProviderMemberRoleOption[]) {
  return options.find(option => option.value === role)?.label ?? role;
}

function isOwnerRole(role: string) {
  return role.toLowerCase() === 'owner';
}

function memberName(member: ProviderMember) {
  const fullName = [member.name, member.surname].filter(Boolean).join(' ').trim();
  return fullName || member.email || member.userId;
}

function invitationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'ожидает',
    accepted: 'принято',
    expired: 'истекло',
  };

  return labels[status.toLowerCase()] ?? status;
}

function invitationStatusVariant(status: string): 'green' | 'yellow' | 'red' | 'gray' {
  const normalized = status.toLowerCase();
  if (normalized === 'accepted') return 'green';
  if (normalized === 'expired') return 'red';
  if (normalized === 'pending') return 'yellow';
  return 'gray';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="min-w-0 text-right text-xs font-medium text-gray-900 break-words">{value}</span>
    </div>
  );
}
