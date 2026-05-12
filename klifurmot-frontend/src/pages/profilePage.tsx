import Container from "@/components/ui/container";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import Image from '@/components/ui/image';
import { useAuth } from "@/hooks/api/useAuth";
import { Form } from "react-hook-form";

export default function ProfilePage() {
    const { userAccount, isLoading } = useAuth();

    if (isLoading) return <LoadingSpinner />

    return (
        <Container variant="primaryCenter" className="gap-4">
            <Image image={userAccount?.profile_picture} alt={userAccount?.full_name} variant="thumbnail" />

            <div>
                <h3>{userAccount?.user.username}</h3>
            </div>
            <Form>

            </Form>

        </Container>
    )
}
