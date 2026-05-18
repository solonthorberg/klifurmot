import * as z from 'zod';

export const LoginSchema = z.object({
    email: z.string().email('Vinsamlegast sláðu inn gilt netfang'),
    password: z.string().min(1, 'Vinsamlegast sláðu inn gilt lykilorð'),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
    .object({
        username: z
            .string()
            .min(2, 'Notendanafn verður að vera að minnsta kosti 2 stafi')
            .max(15, 'Notendanafn má ekki fara yfir 15 stafi'),
        email: z.string().email('Vinsamlegast sláðu inn gilt netfang'),
        password: z
            .string()
            .min(8, 'Lykilorð verður að vera að minnsta kosti 8 stafir'),
        password2: z.string(),
        full_name: z
            .string()
            .min(2, 'Fullt nafn verður að vera að minnsta kosti 2 stafir')
            .max(50, 'Fullt nafn má ekki fara yfir 50 stafi'),
        gender: z.enum(['KK', 'KVK'], { message: 'Vinsamlegast veldu kyn' }),
        date_of_birth: z
            .string()
            .refine((val) => !val || new Date(val) <= new Date(), {
                message: 'Fæðingardagur getur ekki verið í framtíðinni',
            }),
        nationality: z.string().min(1, 'Vinsamlegast veldu þjóðerni'),
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
