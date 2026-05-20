import { getErrorMessage } from '@/api';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import { useParams } from 'react-router';
import Image from '@/components/ui/image';
import { usePublicAthlete } from '@/hooks/api/useAthletes';

export default function AthleteDetailPage() {
    const { id } = useParams();
    const { data, isLoading, error } = usePublicAthlete(Number(id));

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const athlete = data?.data;
    if (!athlete) return <ErrorMessage message={'Klifrari fannst ekki'} />;

    return (
        <Container variant="primaryCenter" className="gap-4 animate-fade-in">
            <div className="flex flex-col items-center text-center gap-4 p-8 border border-outline rounded-lg w-full">
                <Image
                    image={athlete.profile_picture}
                    alt={athlete.full_name}
                    variant="thumbnail"
                />
                <h3 className="font-semibold text-xl">{athlete.full_name}</h3>
                <div className="grid grid-cols-3 gap-4 w-full max-w-2xl border-t border-outline pt-6">
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                            Aldur
                        </span>
                        <span className="text-gray-500">{athlete.age}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                            Hæð
                        </span>
                        <span className="text-gray-500">
                            {athlete.height_cm
                                ? `${athlete.height_cm} cm`
                                : '-'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                            Faðmur
                        </span>
                        <span className="text-gray-500">
                            {athlete.wingspan_cm
                                ? `${athlete.wingspan_cm} cm`
                                : '-'}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                            Flokkur
                        </span>
                        <span className="text-gray-500">
                            {athlete.category}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                            Mótaþátttaka
                        </span>
                        <span className="text-gray-500">
                            {athlete.competitions_count}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                            Sigrar
                        </span>
                        <span className="text-gray-500">
                            {athlete.wins_count}
                        </span>
                    </div>
                </div>
            </div>

            <table className="w-full">
                <thead>
                    <tr className="border-b border-outline text-left text-sm text-gray-500">
                        <th className="px-4 py-2 font-normal">Mót</th>
                        <th className="px-4 py-2 font-normal">Flokkur</th>
                        <th className="px-4 py-2 font-normal">Dagsetning</th>
                        <th className="px-4 py-2 font-normal text-right">
                            Árangur
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {athlete.competition_results.map((a) => (
                        <tr
                            key={a.id}
                            className="border-b border-outline last:border-0"
                        >
                            <td className="px-4 py-3">{a.title}</td>
                            <td className="px-4 py-3">{a.category}</td>
                            <td className="px-4 py-3 ">
                                {new Date(a.start_date).toLocaleDateString(
                                    'is-IS',
                                )}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {a.results.map((r, id) => (
                                    <p key={id}>
                                        {r.round_name}: {r.round_order}
                                    </p>
                                ))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Container>
    );
}
