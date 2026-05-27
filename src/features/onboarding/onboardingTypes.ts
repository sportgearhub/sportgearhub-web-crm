import type {
  ProviderOnboardingDraft,
  RuLegalIdentityLookupResponse,
} from '../../lib/api-client';

export type FormFieldKey = keyof Omit<ProviderOnboardingDraft, 'payoutDraft'>;
export type FormState = Record<FormFieldKey, string>;

export type BankRequisitesForm = {
  settlementAccount: string;
  bik: string;
  correspondentAccount: string;
  bankName: string;
};

export type SbpPayoutForm = {
  phone: string;
  sbpMemberId: string;
  displayBankName: string;
  bankName: string;
};

export type FieldErrorKey = keyof FormState | keyof BankRequisitesForm | keyof SbpPayoutForm | 'payoutMode';
export type FieldErrors = Partial<Record<FieldErrorKey, string>>;

export type LegalFormMismatch = {
  selectedLabel: string;
  returnedLabel: string;
  returnedValue: string;
};

export type LegalIdentitySuggestion = RuLegalIdentityLookupResponse;
export type FullSectionKey = 'organization' | 'requisites' | 'contacts' | 'profile';
