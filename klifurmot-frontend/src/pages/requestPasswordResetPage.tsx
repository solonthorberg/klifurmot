import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';
import Input from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/api/useAuth';
import {
    RequestPasswordResetSchema,
    type RequestPasswordResetFormData,
} from '@/schemas/auth';

export default function RequestPasswordResetPage() {
    const { passwordReset, passwordResetPending, passwordResetSuccess } =
        useAuth();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RequestPasswordResetFormData>({
        resolver: zodResolver(RequestPasswordResetSchema),
    });

    return (
        <Container variant="primaryCenter" className="animate-fade-in">
            <div className="flex flex-col gap-8 p-8 justify-center w-full max-w-lg border border-outline rounded-lg">
                <h3 className="font-semibold text-2xl text-center">
                    Breyta lykilorði
                </h3>
                {passwordResetSuccess ? (
                    <p className="text-center text-gray-500">
                        Ef aðgangur er skráður með þessu netfangi muntu fá
                        tölvupóst með leiðbeiningum.
                    </p>
                ) : (
                    <form
                        onSubmit={handleSubmit((data) => passwordReset(data))}
                        className="flex flex-col gap-4"
                    >
                        <Input
                            {...register('email')}
                            id="email"
                            type="email"
                            label="Netfang"
                            placeholder="biggi@netfang.is"
                            error={errors.email?.message}
                        />
                        <MainButton
                            type="submit"
                            disabled={passwordResetPending}
                        >
                            {passwordResetPending ? 'Sendi...' : 'Senda hlekk'}
                        </MainButton>
                        <p className="text-center text-sm">
                            <Link
                                to="/login"
                                className="text-primary hover:underline font-medium"
                            >
                                Til baka
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </Container>
    );
}
