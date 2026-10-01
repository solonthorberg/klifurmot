import ReactMarkdown from 'react-markdown';

import Container from '../ui/container';
import Icon from '../ui/icons';
import Image from '../ui/image';
import MainButton from '../ui/mainButton';
import SelfRegistrationModal from '../modals/selfRegistrationModal.tsx';

import type { Competition } from '@/types';
import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores';

function OverviewTab({ competition }: { competition: Competition }) {
    const navigate = useNavigate();
    const { userAccount } = useAuthStore();
    const [showRegister, setShowRegister] = useState(false);

    return (
        <Container
            variant="tab"
            className="sm:flex-row flex-col gap-4 justify-between"
        >
            <div>
                <div className="prose">
                    <ReactMarkdown>{competition.description}</ReactMarkdown>
                </div>
            </div>
            <div className="flex gap-4 flex-col sm:w-auto w-full">
                <Image
                    image={competition.image}
                    alt={competition.title}
                    className="sm:w-90 w-full rounded-md"
                />
                <div className="flex flex-wrap sm:flex-col gap-2 items-start">
                    <p className="flex items-center gap-2 w-fit">
                        <Icon variant="location" size={16} />
                        {competition.location}
                    </p>
                    <p className="flex items-center gap-2 w-fit">
                        <Icon variant="calendar" size={16} />
                        {new Date(competition.start_date).toLocaleDateString(
                            'is-IS',
                        )}{' '}
                        -{' '}
                        {new Date(competition.end_date).toLocaleDateString(
                            'is-IS',
                        )}
                    </p>
                    {userAccount &&
                        competition.allow_self_registration &&
                        competition.status === 'not_started' && (
                            <MainButton
                                onClick={() => setShowRegister(true)}
                                disabled={competition.is_registered}
                                className="w-full"
                            >
                                {competition.is_registered
                                    ? 'Þú ert skráð/ur'
                                    : 'Skrá mig'}
                            </MainButton>
                        )}
                    {competition.has_selfscore_round &&
                        competition.status === 'ongoing' && (
                            <MainButton
                                onClick={() =>
                                    navigate(
                                        `/competitions/${competition.id}/selfscore`,
                                    )
                                }
                                className="w-full"
                            >
                                Sjálfstigagjöf
                            </MainButton>
                        )}
                </div>
            </div>
            {showRegister && (
                <SelfRegistrationModal
                    competitionId={competition.id}
                    onClose={() => setShowRegister(false)}
                />
            )}
        </Container>
    );
}

export default memo(OverviewTab);
