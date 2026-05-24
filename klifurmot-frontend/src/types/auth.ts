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
    height_cm?: number;
    wingspan_cm?: number;
}

export interface UpdateUserAccount {
    username: string;
    height_cm: number | null;
    wingspan_cm: number | null;
    profile_picture?: File | string | null;
}

export interface AuthResponse {
    access: string;
    user: {
        id: number;
        username: string;
        email: string;
        full_name: string;
    };
}

export interface LoginResponse {
    access: string;
    user: User;
}

export interface Countries {
    country_code: string;
    name_en: string;
    name_local: string;
}
