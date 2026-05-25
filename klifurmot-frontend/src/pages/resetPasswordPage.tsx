import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';
import Input from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { authApi, getErrorMessage } from '@/api';
import { notify } from '@/stores/notificationStore';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    ResetPasswordSchema,
    type ResetPasswordFormData,
} from '@/schemas/auth';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') ?? '';

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(ResetPasswordSchema),
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (data: ResetPasswordFormData) =>
            authApi.resetPassword({ token, ...data }),
        onSuccess: (data) => {
            notify.success(data.message);
            navigate('/login');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    if (!token) {
        return (
            <Container variant="primaryCenter">
                <p className="text-gray-500">Ógildur hlekkur.</p>
                <Link
                    to="/forgot-password"
                    className="text-primary hover:underline"
                >
                    Óska eftir nýjum hlekk
                </Link>
            </Container>
        );
    }

    return (
        <Container variant="primaryCenter" className="animate-fade-in">
            <div className="flex flex-col gap-8 p-8 justify-center w-full max-w-lg border border-outline rounded-lg">
                <h3 className="font-semibold text-2xl text-center">
                    Veldu nýtt lykilorð
                </h3>
                <form
                    onSubmit={handleSubmit((data) => mutate(data))}
                    className="flex flex-col gap-4"
                >
                    <Input
                        {...register('password')}
                        id="password"
                        type="password"
                        label="Nýtt lykilorð"
                        error={errors.password?.message}
                    />
                    <Input
                        {...register('password_confirm')}
                        id="password_confirm"
                        type="password"
                        label="Staðfesta lykilorð"
                        error={errors.password_confirm?.message}
                    />
                    <MainButton type="submit" disabled={isPending}>
                        {isPending ? 'Vistar...' : 'Vista lykilorð'}
                    </MainButton>
                </form>
            </div>
        </Container>
    );
}
