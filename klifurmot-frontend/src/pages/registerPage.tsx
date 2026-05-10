import Container from "@/components/ui/container";
import Icon from "@/components/ui/icons";
import MainButton from "@/components/ui/mainButton";
import Select from "@/components/ui/select";
import { useAuth, useCountries } from "@/hooks/api/useAuth";
import { registerSchema, type RegisterFormData } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

export default function RegisterPage() {
    const { data } = useCountries();
    const [showPassword, setShowPassword] = useState(false);
    const { register: registerUser, isRegistering, googleAuth } = useAuth()
    const { register, handleSubmit, control, formState: { errors } } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema)
    })

    const countries = data?.data;

    return (
        <Container variant="primaryCenter" className="animate-fade-in">
            <div className="flex flex-col gap-8 p-8 justify-center w-full max-w-lg border border-outline rounded-lg">
                <h3 className="font-semibold text-2xl text-center">
                    {"Innskráning"}
                </h3>

                <div>
                    <GoogleLogin
                        onSuccess={(credentialResponse) => googleAuth(credentialResponse.credential!)}
                        text="signup_with"
                        size="large"
                        width="100%"
                    />
                </div>

                <div className="border-t border-outline border-grey-500">
                </div>

                <form onSubmit={handleSubmit((data) => registerUser(data))} className="w-full grid grid-cols-1 gap-x-6 gap-y-8">
                    <div className="cols-span-4">
                        <label htmlFor="username">Notendanafn</label>
                        <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                            <input
                                {...register('username')}
                                id="username"
                                type="username"
                                placeholder="biggi"
                                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                            />
                        </div>
                        {errors.username && <p className="text-red-500">{errors.username.message}</p>}
                    </div>
                    <div className="cols-span-4">
                        <label>Fullt Nafn</label>
                        <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                            <input
                                {...register('full_name')}
                                id="full_name"
                                type="text"
                                placeholder="Birgir Óli"
                                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                            />
                        </div>
                        {errors.full_name && <p className="text-red-500">{errors.full_name.message}</p>}
                    </div>
                    <div className="cols-span-4">
                        <label htmlFor="email">Netfang</label>
                        <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                            <input
                                {...register('email')}
                                id="email"
                                type="email"
                                placeholder="biggi@netfang.is"
                                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                            />
                        </div>
                        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
                    </div>
                    <div className="cols-span-4">
                        <label htmlFor="password">Lykilorð</label>
                        <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                            <input
                                {...register('password')}
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="biggi123"
                                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="text-gray-400 pr-3"
                            >
                                <Icon variant={showPassword ? 'eyeOff' : 'eye'} size={20} />
                            </button>
                        </div>
                        {errors.password && <p className="text-red-500">{errors.password.message}</p>}
                    </div>
                    <div className="cols-span-4">
                        <label htmlFor="password">Staðfesta lykilorð</label>
                        <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                            <input
                                {...register('password2')}
                                id="password2"
                                type="password"
                                placeholder="biggi123"
                                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                            />
                        </div>
                        {errors.password2 && <p className="text-red-500">{errors.password2.message}</p>}
                    </div>
                    <div className="cols-span-4">
                        <label htmlFor="gender">Kyn</label>
                        <Controller
                            name="gender"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    value={field.value ?? ''}
                                    onChange={field.onChange}
                                    placeholder="Kyn"
                                    className="w-full"
                                    variant="input"
                                    options={[
                                        { value: 'KK', label: 'KK' },
                                        { value: 'KVK', label: 'Kona' },
                                    ]}
                                />
                            )}
                        />
                        {errors.gender && <p className="text-red-500">{errors.gender.message}</p>}
                    </div>

                    <div className="cols-span-4">
                        <label htmlFor="date_of_birth">Fæðingardagur</label>
                        <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                            <input
                                {...register('date_of_birth')}
                                id="date_of_birth"
                                type="date"
                                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 focus:outline-none"
                            />
                        </div>
                        {errors.date_of_birth && <p className="text-red-500">{errors.date_of_birth.message}</p>}
                    </div>
                    <div className="cols-span-4">
                        <label htmlFor="nationality">Þjóðerni</label>
                        <Controller
                            name="nationality"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    value={field.value ?? ''}
                                    onChange={field.onChange}
                                    placeholder="Veldu þjóðerni"
                                    variant="input"
                                    className="w-full"
                                    options={countries?.map((c) => ({ value: c.country_code, label: c.name_local })) ?? []}
                                />
                            )}
                        />
                        {errors.nationality && <p className="text-red-500">{errors.nationality.message}</p>}
                    </div>
                    <div className="cols-span-4">
                        <label htmlFor="height_cm">Hæð (cm)</label>
                        <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                            <input
                                {...register('height_cm')}
                                id="height_cm"
                                type="number"
                                placeholder="178"
                                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                            />
                        </div>
                        {errors.height_cm && <p className="text-red-500">{errors.height_cm.message}</p>}
                    </div>
                    <div className="cols-span-4">
                        <label htmlFor="wingspan_cm">Vænghaf (cm)</label>
                        <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                            <input
                                {...register('wingspan_cm')}
                                id="wingspan_cm"
                                type="number"
                                placeholder="185"
                                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                            />
                        </div>
                        {errors.wingspan_cm && <p className="text-red-500">{errors.wingspan_cm.message}</p>}
                    </div>
                    <MainButton variant='secondary' disabled={isRegistering}>
                        {isRegistering ? 'Skrái aðgang...' : 'Skrá aðgang'}
                    </MainButton>
                </form>
            </div>
        </Container>
    )
}
