import { z } from 'zod';

export const createAthleteSchema = z.object({
    is_simple_athlete: z.literal(true),
    name: z
        .string()
        .min(2, 'Fullt nafn verður að vera að minnsta kosti 2 stafir')
        .max(50, 'Fullt nafn má ekki fara yfir 50 stafi'),
    age: z
        .number('Vinsamlegast settu aldur')
        .int()
        .positive('Aldur getur ekki verið neikvæð tala')
        .max(99, 'Aldur getur ekki verið hærri en 99'),
    gender: z.enum(['KK', 'KVK'], { message: 'Vinsamlegast veldu kyn' }),
});

export type CreateAthleteRequest = z.infer<typeof createAthleteSchema>;

export const updateAthleteSchema = z.object({
    name: z
        .string()
        .min(2, 'Fullt nafn verður að vera að minnsta kosti 2 stafir')
        .max(50, 'Fullt nafn má ekki fara yfir 50 stafi')
        .optional(),
    age: z
        .number('Vinsamlegast settu aldur')
        .int()
        .positive('Aldur getur ekki verið neikvæð tala')
        .max(99, 'Aldur getur ekki verið hærri en 99')
        .optional(),
    gender: z
        .enum(['KK', 'KVK'], { message: 'Vinsamlegast veldu kyn' })
        .optional(),
});

export type UpdateAthleteRequest = z.infer<typeof updateAthleteSchema>;
