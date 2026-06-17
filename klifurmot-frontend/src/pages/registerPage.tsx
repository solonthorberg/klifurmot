import Container from '@/components/ui/container';
import Icon from '@/components/ui/icons';
import Input from '@/components/ui/input';
import MainButton from '@/components/ui/mainButton';
import Select from '@/components/ui/select';
import { useAuth, useCountries } from '@/hooks/api/useAuth';
import { RegisterSchema, type RegisterFormData } from '@/schemas/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';

export default function RegisterPage() {
    const { data } = useCountries();
    const [showPassword, setShowPassword] = useState(false);
    const { register: registerUser, isRegistering } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(RegisterSchema),
    });

    const recaptchaToken = watch('recaptcha_token');
    const countries = data?.data;

    const handleRegister = (data: RegisterFormData) => {
        registerUser(data, {
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
                    Nýskráning
                </h3>
                <form
                    onSubmit={handleSubmit(handleRegister)}
                    className="w-full grid grid-cols-1 gap-x-4 gap-y-4"
                >
                    <Input
                        {...register('username')}
                        id="username"
                        type="text"
                        label="Notendanafn"
                        placeholder="biggi"
                        error={errors.username?.message}
                    />
                    <Input
                        {...register('full_name')}
                        id="full_name"
                        type="text"
                        label="Fullt nafn"
                        placeholder="Birgir Óli"
                        error={errors.full_name?.message}
                    />
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
                    </div>
                    <Input
                        {...register('password2')}
                        id="password2"
                        type="password"
                        label="Staðfesta lykilorð"
                        placeholder="biggi123"
                        error={errors.password2?.message}
                    />
                    <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                label="Kyn"
                                placeholder="Kyn"
                                className="w-full"
                                inputClassName="bg-white"
                                variant="input"
                                options={[
                                    { value: 'KK', label: 'KK' },
                                    { value: 'KVK', label: 'KVK' },
                                ]}
                                error={errors.gender?.message}
                            />
                        )}
                    />
                    <Input
                        {...register('date_of_birth')}
                        id="date_of_birth"
                        type="date"
                        label="Fæðingardagur"
                        error={errors.date_of_birth?.message}
                    />
                    <Controller
                        name="nationality"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                label="Þjóðerni"
                                placeholder="Veldu þjóðerni"
                                variant="input"
                                className="w-full"
                                inputClassName="bg-white"
                                options={
                                    countries?.map((c) => ({
                                        value: c.country_code,
                                        label: c.name_en,
                                    })) ?? []
                                }
                                error={errors.nationality?.message}
                            />
                        )}
                    />
                    <div className="flex justify-center">
                        <ReCAPTCHA
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                            onChange={(token) =>
                                setValue('recaptcha_token', token ?? '')
                            }
                        />
                    </div>
                    <MainButton
                        type="submit"
                        disabled={isRegistering || !recaptchaToken}
                    >
                        {isRegistering ? 'Nýskrái...' : 'Nýskrá'}
                    </MainButton>
                </form>
            </div>
        </Container>
    );
}
