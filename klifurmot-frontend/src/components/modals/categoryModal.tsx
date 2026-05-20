import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    CreateCategorySchema,
    type CreateCategoryFormData,
} from '@/schemas/competition';
import { useCategoryGroups } from '@/hooks/api/useCompetitions';
import Select from '@/components/ui/select';
import MainButton from '@/components/ui/mainButton';
import Modal from './modal';

interface CategoryModalProps {
    onClose: () => void;
    onSubmit: (
        data: CreateCategoryFormData & { category_group_name: string },
    ) => void;
    error?: string | null;
}

const genderOptions = [
    { value: 'KK', label: 'KK' },
    { value: 'KVK', label: 'KVK' },
];

export default function CategoryModal({
    onClose,
    onSubmit,
    error,
}: CategoryModalProps) {
    const { data: categoryGroups, isLoading } = useCategoryGroups();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateCategoryFormData>({
        resolver: zodResolver(CreateCategorySchema),
        defaultValues: {
            category_group: undefined,
            gender: undefined,
        },
    });

    const handleConfirm = (data: CreateCategoryFormData) => {
        const group = categoryGroups?.data.find(
            (g) => g.id === data.category_group,
        );
        onSubmit({ ...data, category_group_name: group?.name ?? '' });
    };

    const categoryGroupOptions =
        categoryGroups?.data.map((g) => ({
            value: String(g.id),
            label: g.name,
        })) ?? [];

    return (
        <Modal onClose={onClose}>
            <div className="flex flex-col gap-6">
                <h2 className="text-xl font-semibold">Búa til flokk</h2>
                {isLoading ? (
                    <p className="text-secondary text-sm">Hleður...</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <Controller
                            name="category_group"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label="Flokkur"
                                    value={String(field.value ?? '')}
                                    inputClassName="bg-white"
                                    onChange={(val) =>
                                        field.onChange(Number(val))
                                    }
                                    options={categoryGroupOptions}
                                    placeholder="Veldu flokk"
                                    error={errors.category_group?.message}
                                />
                            )}
                        />
                        <Controller
                            name="gender"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label="Kyn"
                                    value={field.value ?? ''}
                                    onChange={(val) => field.onChange(val)}
                                    options={genderOptions}
                                    inputClassName="bg-white"
                                    placeholder="Veldu kyn"
                                    error={errors.gender?.message}
                                />
                            )}
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
                                Staðfesta
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
