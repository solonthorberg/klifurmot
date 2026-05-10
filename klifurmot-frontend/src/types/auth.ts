export interface User {
    id: number;
    email: string;
    username: string;
}

export interface UserAccount {
    id: number;
    user: User;
    full_name: string | null;
    gender: 'KK' | 'KVK' | null;
    date_of_birth: string | null;
    nationality: string | null;
    is_admin: boolean;
    profile_picture: string | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    password2: string;
    full_name: string;
    gender: string;
    nationality: string;
    date_of_birth: string;
    height_cm?: string;
    wingspan_cm?: string;
}

export interface PasswordResetRequest {
    email: string;
}

export interface LoginResponse {
    access: string;
    refresh: string;
    user: User;
}

export interface Countries {
    country_code: string;
    name_en: string;
    name_local: string;
}
