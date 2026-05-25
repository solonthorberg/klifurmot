import * as z from 'zod';

export const LoginSchema = z.object({
    email: z.email('Vinsamlega sláðu inn gilt netfang'),
    password: z.string({ error: 'Vinsamlega sláðu inn gilt lykilorð' }).min(1),
    recaptcha_token: z.string(),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
    .object({
        username: z
            .string()
            .trim()
            .min(2, 'Notendanafn verður að vera að minnsta kosti 2 stafir')
            .max(15, 'Notendanafn má ekki fara yfir 15 stafi')
            .regex(/^\S+$/, 'Má ekki innihalda bil'),
        email: z.email('Vinsamlega sláðu inn gilt netfang'),
        password: z
            .string()
            .min(8, 'Lykilorð verður að vera að minnsta kosti 8 stafir'),
        password2: z.string(),
        full_name: z
            .string()
            .min(2, 'Fullt nafn verður að vera að minnsta kosti 2 stafir')
            .max(50, 'Fullt nafn má ekki fara yfir 50 stafi'),
        gender: z.enum(['KK', 'KVK'], { error: 'Vinsamlega veldu kyn' }),
        date_of_birth: z
            .string()
            .refine((val) => !val || new Date(val) <= new Date(), {
                message: 'Fæðingardagur getur ekki verið í framtíðinni',
            }),
        nationality: z.string().min(1, 'Vinsamlega veldu þjóðerni'),
        recaptcha_token: z.string(),
    })
    .refine((data) => data.password === data.password2, {
        message: 'Lykilorð stemma ekki',
        path: ['password2'],
    });

export type RegisterFormData = z.infer<typeof RegisterSchema>;

export const ProfileSchema = z.object({
    profile_picture: z.any().optional(),
    username: z
        .string()
        .min(2, 'Notendanafn verður að vera að minnsta kosti 2 stafir')
        .max(15, 'Notendanafn má ekki fara yfir 15 stafi'),
    height_cm: z.coerce
        .number()
        .min(0, 'Hæð getur ekki verið minna en 0 cm')
        .optional(),
    wingspan_cm: z.coerce
        .number()
        .min(0, 'Faðmur getur ekki verið minna en 0 cm')
        .optional(),
});

export type ProfileFormData = z.infer<typeof ProfileSchema>;

export const RequestPasswordResetSchema = z.object({
    email: z.email('Ógilt netfang'),
});

export type RequestPasswordResetFormData = z.infer<
    typeof RequestPasswordResetSchema
>;

export const ResetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(8, 'Lykilorð verður að vera að minnsta kosti 8 stafir'),
        password_confirm: z.string(),
    })
    .refine((data) => data.password === data.password_confirm, {
        message: 'Lykilorð stemma ekki',
        path: ['password_confirm'],
    });

export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;
