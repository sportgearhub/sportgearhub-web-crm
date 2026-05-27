import type {
  ProviderOnboarding,
  ProviderOnboardingDraft,
  ProviderOnboardingPayoutDraft,
  ProviderOnboardingOptions,
} from '../../lib/api-client';
import type { BankRequisitesForm, FormFieldKey, FormState, SbpPayoutForm } from './onboardingTypes';

export const emptyForm: FormState = {
  displayName: '',
  legalName: '',
  legalCountryCode: 'RU',
  legalForm: '',
  taxationSystem: '',
  taxNumber: '',
  registrationNumber: '',
  branchNumber: '',
  registeredAddress: '',
  contactEmail: '',
  contactPhone: '',
  cityId: '',
  city: '',
  address: '',
  description: '',
  acquiringProvider: '',
  payoutSchedule: '',
};

export const emptyBankForm: BankRequisitesForm = {
  settlementAccount: '',
  bik: '',
  correspondentAccount: '',
  bankName: '',
};

export const emptySbpForm: SbpPayoutForm = {
  phone: '',
  sbpMemberId: '',
  displayBankName: '',
  bankName: '',
};

export function formFromDraft(draft: ProviderOnboardingDraft | null): FormState {
  if (!draft) return { ...emptyForm };

  return Object.fromEntries(
    Object.keys(emptyForm).map(key => {
      const typedKey = key as FormFieldKey;
      if (typedKey === 'legalCountryCode') return [typedKey, 'RU'];
      if (typedKey === 'contactPhone') return [typedKey, normalizeRuPhoneLocal(draft.contactPhone ?? '')];
      return [typedKey, draft[typedKey] ?? emptyForm[typedKey]];
    })
  ) as FormState;
}

export function bankFormFromDraft(draft: ProviderOnboardingDraft | null): BankRequisitesForm {
  const payoutDraft = draft?.payoutDraft;
  if (!payoutDraft || payoutDraft.mode !== 't_bank_bank_account') return { ...emptyBankForm };

  return {
    settlementAccount: payoutDraft.bankAccount ?? '',
    bik: normalizeBic(payoutDraft.bik ?? ''),
    correspondentAccount: payoutDraft.correspondentAccount ?? '',
    bankName: payoutDraft.displayBankName ?? payoutDraft.bankName ?? '',
  };
}

export function sbpFormFromDraft(draft: ProviderOnboardingDraft | null): SbpPayoutForm {
  const payoutDraft = draft?.payoutDraft;
  if (!payoutDraft || payoutDraft.mode !== 't_bank_sbp_individual') return { ...emptySbpForm };

  return {
    phone: normalizeRuPhoneLocal(payoutDraft.phone ?? ''),
    sbpMemberId: payoutDraft.sbpMemberId ?? '',
    displayBankName: payoutDraft.displayBankName ?? '',
    bankName: payoutDraft.bankName ?? '',
  };
}

export function normalizeRuPhoneLocal(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return digits.slice(1, 11);
  }
  return digits.slice(0, 10);
}

export function normalizeBic(value: string) {
  return value.replace(/\D/g, '').slice(0, 9);
}

export function formatRuPhoneForApi(localPhone: string) {
  const normalized = normalizeRuPhoneLocal(localPhone);
  return normalized.length === 10 ? `+7${normalized}` : normalized || null;
}

export function formatReviewDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function payoutScheduleDescription(schedule: ProviderOnboardingOptions['payoutSchedules'][number]) {
  const parts: string[] = [];
  if (schedule.payoutDaysOfMonth?.length) {
    parts.push(`${schedule.payoutDaysOfMonth.join(', ')} числа месяца`);
  }

  return parts.join('. ') || null;
}

export function payoutModeDescription(mode: NonNullable<ProviderOnboardingOptions['payoutModes']>[number] | undefined) {
  if (!mode) return null;

  const parts: string[] = [];
  if (mode.description) parts.push(mode.description);

  const fee = mode.bankPayoutFee;
  const percent = formatPercent(fee?.percent);
  if (percent) {
    const minimum = fee?.minimumAmount
      ? `, минимум ${fee.minimumAmount} ${fee.currency ?? 'RUB'}`
      : '';
    parts.push(`Тариф на перевод платежей - ${percent}%${minimum}`);
  }

  return parts.join('. ') || null;
}

export function buildQuickOnboardingDraft(form: FormState): Partial<ProviderOnboardingDraft> {
  return {
    legalCountryCode: 'RU',
    taxNumber: form.taxNumber.trim() || null,
    legalForm: form.legalForm.trim() || null,
    taxationSystem: form.taxationSystem.trim() || null,
    displayName: form.displayName.trim() || null,
    cityId: form.cityId.trim() || null,
  };
}

export function buildFullOnboardingPatch(
  form: FormState,
  bankForm: BankRequisitesForm,
  sbpForm: SbpPayoutForm
): Partial<ProviderOnboardingDraft> {
  return {
    displayName: form.displayName.trim() || null,
    legalName: form.legalName.trim() || null,
    legalForm: form.legalForm.trim() || null,
    taxNumber: form.taxNumber.trim() || null,
    taxationSystem: form.taxationSystem.trim() || null,
    contactEmail: form.contactEmail.trim() || null,
    contactPhone: formatRuPhoneForApi(form.contactPhone),
    cityId: form.cityId.trim() || null,
    address: form.address.trim() || null,
    description: form.description.trim() || null,
    payoutSchedule: form.payoutSchedule.trim() || null,
    payoutDraft: buildPayoutDraft(form, bankForm, sbpForm),
  };
}

export function isSelfEmployedLegalForm(legalForm: string, taxationSystem: string) {
  return legalForm === 'self_employed' || legalForm === 'self-employed' || taxationSystem === 'npd';
}

export function isChecklistReady(checklist: ProviderOnboarding['checklist']) {
  if (!checklist) return false;
  return Object.values(checklist).every(value => value === 'ready');
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}

function buildPayoutDraft(form: FormState, bankForm: BankRequisitesForm, sbpForm: SbpPayoutForm): ProviderOnboardingPayoutDraft {
  const beneficiaryName = form.legalName.trim() || form.displayName.trim() || null;

  if (isSelfEmployedLegalForm(form.legalForm, form.taxationSystem)) {
    return {
      mode: 't_bank_sbp_individual',
      beneficiaryName,
      bankName: sbpForm.bankName.trim() || null,
      bik: null,
      bankAccount: null,
      correspondentAccount: null,
      displayBankName: sbpForm.displayBankName.trim() || null,
      phone: formatRuPhoneForApi(sbpForm.phone || form.contactPhone),
      sbpMemberId: sbpForm.sbpMemberId.trim() || null,
    };
  }

  return {
    mode: 't_bank_bank_account',
    beneficiaryName,
    bankName: bankForm.bankName.trim() || null,
    bik: normalizeBic(bankForm.bik) || null,
    bankAccount: bankForm.settlementAccount.replace(/\D/g, '') || null,
    correspondentAccount: bankForm.correspondentAccount.replace(/\D/g, '') || null,
    displayBankName: bankForm.bankName.trim() || null,
    phone: null,
    sbpMemberId: null,
  };
}
