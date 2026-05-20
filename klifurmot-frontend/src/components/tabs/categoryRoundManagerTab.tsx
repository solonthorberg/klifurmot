import { useState } from 'react';
import type { DraftCategory, DraftRound } from '@/types/competition';
import type {
    CreateCategoryFormData,
    CreateRoundFormData,
} from '@/schemas/competition';
import MainButton from '@/components/ui/mainButton';
import CategoryCard from '../cards/categoryCard';
import CategoryModal from '../modals/categoryModal';
import RoundModal from '../modals/roundModal';

interface CategoryRoundManagerTabProps {
    draftCategories: DraftCategory[];
    setDraftCategories: React.Dispatch<React.SetStateAction<DraftCategory[]>>;
}

export default function CategoryRoundManagerTab({
    draftCategories,
    setDraftCategories,
}: CategoryRoundManagerTabProps) {
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(
        null,
    );
    const [activeRound, setActiveRound] = useState<DraftRound | null>(null);
    const [roundError, setRoundError] = useState<string | null>(null);
    const [categoryError, setCategoryError] = useState<string | null>(null);

    const handleAddCategory = (
        data: CreateCategoryFormData & { category_group_name: string },
    ) => {
        const duplicate = draftCategories.some(
            (c) =>
                c.category_group === data.category_group &&
                c.gender === data.gender &&
                c.key !== activeCategoryKey,
        );

        if (duplicate) {
            setCategoryError('Þessi flokkur er nú þegar til');
            return;
        }

        setCategoryError(null);

        const newCategory: DraftCategory = {
            key: crypto.randomUUID(),
            category_group: data.category_group,
            category_group_name: data.category_group_name,
            gender: data.gender,
            rounds: [],
        };
        setDraftCategories((prev) => [...prev, newCategory]);
        setShowCategoryModal(false);
    };

    const handleDeleteCategory = (categoryKey: string) => {
        setDraftCategories((prev) => prev.filter((c) => c.key !== categoryKey));
    };

    const handleOpenRoundModal = (
        categoryKey: string,
        round: DraftRound | null,
    ) => {
        setActiveCategoryKey(categoryKey);
        setActiveRound(round);
    };

    const handleCloseRoundModal = () => {
        setActiveCategoryKey(null);
        setActiveRound(null);
        setRoundError(null);
    };

    const handleSaveRound = (
        data: Omit<CreateRoundFormData, 'round_order'> & {
            round_group_name: string;
        },
    ) => {
        if (!activeCategoryKey) return;

        const targetCategory = draftCategories.find(
            (c) => c.key === activeCategoryKey,
        );

        if (targetCategory) {
            const duplicate = targetCategory.rounds.some(
                (r) =>
                    r.round_group === data.round_group &&
                    r.key !== activeRound?.key,
            );

            if (duplicate) {
                setRoundError('Þessi umferð er nú þegar til');
                return;
            }
        }

        setRoundError(null);

        setDraftCategories((prev) =>
            prev.map((c) => {
                if (c.key !== activeCategoryKey) return c;

                if (activeRound) {
                    return {
                        ...c,
                        rounds: c.rounds.map((r) =>
                            r.key === activeRound.key ? { ...r, ...data } : r,
                        ),
                    };
                }

                return {
                    ...c,
                    rounds: [
                        ...c.rounds,
                        {
                            key: crypto.randomUUID(),
                            round_order: c.rounds.length + 1,
                            ...data,
                        },
                    ],
                };
            }),
        );

        handleCloseRoundModal();
    };

    const handleDeleteRound = (categoryKey: string, roundKey: string) => {
        setDraftCategories((prev) =>
            prev.map((c) =>
                c.key === categoryKey
                    ? {
                          ...c,
                          rounds: c.rounds.filter((r) => r.key !== roundKey),
                      }
                    : c,
            ),
        );
    };

    const handleReorderRounds = (
        categoryKey: string,
        reorderedRounds: DraftRound[],
    ) => {
        setDraftCategories((prev) =>
            prev.map((c) =>
                c.key === categoryKey ? { ...c, rounds: reorderedRounds } : c,
            ),
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center">
                <MainButton
                    className="w-full sm:w-auto"
                    type="button"
                    variant="outline"
                    onClick={() => setShowCategoryModal(true)}
                >
                    + Flokkur
                </MainButton>
            </div>

            {draftCategories.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-secondary">
                    <p className="text-lg font-medium">Engir flokkar skráðir</p>
                    <p className="text-sm">
                        Byrjaðu á að búa til flokk fyrir keppendur
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {draftCategories.map((category) => (
                        <CategoryCard
                            key={category.key}
                            category={category}
                            onDelete={() => handleDeleteCategory(category.key)}
                            onAddRound={() =>
                                handleOpenRoundModal(category.key, null)
                            }
                            onEditRound={(round) =>
                                handleOpenRoundModal(category.key, round)
                            }
                            onDeleteRound={(roundKey) =>
                                handleDeleteRound(category.key, roundKey)
                            }
                            onReorderRounds={(rounds) =>
                                handleReorderRounds(category.key, rounds)
                            }
                        />
                    ))}
                </div>
            )}

            {showCategoryModal && (
                <CategoryModal
                    onClose={() => setShowCategoryModal(false)}
                    onSubmit={handleAddCategory}
                    error={categoryError}
                />
            )}

            {activeCategoryKey && (
                <RoundModal
                    existingRound={activeRound}
                    onClose={handleCloseRoundModal}
                    onSubmit={handleSaveRound}
                    error={roundError}
                />
            )}
        </div>
    );
}
