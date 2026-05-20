import Container from '@/components/ui/container';
import { useAuthStore } from '@/stores';

export default function JudgeDashboardPage() {
    const { isAuthenticated, userAccount } = useAuthStore();

    return (
        <Container>
            <div>Judge dashboard</div>
        </Container>
    );
}
