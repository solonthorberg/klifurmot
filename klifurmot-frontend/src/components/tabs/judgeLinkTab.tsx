import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TabButton from '@/components/ui/tabButton';
import MainButton from '@/components/ui/mainButton';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import Modal from '@/components/modals/modal';
import Icon from '@/components/ui/icons';
import {
    useAllJudges,
    useCreateJudgeLink,
    useDeleteJudgeLink,
    usePotentialJudges,
    useSendInvitation,
} from '@/hooks/api/useJudges';
import {
    CreateJudgeLinkSchema,
    SendInvitationSchema,
    type CreateJudgeLinkFormData,
    type SendInvitationFormData,
} from '@/schemas/judge';
import type { JudgeEntry } from '@/types';

interface JudgeLinkTabProps {
    competitionId: number;
}

const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
        active: {
            label: 'Virk',
            className: 'text-green-600 bg-green-50 border-green-300',
        },
        expired: {
            label: 'Útrunnin',
            className: 'text-red-600 bg-red-50 border-red-300',
        },
        used: {
            label: 'Notuð',
            className: 'text-gray-500 bg-gray-50 border-gray-300',
        },
        pending: {
            label: 'Bíður',
            className: 'text-yellow-600 bg-yellow-50 border-yellow-300',
        },
        claimed: {
            label: 'Sótt',
            className: 'text-green-600 bg-green-50 border-green-300',
        },
    };
    return (
        map[status] ?? {
            label: status,
            className: 'text-gray-500 bg-gray-50 border-gray-300',
        }
    );
};

const getEntryLabel = (entry: JudgeEntry) => {
    if (entry.type === 'invitation')
        return entry.invited_name || entry.invited_email;
    return entry.user_name || entry.user_email;
};

const getEntryUrl = (entry: JudgeEntry) => {
    const base = window.location.origin;
    return `${base}/judge/${entry.token}`;
};

interface DeleteModalProps {
    entry: JudgeEntry;
    onConfirm: () => void;
    onClose: () => void;
}

function DeleteModal({ entry, onConfirm, onClose }: DeleteModalProps) {
    return (
        <Modal onClose={onClose}>
            <h2 className="text-lg font-semibold mb-4">Eyða dómaraslóð?</h2>
            <p>
                Ertu viss að þú viljir eyða slóðinni fyrir{' '}
                <span className="font-medium">{getEntryLabel(entry)}</span>?
            </p>
            <div className="flex gap-2 mt-4">
                <MainButton
                    variant="delete"
                    square
                    className="w-full"
                    onClick={onConfirm}
                >
                    Eyða
                </MainButton>
                <MainButton
                    variant="outline"
                    className="w-full"
                    onClick={onClose}
                >
                    Hætta við
                </MainButton>
            </div>
        </Modal>
    );
}

export default function JudgeLinkTab({ competitionId }: JudgeLinkTabProps) {
    const [tab, setTab] = useState<'existing' | 'invitation'>('existing');
    const [deleteTarget, setDeleteTarget] = useState<JudgeEntry | null>(null);

    const { data: judgesData, isLoading } = useAllJudges(competitionId);
    const { data: potentialData } = usePotentialJudges();
    const { mutate: createLink, isPending: isCreatingLink } =
        useCreateJudgeLink(competitionId);
    const { mutate: sendInvitation, isPending: isSendingInvitation } =
        useSendInvitation(competitionId);
    const { mutate: deleteLink } = useDeleteJudgeLink(competitionId);

    const linkForm = useForm<CreateJudgeLinkFormData>({
        resolver: zodResolver(CreateJudgeLinkSchema),
        defaultValues: { user_id: '' },
    });

    const invitationForm = useForm<SendInvitationFormData>({
        resolver: zodResolver(SendInvitationSchema),
        defaultValues: { email: '', name: '' },
    });

    const potentialJudges = potentialData?.data ?? [];
    const allEntries: JudgeEntry[] = [
        ...(judgesData?.data.links ?? []),
        ...(judgesData?.data.invitations ?? []),
    ];

    const judgeOptions = potentialJudges.map((j) => ({
        value: String(j.id),
        label: `${j.full_name ?? j.username} (${j.email})`,
    }));

    const handleCreateLink = (data: CreateJudgeLinkFormData) => {
        createLink(
            { user_id: Number(data.user_id) },
            { onSuccess: () => linkForm.reset({ user_id: '' }) },
        );
    };

    const handleSendInvitation = (data: SendInvitationFormData) => {
        sendInvitation(
            { email: data.email, name: data.name || undefined },
            { onSuccess: () => invitationForm.reset({ email: '', name: '' }) },
        );
    };

    const handleCopy = async (entry: JudgeEntry) => {
        await navigator.clipboard.writeText(getEntryUrl(entry));
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        deleteLink(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex gap-2 border-b border-outline">
                <TabButton
                    active={tab === 'existing'}
                    onClick={() => setTab('existing')}
                    className="flex-1"
                >
                    Velja Dómara
                </TabButton>
                <TabButton
                    active={tab === 'invitation'}
                    onClick={() => setTab('invitation')}
                    className="flex-1"
                >
                    Nýr Dómari
                </TabButton>
            </div>

            {tab === 'existing' ? (
                <form
                    onSubmit={linkForm.handleSubmit(handleCreateLink)}
                    className="flex flex-col gap-4"
                >
                    <Controller
                        name="user_id"
                        control={linkForm.control}
                        render={({ field }) => (
                            <Select
                                label="Dómari"
                                value={field.value}
                                onChange={field.onChange}
                                options={judgeOptions}
                                inputClassName="bg-white"
                                placeholder="Veldu dómara..."
                                error={
                                    linkForm.formState.errors.user_id?.message
                                }
                            />
                        )}
                    />
                    <MainButton
                        className="w-full sm:w-xs self-center"
                        type="submit"
                        disabled={isCreatingLink}
                    >
                        {isCreatingLink ? 'Hleður...' : 'Búa til slóð'}
                    </MainButton>
                </form>
            ) : (
                <form
                    onSubmit={invitationForm.handleSubmit(handleSendInvitation)}
                    className="flex flex-col gap-4"
                >
                    <Input
                        {...invitationForm.register('email')}
                        label="Netfang"
                        type="email"
                        placeholder="dómari@dómari.is"
                        error={invitationForm.formState.errors.email?.message}
                    />
                    <Input
                        {...invitationForm.register('name')}
                        label="Nafn (valkvætt)"
                        placeholder="Nafn dómara"
                    />
                    <MainButton
                        className="w-full sm:w-xs self-center"
                        type="submit"
                        disabled={isSendingInvitation}
                    >
                        {isSendingInvitation ? 'Hleður...' : 'Senda boð'}
                    </MainButton>
                </form>
            )}

            <div className="border-t border-outline" />

            <div className="flex flex-col gap-3">
                <h3 className="font-semibold">Allir dómarar</h3>

                {isLoading ? (
                    <LoadingSpinner />
                ) : allEntries.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                        Engir dómarar skráðir...
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {allEntries.map((entry) => {
                            const status = getStatusLabel(entry.status);
                            return (
                                <div
                                    key={`${entry.type}-${entry.id}`}
                                    className="border border-outline rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm truncate">
                                                {getEntryLabel(entry)}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded border border-outline text-secondary">
                                                {entry.type === 'invitation'
                                                    ? 'Boð'
                                                    : 'Slóð'}
                                            </span>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded border ${status.className}`}
                                            >
                                                {status.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1 block">
                                            Rennur út:{' '}
                                            {new Date(
                                                entry.expires_at,
                                            ).toLocaleString('is-IS')}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <MainButton
                                            className="w-full sm:w-9"
                                            size="small"
                                            variant="outline"
                                            square
                                            onClick={() => handleCopy(entry)}
                                            title="Afrita slóð"
                                        >
                                            <Icon variant="copy" />
                                        </MainButton>
                                        <MainButton
                                            className="w-full sm:w-9"
                                            size="small"
                                            variant="delete"
                                            square
                                            onClick={() =>
                                                setDeleteTarget(entry)
                                            }
                                            title="Eyða"
                                        >
                                            <Icon variant="trash" />
                                        </MainButton>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {deleteTarget && (
                <DeleteModal
                    entry={deleteTarget}
                    onConfirm={handleConfirmDelete}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
