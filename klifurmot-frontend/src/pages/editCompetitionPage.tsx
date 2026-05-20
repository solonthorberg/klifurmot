import CompetitionForm from '@/components/forms/competitionForm';
import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';
import {
    useCompetition,
    useUpdateCompetition,
} from '@/hooks/api/useCompetitions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import {
    UpdateCompetitionSchema,
    type UpdateCompetitionFormData,
} from '@/schemas/competition';
import LoadingSpinner from '@/components/ui/loadingSpinner';

export default function EditCompetitionPage() {
    const { competitionId } = useParams();
    const {
        data: competition,
        isLoading,
        error,
    } = useCompetition(Number(competitionId));
    const { mutateAsync: updateCompetition } = useUpdateCompetition();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        setValue,
        control,
        reset,
        formState: { errors },
    } = useForm<UpdateCompetitionFormData>({
        resolver: zodResolver(UpdateCompetitionSchema),
        defaultValues: { visible: true },
    });

    const formatForDateTimeInput = (dateString?: string | null) => {
        if (!dateString) return '';
        return dateString.slice(0, 16);
    };

    useEffect(() => {
        if (competition) {
            reset({
                title: competition.data.title,
                description: competition.data.description ?? '',
                start_date: formatForDateTimeInput(competition.data.start_date),
                end_date: formatForDateTimeInput(competition.data.end_date),
                location: competition.data.location ?? '',
                visible: competition.data.visible,
            });
        }
    }, [competition, reset]);

    const onSubmit = async (data: UpdateCompetitionFormData) => {
        await updateCompetition({ competitionId: Number(competitionId), data });

        navigate('/admin-panel');
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <LoadingSpinner />;

    return (
        <Container variant="primaryCenter" className="animate-fade-in">
            <div className="flex flex-col gap-8 p-8 justify-center w-full border border-outline rounded-lg">
                <h3 className="font-semibold text-2xl">Breyta móti</h3>
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
