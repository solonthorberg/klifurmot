import z from 'zod';

const dateString = z
    .string()
    .min(1, 'Skylda')
    .transform((val) =>
        new Date(val.length === 16 ? val + ':00' : val).toISOString(),
    );

export const CreateCompetitionSchema = z
    .object({
        title: z
            .string()
            .min(2, 'Titill verður að vera að minnsta kosti 2 stafir')
            .max(30, 'Titill má ekki fara yfir 30 stafi'),
        description: z
            .string()
            .max(300, 'Upplýsingar má ekki fara yfir 300 stafi')
            .optional(),
        start_date: dateString,
        end_date: dateString,
        location: z
            .string()
            .min(2, 'Staðsetning verður að vera að minnsta kosti 2 stafir')
            .max(30, 'Staðsetning má ekki fara yfir 30 stafi'),
        image: z.any().optional(),
        visible: z.boolean(),
    })
    .superRefine((data, ctx) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (data.start_date && new Date(data.start_date) < now) {
            ctx.addIssue({
                code: 'custom',
                message: 'Byrjunardagsetning má ekki vera í fortíðinni',
                path: ['start_date'],
            });
        }

        if (
            data.end_date &&
            data.start_date &&
            new Date(data.end_date) < new Date(data.start_date)
        ) {
            ctx.addIssue({
                code: 'custom',
                message:
                    'Endingardagsetning þarf að vera eftir byrjunardagsetningu',
                path: ['end_date'],
            });
        }
    });

export type CreateCompetitionFormData = z.infer<typeof CreateCompetitionSchema>;

export const CreateCategorySchema = z.object({
    category_group: z
        .number('Flokkur getur ekki verið tómur')
        .int()
        .positive('Flokkur getur ekki verið tómur'),
    gender: z.enum(['KK', 'KVK'], 'Vinsamlegast veldu kyn'),
});

export type CreateCategoryFormData = z.infer<typeof CreateCategorySchema>;

export const CreateRoundSchema = z.object({
    round_group: z.number('Veldu umferð').int().positive('Veldu umferð'),
    round_order: z.number(),
    climbers_advance: z
        .number()
        .int('Tala þarf að vera heiltala')
        .nonnegative('Tala þarf að vera jákvæð')
        .max(200, 'Hámark 200 keppendur')
        .nullable(),
    boulder_count: z
        .number('Sláðu inn fjölda leiða')
        .int('Tala þarf að vera heiltala')
        .positive('Tala þarf að vera jákvæð')
        .max(100, 'Hámark 100 leiðir'),
    is_self_scoring: z.boolean(),
});

export type CreateRoundFormData = z.infer<typeof CreateRoundSchema>;

export const UpdateCompetitionSchema = z
    .object({
        title: z
            .string()
            .min(2, 'Titill verður að vera að minnsta kosti 2 stafir')
            .max(30, 'Titill má ekki fara yfir 30 stafi'),
        description: z
            .string()
            .max(300, 'Upplýsingar má ekki fara yfir 300 stafi')
            .optional(),
        start_date: dateString,
        end_date: dateString,
        location: z
            .string()
            .min(2, 'Staðsetning verður að vera að minnsta kosti 2 stafir')
            .max(30, 'Staðsetning má ekki fara yfir 30 stafi'),
        image: z.any().optional(),
        visible: z.boolean(),
    })
    .superRefine((data, ctx) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (data.start_date && new Date(data.start_date) < now) {
            ctx.addIssue({
                code: 'custom',
                message: 'Byrjunardagsetning má ekki vera í fortíðinni',
                path: ['start_date'],
            });
        }

        if (
            data.end_date &&
            data.start_date &&
            new Date(data.end_date) < new Date(data.start_date)
        ) {
            ctx.addIssue({
                code: 'custom',
                message:
                    'Endingardagsetning þarf að vera eftir byrjunardagsetningu',
                path: ['end_date'],
            });
        }
    });

export type UpdateCompetitionFormData = z.infer<typeof CreateCompetitionSchema>;

export const UpdateCategorySchema = z.object({
    category_group: z
        .number('Flokkur getur ekki verið tómur')
        .int()
        .positive('Flokkur getur ekki verið tómur'),
    gender: z.enum(['KK', 'KVK'], 'Vinsamlegast veldu kyn'),
});

export type UpdateCategoryFormData = z.infer<typeof CreateCategorySchema>;

export const UpdateRoundSchema = z.object({
    round_group: z.number('Veldu umferð').int().positive('Veldu umferð'),
    round_order: z.number(),
    climbers_advance: z
        .number()
        .int('Tala þarf að vera heiltala')
        .nonnegative('Tala þarf að vera jákvæð')
        .max(200, 'Hámark 200 keppendur')
        .nullable(),
    boulder_count: z
        .number('Sláðu inn fjölda leiða')
        .int('Tala þarf að vera heiltala')
        .positive('Tala þarf að vera jákvæð')
        .max(100, 'Hámark 100 leiðir'),
    is_self_scoring: z.boolean(),
});

export type UpdateRoundFormData = z.infer<typeof CreateRoundSchema>;
