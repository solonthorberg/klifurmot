import Container from '@/components/ui/container';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import Image from '@/components/ui/image';
import { useAuth } from '@/hooks/api/useAuth';
import { useState } from 'react';
import MainButton from '@/components/ui/mainButton';
import EditProfileTab from '@/components/tabs/editProfileTab';
import ViewProfileTab from '@/components/tabs/viewProfileTab';

export default function ProfilePage() {
    const [editing, setEditing] = useState(false);
    const { userAccount, isLoading } = useAuth();

    if (isLoading) return <LoadingSpinner />;

    const user = userAccount!;

    return (
        <Container variant="primaryCenter" className="gap-4 min-w-xl">
            <Image
                image={user.profile_picture}
                alt={user.full_name}
                variant="thumbnail"
            />
            <h3>{user.user.username}</h3>
            {editing ? (
                <EditProfileTab onDone={() => setEditing(false)} />
            ) : (
                <>
                    <ViewProfileTab user={user!} />
                    <MainButton
                        variant="secondary"
                        onClick={() => setEditing(!editing)}
                    >
                        Breyta upplýsingar
                    </MainButton>
                </>
            )}
        </Container>
    );
}
