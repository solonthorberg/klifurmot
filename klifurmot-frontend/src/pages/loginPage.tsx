import Container from "@/components/ui/container";
import MainButton from "@/components/ui/mainButton";
import { useAuth } from "@/hooks/api/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginFormData } from "@/schemas/auth";
import Icon from "@/components/ui/icons";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google"
import { Link } from "react-router-dom";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoggingIn, googleAuth } = useAuth()
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema)
    });


    return (
        <Container variant="primaryCenter" className="animate-fade-in">
            <div className="flex flex-col gap-8 p-8 justify-center w-full max-w-lg border border-outline rounded-lg">
                <h3 className="font-semibold text-2xl text-center">
                    {"Innskráning"}
                </h3>
                <div>
                    <GoogleLogin
                        onSuccess={(credentialResponse) => googleAuth(credentialResponse.credential!)}
                        size="large"
                        width="100%"
                    />
                </div>
                <div className="border-t border-outline border-grey-500">
                </div>
                <form onSubmit={handleSubmit((data) => login(data))} className="w-full grid grid-cols-1 gap-x-6 gap-y-8">
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
                    <div className="flex flex-col w-full">
                        <MainButton variant='secondary' disabled={isLoggingIn}>
                            {isLoggingIn ? 'Skrái inn...' : 'Innskráning'}
                        </MainButton>
                        <p className="text-center text-sm mt-3">
                            Ertu ekki með aðgang?{" "}
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
        </Container >
    )
}
