import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';
import { useAuth } from '@/hooks/api/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoginSchema, type LoginFormData } from '@/schemas/auth';
import Icon from '@/components/ui/icons';
import Input from '@/components/ui/input';
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoggingIn, googleAuth } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(LoginSchema),
    });

    const recaptchaToken = watch('recaptcha_token');

    const handleLogin = (data: LoginFormData) => {
        login(data, {
            onSuccess: () => {
                navigate(searchParams.get('redirect') ?? '/', {
                    replace: true,
                });
            },
        });
    };

    return (
        <Container variant="primaryCenter" className="animate-fade-in">
            <div className="flex flex-col gap-8 p-8 justify-center w-full max-w-lg border border-outline rounded-lg">
                <h3 className="font-semibold text-2xl text-center">
                    Innskráning
                </h3>
                <div className="flex justify-center w-full">
                    <GoogleLogin
                        onSuccess={(credentialResponse) =>
                            googleAuth(credentialResponse.credential!)
                        }
                        size="large"
                        width={400}
                    />
                </div>
                <div className="border-t border-outline border-grey-500" />
                <form
                    onSubmit={handleSubmit(handleLogin)}
                    className="w-full grid grid-cols-1 gap-x-4 gap-y-4"
                >
                    <Input
                        {...register('email')}
                        id="email"
                        type="email"
                        label="Netfang"
                        placeholder="biggi@netfang.is"
                        error={errors.email?.message}
                    />
                    <div className="flex flex-col gap-1">
                        <Input
                            {...register('password')}
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            label="Lykilorð"
                            placeholder="biggi123"
                            error={errors.password?.message}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="relative text-gray-400 self-end text-sm flex items-center gap-1"
                        >
                            <Icon
                                variant={showPassword ? 'eyeOff' : 'eye'}
                                size={16}
                                className="absolute right-1 bottom-13"
                            />
                        </button>
                        <Link
                            to="/forgot-password"
                            className="text-sm text-primary hover:underline self-end mt-1"
                        >
                            Gleymt lykilorð?
                        </Link>
                    </div>
                    <div className="flex justify-center">
                        <ReCAPTCHA
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                            onChange={(token) =>
                                setValue('recaptcha_token', token ?? '')
                            }
                        />
                    </div>
                    <div className="flex flex-col w-full">
                        <MainButton
                            type="submit"
                            disabled={isLoggingIn || !recaptchaToken}
                        >
                            {isLoggingIn ? 'Skrái inn...' : 'Innskrá'}
                        </MainButton>
                        <p className="text-center text-sm mt-3">
                            Ertu ekki með aðgang?{' '}
                            <Link
                                to="/register"
                                className="text-primary hover:text-secondary font-bold hover:underline"
                            >
                                Nýskrá
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </Container>
    );
}
