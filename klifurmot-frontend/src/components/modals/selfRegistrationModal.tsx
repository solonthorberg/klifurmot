import { useState } from 'react';
import { useCategories } from '@/hooks/api/useCompetitions';
import { useCreateSelfRegistration } from '@/hooks/api/useAthletes';
import Select from '@/components/ui/select';
import MainButton from '@/components/ui/mainButton';
import Modal from './modal';

interface SelfRegistrationModalProps {
    competitionId: number;
    onClose: () => void;
}

export default function SelfRegistrationModal({
    competitionId,
    onClose,
}: SelfRegistrationModalProps) {
    const { data: categories, isLoading } = useCategories(competitionId);
    const { mutate: register, isPending } = useCreateSelfRegistration();
    const [categoryId, setCategoryId] = useState('');

    const categoryOptions =
        categories?.data.map((c) => ({
            value: String(c.id),
            label: `${c.category_group_detail.name} ${c.gender}`,
        })) ?? [];

    const handleConfirm = () => {
        register(
            {
                competition_id: competitionId,
                competition_category_id: Number(categoryId),
            },
            { onSuccess: onClose },
        );
    };

    return (
        <Modal onClose={onClose}>
            <div className="flex flex-col gap-6">
                <h2 className="text-xl font-semibold">Skrá mig í mót</h2>
                {isLoading ? (
                    <p className="text-secondary text-sm">Hleður...</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <Select
                            label="Flokkur"
                            value={categoryId}
                            onChange={setCategoryId}
                            options={categoryOptions}
                            placeholder="Veldu flokk"
                            inputClassName="bg-white"
                        />
                        <div className="flex gap-2 mt-2">
                            <MainButton
                                className="w-full"
                                type="button"
                                onClick={handleConfirm}
                                disabled={!categoryId || isPending}
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
