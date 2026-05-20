import Container from '@/components/ui/container';
import {
    useCreateCategory,
    useCreateCompetition,
    useCreateRound,
} from '@/hooks/api/useCompetitions';
import { useForm } from 'react-hook-form';
import {
    CreateCompetitionSchema,
    type CreateCompetitionFormData,
} from '@/schemas/competition';
import { zodResolver } from '@hookform/resolvers/zod';
import MainButton from '@/components/ui/mainButton';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryRoundManagerTab from '@/components/tabs/categoryRoundManagerTab';
import type { DraftCategory } from '@/types/competition';
import CompetitionForm from '@/components/forms/competitionForm';

export default function CreateCompetitionPage() {
    const { mutateAsync: createCompetition } = useCreateCompetition();
    const { mutateAsync: createCategory } = useCreateCategory();
    const { mutateAsync: createRound } = useCreateRound();
    const navigate = useNavigate();
    const [draftCategories, setDraftCategories] = useState<DraftCategory[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<CreateCompetitionFormData>({
        resolver: zodResolver(CreateCompetitionSchema),
        defaultValues: { visible: true },
    });

    const onSubmit = async (data: CreateCompetitionFormData) => {
        const competition = await createCompetition(data);
        const competitionId = competition.data.id;

        for (const draftCategory of draftCategories) {
            const category = await createCategory({
                competitionId,
                data: {
                    category_group: draftCategory.category_group,
                    gender: draftCategory.gender,
                },
            });

            for (const round of draftCategory.rounds) {
                await createRound({
                    competitionId,
                    categoryId: category.data.id,
                    data: {
                        round_group: round.round_group,
                        round_order: round.round_order,
                        climbers_advance: round.climbers_advance,
                        boulder_count: round.boulder_count,
                        is_self_scoring: round.is_self_scoring,
                    },
                });
            }
        }

        navigate('/admin-panel');
    };

    return (
        <Container variant="primaryCenter" className="animate-fade-in">
            <div className="flex flex-col gap-8 p-8 justify-center w-full border border-outline rounded-lg">
                <h3 className="font-semibold text-2xl">Búa til mót</h3>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-6"
                >
                    <CompetitionForm
                        register={register}
                        control={control}
                        errors={errors}
                        setValue={setValue}
                    />
                    <div className="border-t border-outline" />
                    <h3 className="font-semibold text-xl">
                        Flokkar og umferðir
                    </h3>
                    <CategoryRoundManagerTab
                        draftCategories={draftCategories}
                        setDraftCategories={setDraftCategories}
                    />
                    <div className="border-t border-outline" />
                    <div className="flex flex-col sm:flex-row sm:w-xs w-full self-center gap-2">
                        <MainButton className="w-full" type="submit">
                            Vista
                        </MainButton>
                        <MainButton
                            className="w-full"
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/admin-panel')}
                        >
                            Hætta við
                        </MainButton>
                    </div>
                </form>
            </div>
        </Container>
    );
}
