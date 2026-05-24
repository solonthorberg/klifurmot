import * as z from 'zod';

export const CreateJudgeLinkSchema = z.object({
    user_id: z.string().min(1, 'Veldu dómara'),
});

export type CreateJudgeLinkFormData = z.infer<typeof CreateJudgeLinkSchema>;

export const SendInvitationSchema = z.object({
    email: z.email('Vinsamlegast sláðu inn gilt netfang'),
    name: z.string().optional(),
});

export type SendInvitationFormData = z.infer<typeof SendInvitationSchema>;
