import { useNavigate } from 'react-router-dom';

import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';

export default function HomePage() {
    const navigate = useNavigate();
    return (
        <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: "url('/klifurmot-home-image.jpg.webp')",
                }}
            >
                <div
                    className="absolute inset-0 backdrop-blur-[2px]"
                    style={{
                        maskImage:
                            'radial-gradient(circle, transparent 10%, black 95%)',
                        WebkitMaskImage:
                            'radial-gradient(circle, transparent 10%, black 95%)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black" />
            </div>
            <Container
                variant="centered"
                className="relative z-10 gap-4 text-white h-full"
            >
                <h1 className="text-2xl font-semibold">Klifurmót.is</h1>
                <p className="text-center">
                    Rauntímastjórnun móta fyrir klifrara, dómara og stjórnendur.
                </p>
                <MainButton onClick={() => navigate('/competitions')}>
                    Skoða mót
                </MainButton>
            </Container>
        </div>
    );
}
