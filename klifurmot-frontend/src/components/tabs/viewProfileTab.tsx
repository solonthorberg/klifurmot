import MainButton from '../ui/mainButton';
import { useAuth } from '@/hooks/api/useAuth';

function ProfileField({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div>
            <label>{label}</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300">
                <p className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900">
                    {value ?? 'Ekki skráð'}
                </p>
            </div>
        </div>
    );
}

export default function ViewProfileTab({ onDone }: { onDone: () => void }) {
    const { logout, userAccount } = useAuth();

    return (
        <div className="flex w-full flex-col gap-2 animate-fade-in">
            <ProfileField label="Fullt nafn" value={userAccount?.full_name} />
            <ProfileField label="Netfang" value={userAccount?.user.email} />
            <ProfileField
                label="Fæðingardagur"
                value={userAccount?.date_of_birth}
            />
            <ProfileField label="Kyn" value={userAccount?.gender} />
            <ProfileField label="Þjóðerni" value={userAccount?.nationality} />
            <ProfileField
                label="Hæð (cm)"
                value={userAccount?.height_cm?.toString()}
            />
            <ProfileField
                label="Vænghaf (cm)"
                value={userAccount?.wingspan_cm?.toString()}
            />
            <MainButton className="mt-2" onClick={onDone}>
                Breyta upplýsingum
            </MainButton>
            <MainButton
                variant="outline"
                onClick={logout}
                className="px-3 py-2 mt-2 rounded hover:bg-primary-hover transition-colors"
            >
                Útskrá
            </MainButton>
        </div>
    );
}
