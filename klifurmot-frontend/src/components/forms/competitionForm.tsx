import { Controller } from 'react-hook-form';
import type {
    Control,
    FieldErrors,
    UseFormRegister,
    UseFormSetValue,
} from 'react-hook-form';
import Input from '@/components/ui/input';
import TextBox from '@/components/ui/textBox';
import Select from '@/components/ui/select';
import MainButton from '@/components/ui/mainButton';
import { useRef, useState } from 'react';
import type { CreateCompetitionFormData } from '@/schemas/competition';

interface CompetitionFormProps {
    register: UseFormRegister<CreateCompetitionFormData>;
    control: Control<CreateCompetitionFormData>;
    errors: FieldErrors<CreateCompetitionFormData>;
    setValue: UseFormSetValue<CreateCompetitionFormData>;
}

const visibleOptions = [
    { value: 'true', label: 'Birta' },
    { value: 'false', label: 'Fela' },
];

export default function CompetitionForm({
    register,
    control,
    errors,
    setValue,
}: CompetitionFormProps) {
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col gap-4">
            <Input
                {...register('title')}
                className="bg-white"
                label="Titill"
                placeholder="t.d. Íslandsmeistaramótið í grjótglímu 2020"
                error={errors.title?.message}
            />
            <TextBox
                {...register('description')}
                label="Upplýsingar"
                placeholder="Hér kemur Markdown texti"
                error={errors.description?.message}
            />
            <Input
                {...register('start_date')}
                type="datetime-local"
                label="Mót byrjar"
                error={errors.start_date?.message}
            />
            <Input
                {...register('end_date')}
                type="datetime-local"
                label="Mót endar"
                error={errors.end_date?.message}
            />
            <Input
                {...register('location')}
                label="Staðsetning"
                placeholder="t.d. Klifurhúsið, Ármúli 21/23"
                error={errors.location?.message}
            />
            <Controller
                name="visible"
                control={control}
                render={({ field }) => (
                    <Select
                        label="Sýnileiki"
                        value={String(field.value)}
                        onChange={(val) => field.onChange(val === 'true')}
                        options={visibleOptions}
                        inputClassName="bg-white"
                        error={errors.visible?.message}
                    />
                )}
            />
            <div className="flex flex-col items-center gap-2">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            setValue('image', file);
                            setFileName(file.name);
                        }
                    }}
                />
                <MainButton
                    className="sm:w-xs w-full"
                    variant="outline"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {fileName ?? 'Breyta mynd'}
                </MainButton>
            </div>
        </div>
    );
}
