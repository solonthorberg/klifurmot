import ReactMarkdown from 'react-markdown';

import Container from '../ui/container';
import Icon from '../ui/icons';
import Image from '../ui/image';

import type { Competition } from '@/types';

export default function OverviewTab({
    competition,
}: {
    competition: Competition;
}) {
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
                </div>
            </div>
        </Container>
    );
}
