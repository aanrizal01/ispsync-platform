import { request } from "./client";

export interface PasspointProfile {
  id: string;
  name: string;
  operator_friendly_name: string;
  domain_name: string;
  realm: string;
  roaming_consortium_ois?: string[];
  eap_method: string;
  inner_auth: string;
  venue_name?: string;
  venue_group: number;
  venue_type: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PasspointCredential {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_number?: string;
  profile_id: string;
  profile_name?: string;
  username: string;
  password?: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  last_authenticated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePasspointProfileInput {
  name: string;
  operator_friendly_name: string;
  domain_name: string;
  realm: string;
  roaming_consortium_ois?: string[];
  eap_method: string;
  inner_auth: string;
  is_default?: boolean;
}

export interface IssuePasspointCredentialInput {
  profile_id?: string;
}

export interface PasspointPackage {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  speed_limit: string;
  is_popular: boolean;
}

export interface PasspointPurchaseInput {
  package_id: string;
  customer_name: string;
  phone: string;
  email?: string;
  payment_method: string;
}

export interface PasspointPurchaseResponse {
  order_id: string;
  package_name: string;
  amount: number;
  payment_method: string;
  qr_string: string;
  qr_image_url: string;
  expires_at: string;
  status: string;
}

export interface PasspointCheckInput {
  order_id: string;
  simulate_pay?: boolean;
}

export interface PasspointCheckResponse {
  status: string;
  credential_id: string;
  username: string;
  password: string;
  realm: string;
  domain_name: string;
  apple_profile_url: string;
  message: string;
}

export interface PasspointRenewInput {
  credential_id: string;
  package_id: string;
  payment_method: string;
}

export interface PasspointRenewResponse {
  order_id: string;
  credential_id: string;
  package_name: string;
  duration_days: number;
  amount: number;
  payment_method: string;
  qr_string: string;
  qr_image_url: string;
  expires_at: string;
  status: string;
}

export interface PasspointCheckRenewInput {
  order_id: string;
  simulate_pay?: boolean;
}

export interface PasspointCheckRenewResponse {
  status: string;
  credential_id: string;
  new_expires_at: string;
  message: string;
}

export const passpointApi = {
  getProfiles: () =>
    request<{ data: PasspointProfile[] }>("/passpoint/profiles"),

  getProfile: (id: string) =>
    request<PasspointProfile>(`/passpoint/profiles/${id}`),

  createProfile: (data: CreatePasspointProfileInput) =>
    request<PasspointProfile>("/passpoint/profiles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCredentials: (page = 1, limit = 20) =>
    request<{ data: PasspointCredential[]; meta: { total: number; page: number; limit: number } }>(
      `/passpoint/credentials?page=${page}&limit=${limit}`
    ),

  getCredential: (id: string) =>
    request<PasspointCredential>(`/passpoint/public/credentials/${id}`),

  issueCredential: (customerId: string, data?: IssuePasspointCredentialInput) =>
    request<PasspointCredential>(`/passpoint/customers/${customerId}/credentials`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  getCustomerCredentials: (customerId: string) =>
    request<{ data: PasspointCredential[] }>(`/passpoint/customers/${customerId}/credentials`),

  revokeCredential: (id: string) =>
    request<{ message: string }>(`/passpoint/credentials/${id}/revoke`, {
      method: "PATCH",
    }),

  getPackages: () =>
    request<PasspointPackage[]>("/passpoint/packages"),

  purchase: (data: PasspointPurchaseInput) =>
    request<PasspointPurchaseResponse>("/passpoint/purchase", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  checkPurchase: (data: PasspointCheckInput) =>
    request<PasspointCheckResponse>("/passpoint/check-purchase", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  renew: (data: PasspointRenewInput) =>
    request<PasspointRenewResponse>("/passpoint/renew", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  checkRenew: (data: PasspointCheckRenewInput) =>
    request<PasspointCheckRenewResponse>("/passpoint/check-renew", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAppleProfileUrl: (credentialId: string) => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "/api/v1");
    return `${apiBase}/passpoint/credentials/${credentialId}/apple-profile`;
  },
};


