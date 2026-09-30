import { request } from "./client";

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface UserItem {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  customer_id?: string;
  last_login_at?: string;
  created_at: string;
  role?: Role;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role_id: string;
}

export interface UpdateUserData {
  full_name: string;
  phone?: string;
  is_active: boolean;
  role_id?: string;
}

export const usersApi = {
  getUsers: (search?: string, role?: string) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (role) params.append("role", role);
    const qs = params.toString();
    return request<{ users: UserItem[]; total: number }>(`/users${qs ? `?${qs}` : ""}`);
  },

  getRoles: () => {
    return request<{ roles: Role[] }>("/users/roles");
  },

  getUser: (id: string) => {
    return request<UserItem>(`/users/${id}`);
  },

  createUser: (data: CreateUserData) => {
    return request<UserItem>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateUser: (id: string, data: UpdateUserData) => {
    return request<{ message: string }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  resetPassword: (id: string, new_password: string) => {
    return request<{ message: string }>(`/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ new_password }),
    });
  },

  deleteUser: (id: string) => {
    return request<{ message: string }>(`/users/${id}`, {
      method: "DELETE",
    });
  },
};
