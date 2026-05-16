import CompetitionAdminTab from '@/components/tabs/competitionAdminTab';
import CategoryAdminTab from '@/components/tabs/categoryAdminTab';
import Container from '@/components/ui/container';
import TabButton from '@/components/ui/tabButton';
import { useSearchParams } from 'react-router-dom';
import AthletesAdminTab from '@/components/tabs/athletesAdminTab';

export default function AdminPanel() {
    const tabs = ['Mót', 'Flokkar', 'Keppendur'];
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = Number(searchParams.get('tab') ?? 0);
    const setTab = (index: number) => {
        setSearchParams({ tab: String(index) });
    };

    return (
        <Container variant="primaryCenter" className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-center mb-4">
                Stjórnborð
            </h2>
            <div className="flex gap-2 border-b border-outline justify-center w-full overflow-x-auto">
                {tabs.map((label, index) => (
                    <TabButton
                        key={label}
                        active={tab === index}
                        onClick={() => setTab(index)}
                    >
                        {label}
                    </TabButton>
                ))}
            </div>
            <div className="w-full">
                <div key={tab} className="animate-fade-in">
                    {tab === 0 && <CompetitionAdminTab />}
                    {tab === 1 && <CategoryAdminTab />}
                    {tab === 2 && <AthletesAdminTab />}
                </div>
            </div>{' '}
        </Container>
    );
}
