import { useNavigate } from 'react-router-dom';

import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Container variant="centered" className="h-[calc(100vh-4rem)] gap-4">
            <h1 className="text-6xl font-bold text-gray-300">404</h1>
            <p className="text-gray-500">Síða fannst ekki</p>
            <MainButton onClick={() => navigate('/')}>Til baka</MainButton>
        </Container>
    );
}
