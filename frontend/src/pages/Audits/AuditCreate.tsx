import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { auditsApi } from '@/api/audits';

const schema = z.object({
    name: z.string().min(3, 'Mínimo 3 caracteres'),
    company_name: z.string().min(2, 'Requerido'),
    period_start: z.string().min(1, 'Requerido'),
    period_end: z.string().min(1, 'Requerido'),
});

type FormData = z.infer<typeof schema>;

export default function AuditCreate() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            company_name: 'Consorcio Besalco Stracon',
        },
    });

    const mutation = useMutation({
        mutationFn: (data: FormData) => auditsApi.create(data),
        onSuccess: (audit) => {
            queryClient.invalidateQueries({ queryKey: ['audits'] });
            navigate(`/audits/${audit.id}`);
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Nueva Auditoría</h1>
                <p className="text-gray-600 mt-1">Crear proyecto de auditoría SoD</p>
            </div>

            <div className="card max-w-2xl">
                <div className="card-body space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre</label>
                        <input className="input" {...register('name')} />
                        {errors.name && <p className="text-danger-600 text-sm mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Empresa</label>
                        <input className="input" {...register('company_name')} />
                        {errors.company_name && <p className="text-danger-600 text-sm mt-1">{errors.company_name.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Inicio periodo</label>
                            <input type="date" className="input" {...register('period_start')} />
                            {errors.period_start && <p className="text-danger-600 text-sm mt-1">{errors.period_start.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Fin periodo</label>
                            <input type="date" className="input" {...register('period_end')} />
                            {errors.period_end && <p className="text-danger-600 text-sm mt-1">{errors.period_end.message}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleSubmit((data) => mutation.mutate(data))}
                            className="btn btn-primary"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? 'Guardando...' : 'Crear Auditoría'}
                        </button>
                        <button onClick={() => navigate('/audits')} className="btn btn-secondary">
                            Cancelar
                        </button>
                    </div>
                    {mutation.isError && (
                        <p className="text-danger-600 text-sm">No se pudo crear la auditoría.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

