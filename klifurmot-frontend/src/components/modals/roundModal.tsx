import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateRoundSchema } from '@/schemas/competition';
import { useRoundGroups } from '@/hooks/api/useCompetitions';
import type { DraftRound } from '@/types/competition';
import Select from '@/components/ui/select';
import Input from '@/components/ui/input';
import MainButton from '@/components/ui/mainButton';
import Modal from './modal';

const RoundModalSchema = CreateRoundSchema.omit({ round_order: true });
type RoundModalFormData = z.infer<typeof RoundModalSchema>;

interface RoundModalProps {
    existingRound?: DraftRound | null;
    onClose: () => void;
    onSubmit: (data: RoundModalFormData & { round_group_name: string }) => void;
    error?: string | null;
}

export default function RoundModal({
    existingRound,
    onClose,
    onSubmit,
    error,
}: RoundModalProps) {
    const { data: roundGroups, isLoading } = useRoundGroups();

    const {
        control,
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RoundModalFormData>({
        resolver: zodResolver(RoundModalSchema),
        defaultValues: existingRound
            ? {
                  round_group: existingRound.round_group,
                  climbers_advance: existingRound.climbers_advance,
                  route_count: existingRound.route_count,
                  is_self_scoring: existingRound.is_self_scoring,
              }
            : {
                  is_self_scoring: false,
                  climbers_advance: null,
              },
    });

    const handleConfirm = (data: RoundModalFormData) => {
        const group = roundGroups?.data.find((g) => g.id === data.round_group);
        onSubmit({ ...data, round_group_name: group?.name ?? '' });
    };

    const roundGroupOptions =
        roundGroups?.data.map((g) => ({
            value: String(g.id),
            label: g.name,
        })) ?? [];

    const isEditMode = !!existingRound;

    return (
        <Modal onClose={onClose}>
            <div className="flex flex-col gap-6">
                <h2 className="text-xl font-semibold">
                    {isEditMode ? 'Breyta umferð' : 'Búa til umferð'}
                </h2>
                {isLoading ? (
                    <p className="text-secondary text-sm">Hleður...</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <Controller
                            name="round_group"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label="Umferð"
                                    value={String(field.value ?? '')}
                                    onChange={(val) =>
                                        field.onChange(Number(val))
                                    }
                                    options={roundGroupOptions}
                                    placeholder="Veldu umferð"
                                    inputClassName="bg-white"
                                    disabled={isEditMode}
                                    error={errors.round_group?.message}
                                />
                            )}
                        />
                        <Input
                            {...register('climbers_advance', {
                                setValueAs: (v) =>
                                    v === '' ? null : Number(v),
                            })}
                            label="Fjöldi keppenda sem fara áfram"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Skildu eftir tómt fyrir fyrstu umferð"
                            error={errors.climbers_advance?.message}
                        />
                        <Input
                            {...register('route_count', {
                                valueAsNumber: true,
                            })}
                            label="Fjöldi leiða"
                            type="number"
                            min="1"
                            step="1"
                            error={errors.route_count?.message}
                        />
                        {error && (
                            <p className="text-red-500 text-sm">{error}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                            <MainButton
                                className="w-full"
                                type="button"
                                onClick={handleSubmit(handleConfirm)}
                            >
                                {isEditMode ? 'Vista' : 'Staðfesta'}
                            </MainButton>
                            <MainButton
                                className="w-full"
                                variant="outline"
                                type="button"
                                onClick={onClose}
                            >
                                Hætta við
                            </MainButton>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
