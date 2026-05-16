import { useAuth } from '@/hooks/api/useAuth';
import { useForm, type Resolver } from 'react-hook-form';
import { profileSchema, type ProfileFormData } from '@/schemas/auth';
import MainButton from '../ui/mainButton';
import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

export default function EditProfileTab({ onDone }: { onDone: () => void }) {
    const { updateUserAccount, isUpdatingUserAccount, userAccount } = useAuth();
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema) as Resolver<ProfileFormData>,
        defaultValues: {
            username: userAccount?.user.username ?? '',
            height_cm: userAccount?.height_cm ?? undefined,
            wingspan_cm: userAccount?.wingspan_cm ?? undefined,
        },
    });
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <form
            onSubmit={handleSubmit((data) => {
                updateUserAccount(
                    {
                        username: data.username,
                        height_cm: data.height_cm ?? null,
                        wingspan_cm: data.wingspan_cm ?? null,
                        profile_picture: data.profile_picture ?? null,
                    },
                    {
                        onSuccess: () => onDone(),
                    },
                );
            })}
            className="flex flex-col gap-2 w-full animate-fade-in"
        >
            <div className="flex flex-col items-center gap-2">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            setValue('profile_picture', file);
                            setFileName(file.name);
                        }
                    }}
                />
                <MainButton
                    className="w-full"
                    variant="outline"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {fileName ?? 'Breyta mynd'}
                </MainButton>
            </div>
            <label htmlFor="username">Notendanafn</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <input
                    {...register('username')}
                    id="username"
                    type="text"
                    placeholder={userAccount?.user.username}
                    className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
            </div>
            {errors.username && (
                <p className="text-red-500">{errors.username.message}</p>
            )}
            <label htmlFor="height">Hæð (cm)</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <input
                    {...register('height_cm', { valueAsNumber: true })}
                    id="height"
                    type="number"
                    className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
            </div>
            {errors.height_cm && (
                <p className="text-red-500">{errors.height_cm?.message}</p>
            )}
            <label htmlFor="wingspan">Vænghaf (cm)</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <input
                    {...register('wingspan_cm', { valueAsNumber: true })}
                    id="wingspan"
                    type="number"
                    className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
            </div>
            {errors.wingspan_cm && (
                <p className="text-red-500">{errors.wingspan_cm?.message}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                <MainButton
                    className="w-full"
                    type="submit"
                    disabled={isUpdatingUserAccount}
                >
                    {isUpdatingUserAccount ? 'Vistar...' : 'Vista'}
                </MainButton>
                <MainButton
                    className="w-full"
                    type="button"
                    variant="outline"
                    onClick={onDone}
                >
                    Hætta við
                </MainButton>
            </div>
        </form>
    );
}
