import * as z from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Vinsamlegast sláðu inn gilt netfang'),
    password: z.string().min(1, 'Vinsamlegast sláðu inn gilt lykilorð'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
    .object({
        username: z
            .string()
            .min(2, 'Notendanafn verður að vera að minnsta kosti 2 stafir'),
        email: z.string().email('Vinsamlegast sláðu inn gilt netfang'),
        password: z
            .string()
            .min(8, 'Lykilorð verður að vera að minnsta kosti 8 stafir'),
        password2: z.string(),
        full_name: z
            .string()
            .min(2, 'Fullt nafn verður að vera að minnsta kosti 2 stafir'),
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

export type RegisterFormData = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
    profile_image: z.ZodFile,
    username: z
        .string()
        .min(2, 'Notendanafn verður að vera að minnsta kosti 2 stafir'),
    height_cm: z
        .string()
        .refine((val) => !val || Number(val) >= 0, {
            message: 'Hæð getur ekki verið minna en 0 cm',
        })
        .optional(),
    wingspan_cm: z
        .string()
        .refine((val) => !val || Number(val) >= 0, {
            message: 'Vænghaf getur ekki verið minna en 0 cm',
        })
        .optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
