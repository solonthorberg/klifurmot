import { useNavigate } from 'react-router-dom';

import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';

export default function HomePage() {
    const navigate = useNavigate();
    return (
        <div className="relative h-full overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: "url('/klifurmot-home-image.jpg')",
                }}
            >
                <div
                    className="absolute inset-0 backdrop-blur-[1px]"
                    style={{
                        maskImage:
                            'radial-gradient(circle, transparent 5%, black 95%)',
                        WebkitMaskImage:
                            'radial-gradient(circle, transparent 5%, black 95%)',
                    }}
                />
                <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/50 to-black" />
            </div>
            <Container
                variant="centered"
                className="relative z-5 gap-4 text-white h-full"
            >
                <h1 className="text-3xl font-semibold">Klifurmót.is</h1>
                <p className="text-center">
                    Rauntímastjórnun móta fyrir klifrara, dómara og stjórnendur.
                </p>
                <MainButton animated onClick={() => navigate('/competitions')}>
                    Skoða mót
                </MainButton>
            </Container>
        </div>
    );
}
