import React, { useEffect, useState } from 'react';
import { globalRepo } from '../services/repository';
import { History } from 'lucide-react';

export const AdminLoginsPanel = () => {
    const [logins, setLogins] = useState<any[]>([]);

    useEffect(() => {
        const loadLogins = async () => {
            const data = await globalRepo.getLogins();
            setLogins(data);
        };
        loadLogins();
    }, []);

    return (
        <div className="bg-black/60 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg">
            <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-2"><History className="text-blue-500"/> Controle de Logins</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-zinc-500 dark:text-zinc-400">
                    <thead className="text-xs text-zinc-400 uppercase bg-black/40 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-3">Aluno</th>
                            <th className="px-6 py-3">E-mail</th>
                            <th className="px-6 py-3">Classificação</th>
                            <th className="px-6 py-3">IP</th>
                            <th className="px-6 py-3">Data/Hora</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logins.map((login: any) => {
                            const isVip = login.users?.approved || (login.users?.purchased_products && login.users.purchased_products.length > 0);
                            return (
                            <tr key={login.id} className="bg-black/20 border-b border-white/10 hover:bg-black/40 transition">
                                <td className="px-6 py-4 font-medium text-white">{login.users?.name || 'Desconhecido'}</td>
                                <td className="px-6 py-4">{login.users?.email || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    {isVip 
                                        ? <span className="px-2 py-1 bg-green-500/20 text-green-500 border border-green-500/30 rounded text-xs font-bold whitespace-nowrap">Aluno VIP (Com Acesso)</span>
                                        : <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 rounded text-xs font-bold whitespace-nowrap">Aluno Grátis (Sem Acesso)</span>
                                    }
                                </td>
                                <td className="px-6 py-4">{login.ip_address || 'N/A'}</td>
                                <td className="px-6 py-4">{new Date(login.login_time).toLocaleString()}</td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
