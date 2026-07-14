import React, { useState, useEffect, useMemo } from 'react';
import { Edital, EditalSubject, EditalTopic } from '../types';
import { supabase } from '../services/supabase';
import { globalRepo } from '../services/repository';
import { MentorshipStorage } from './storage';
import { User as UserType } from '../types';
import { 
    FolderOpen, Plus, Trash2, Edit2, Save, X, Link as LinkIcon, 
    ChevronRight, ChevronDown, FileText, BookOpen, Video, 
    Layers, Search, ExternalLink, CheckCircle, List, Send, MessageSquare
} from 'lucide-react';

// ==================== TYPES ====================

export interface LinkItem {
    id: string;
    title: string;
    resumoUrl: string;
    questoesUrl: string;
    aulaUrl: string;
    folderId: string;
}

export interface LinkFolder {
    id: string;
    name: string;
    parentId?: string; // for nested folders
}

export interface LinkSequenceItem {
    topicId: string;
    topicName: string;
    subjectName: string;
    resumoUrl: string;
    questoesUrl: string;
    aulaUrl: string;
}

export interface LinkSequence {
    id: string;
    title: string;
    editalId: string;
    editalTitle: string;
    items: LinkSequenceItem[];
    createdAt: string;
}

// ==================== STORAGE ====================

const linkBankStorage = {
    getFolders: async (): Promise<LinkFolder[]> => {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'link_bank_folders').single();
        return (data?.value as LinkFolder[]) || [];
    },
    saveFolders: async (folders: LinkFolder[]) => {
        await supabase.from('app_config').upsert({ key: 'link_bank_folders', value: folders }, { onConflict: 'key' });
    },
    getLinks: async (): Promise<LinkItem[]> => {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'link_bank_items').single();
        return (data?.value as LinkItem[]) || [];
    },
    saveLinks: async (links: LinkItem[]) => {
        await supabase.from('app_config').upsert({ key: 'link_bank_items', value: links }, { onConflict: 'key' });
    },
    getSequences: async (): Promise<LinkSequence[]> => {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'link_sequences').single();
        return (data?.value as LinkSequence[]) || [];
    },
    saveSequences: async (sequences: LinkSequence[]) => {
        await supabase.from('app_config').upsert({ key: 'link_sequences', value: sequences }, { onConflict: 'key' });
    }
};

export { linkBankStorage };

// ==================== COMPONENT ====================

interface LinkBankPanelProps {
    editais: Edital[];
}

export const LinkBankPanel: React.FC<LinkBankPanelProps> = ({ editais }) => {
    const [activeView, setActiveView] = useState<'BANK' | 'SEQUENCES'>('BANK');
    
    // Bank State
    const [folders, setFolders] = useState<LinkFolder[]>([]);
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // New Link State
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [newResumoUrl, setNewResumoUrl] = useState('');
    const [newQuestoesUrl, setNewQuestoesUrl] = useState('');
    const [newAulaUrl, setNewAulaUrl] = useState('');
    
    // Sequences State
    const [sequences, setSequences] = useState<LinkSequence[]>([]);
    const [creatingSequence, setCreatingSequence] = useState(false);
    const [selectedEditalId, setSelectedEditalId] = useState('');
    const [sequenceTitle, setSequenceTitle] = useState('');
    const [sequenceItems, setSequenceItems] = useState<LinkSequenceItem[]>([]);
    const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);

    // Direction Modal State
    const [directionModal, setDirectionModal] = useState<{
        isOpen: boolean;
        subject: string;
        linkOrTopicName: string;
        resumoUrl: string;
        questoesUrl: string;
        aulaUrl: string;
        editalId?: string;
    } | null>(null);
    const [students, setStudents] = useState<UserType[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [directionMessage, setDirectionMessage] = useState('');
    const [directionRepetition, setDirectionRepetition] = useState('1');

    const handleSendDirection = async () => {
        if (!directionModal || !selectedStudentId) return;
        
        try {
            // Determinar quais alunos receberão a meta
            let targetStudentIds: string[] = [];
            if (selectedStudentId === 'ALL_EDITAL') {
                targetStudentIds = students.filter(s => s.assignedEditalId === directionModal.editalId).map(s => s.id);
            } else if (selectedStudentId === 'ALL_SYSTEM') {
                targetStudentIds = students.map(s => s.id);
            } else {
                targetStudentIds = [selectedStudentId];
            }

            if (targetStudentIds.length === 0) {
                alert("Nenhum aluno encontrado para os critérios selecionados.");
                return;
            }

            const repCount = parseInt(directionRepetition) || 1;
            const today = new Date();

            // Gerar as datas de repetição
            const taskDates: string[] = [];
            for (let i = 0; i < repCount; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() + i);
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                taskDates.push(`${y}-${m}-${d}`);
            }

            // Aplicar para todos os alunos selecionados
            for (const sId of targetStudentIds) {
                const plan = await MentorshipStorage.initPlan(sId, '');
                if (!plan) continue;

                for (const isoDate of taskDates) {
                    const newTask = {
                        id: crypto.randomUUID(),
                        dayOfWeek: 'Extra',
                        type: 'META_EXTRA' as any,
                        subject: directionModal.subject,
                        description: directionMessage.trim() ? `MENSAGEM DO MENTOR: ${directionMessage}` : `Tópico: ${directionModal.linkOrTopicName}`,
                        isCompleted: false,
                        date: isoDate,
                        resumoUrl: directionModal.resumoUrl,
                        questoesUrl: directionModal.questoesUrl,
                        aulaUrl: directionModal.aulaUrl
                    };
                    plan.tasks.push(newTask);
                }
                
                await MentorshipStorage.savePlan(plan);
            }
            
            setDirectionModal(null);
            setDirectionMessage('');
            setSelectedStudentId('');
            setDirectionRepetition('1');
            alert(`Meta direcionada com sucesso para ${targetStudentIds.length} aluno(s)!`);
        } catch(e) {
            console.error(e);
            alert("Erro ao enviar meta.");
        }
    };

    // Load data
    useEffect(() => {
        const load = async () => {
            const [f, l, s, users] = await Promise.all([
                linkBankStorage.getFolders(),
                linkBankStorage.getLinks(),
                linkBankStorage.getSequences(),
                globalRepo.getUsers()
            ]);
            setFolders(f);
            setLinks(l);
            setSequences(s);
            setStudents(users.filter(u => String(u.role) === 'STUDENT' || String(u.role) === 'ALUNO'));
        };
        load();
    }, []);

    // ==================== FOLDER CRUD ====================
    const handleAddFolder = async () => {
        if (!newFolderName.trim()) return;
        const newFolder: LinkFolder = { id: crypto.randomUUID(), name: newFolderName.trim() };
        const updated = [...folders, newFolder];
        setFolders(updated);
        setNewFolderName('');
        await linkBankStorage.saveFolders(updated);
    };

    const handleDeleteFolder = async (id: string) => {
        const updated = folders.filter(f => f.id !== id);
        const updatedLinks = links.filter(l => l.folderId !== id);
        setFolders(updated);
        setLinks(updatedLinks);
        if (selectedFolderId === id) setSelectedFolderId(null);
        await linkBankStorage.saveFolders(updated);
        await linkBankStorage.saveLinks(updatedLinks);
    };

    const handleRenameFolder = async () => {
        if (!editingFolderId || !editingFolderName.trim()) return;
        const updated = folders.map(f => f.id === editingFolderId ? { ...f, name: editingFolderName.trim() } : f);
        setFolders(updated);
        setEditingFolderId(null);
        setEditingFolderName('');
        await linkBankStorage.saveFolders(updated);
    };

    // ==================== LINK CRUD ====================
    const handleAddLink = async () => {
        if (!newLinkTitle.trim() || (!newResumoUrl.trim() && !newQuestoesUrl.trim() && !newAulaUrl.trim()) || !selectedFolderId) return;
        const newLink: LinkItem = {
            id: crypto.randomUUID(),
            title: newLinkTitle.trim(),
            resumoUrl: newResumoUrl.trim(),
            questoesUrl: newQuestoesUrl.trim(),
            aulaUrl: newAulaUrl.trim(),
            folderId: selectedFolderId
        };
        const updated = [...links, newLink];
        setLinks(updated);
        setNewLinkTitle('');
        setNewResumoUrl('');
        setNewQuestoesUrl('');
        setNewAulaUrl('');
        await linkBankStorage.saveLinks(updated);
    };

    const handleDeleteLink = async (id: string) => {
        const updated = links.filter(l => l.id !== id);
        setLinks(updated);
        await linkBankStorage.saveLinks(updated);
    };

    // ==================== SEQUENCE ====================
    const handleStartSequence = () => {
        if (!selectedEditalId) return;
        const edital = editais.find(e => e.id === selectedEditalId);
        if (!edital) return;
        
        const items: LinkSequenceItem[] = [];
        edital.subjects.forEach(sub => {
            sub.topics.forEach(topic => {
                items.push({
                    topicId: topic.id,
                    topicName: topic.name,
                    subjectName: sub.name,
                    resumoUrl: '',
                    questoesUrl: '',
                    aulaUrl: ''
                });
            });
        });
        
        setSequenceTitle(`Sequência - ${edital.title}`);
        setSequenceItems(items);
        setCreatingSequence(true);
    };

    const handleSaveSequence = async () => {
        if (!sequenceTitle.trim()) return;
        const edital = editais.find(e => e.id === selectedEditalId);
        
        if (editingSequenceId) {
            const updated = sequences.map(s => s.id === editingSequenceId ? {
                ...s, title: sequenceTitle, items: sequenceItems
            } : s);
            setSequences(updated);
            await linkBankStorage.saveSequences(updated);
        } else {
            const newSeq: LinkSequence = {
                id: crypto.randomUUID(),
                title: sequenceTitle.trim(),
                editalId: selectedEditalId,
                editalTitle: edital?.title || '',
                items: sequenceItems,
                createdAt: new Date().toISOString()
            };
            const updated = [...sequences, newSeq];
            setSequences(updated);
            await linkBankStorage.saveSequences(updated);
        }
        
        setCreatingSequence(false);
        setEditingSequenceId(null);
        setSequenceItems([]);
        setSequenceTitle('');
    };

    const handleDeleteSequence = async (id: string) => {
        const updated = sequences.filter(s => s.id !== id);
        setSequences(updated);
        await linkBankStorage.saveSequences(updated);
    };

    const handleEditSequence = (seq: LinkSequence) => {
        setEditingSequenceId(seq.id);
        setSelectedEditalId(seq.editalId);
        setSequenceTitle(seq.title);
        setSequenceItems(seq.items);
        setCreatingSequence(true);
    };

    const updateSequenceItem = (topicId: string, field: 'resumoUrl' | 'questoesUrl' | 'aulaUrl', value: string) => {
        setSequenceItems(prev => prev.map(item => 
            item.topicId === topicId ? { ...item, [field]: value } : item
        ));
    };

    // Filtered links
    const folderLinks = useMemo(() => {
        if (!selectedFolderId) return [];
        return links.filter(l => l.folderId === selectedFolderId);
    }, [links, selectedFolderId]);

    const filteredLinks = useMemo(() => {
        if (!searchTerm) return links;
        const term = searchTerm.toLowerCase();
        return links.filter(l => l.title.toLowerCase().includes(term) || l.url.toLowerCase().includes(term));
    }, [links, searchTerm]);

    // Group sequence items by subject
    const groupedSequenceItems = useMemo(() => {
        const groups: Record<string, LinkSequenceItem[]> = {};
        sequenceItems.forEach(item => {
            if (!groups[item.subjectName]) groups[item.subjectName] = [];
            groups[item.subjectName].push(item);
        });
        return groups;
    }, [sequenceItems]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header with tabs */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Banco de Links</h2>
                    <p className="text-zinc-500 text-sm">Gerencie materiais e sequências de estudo</p>
                </div>
                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    <button 
                        onClick={() => setActiveView('BANK')} 
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${activeView === 'BANK' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <FolderOpen size={14}/> Banco
                    </button>
                    <button 
                        onClick={() => setActiveView('SEQUENCES')} 
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${activeView === 'SEQUENCES' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Layers size={14}/> Sequências
                    </button>
                </div>
            </div>

            {/* ==================== BANK VIEW ==================== */}
            {activeView === 'BANK' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Folders Panel */}
                    <div className="bg-black/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FolderOpen size={14}/> Pastas
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                                placeholder="Nova pasta..." 
                                className="flex-1 bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white text-sm outline-none focus:border-red-600"
                            />
                            <button onClick={handleAddFolder} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition">
                                <Plus size={16}/>
                            </button>
                        </div>
                        <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {folders.map(folder => (
                                <div 
                                    key={folder.id}
                                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition group ${selectedFolderId === folder.id ? 'bg-zinc-800 border border-zinc-700' : 'hover:bg-zinc-900'}`}
                                    onClick={() => setSelectedFolderId(folder.id)}
                                >
                                    {editingFolderId === folder.id ? (
                                        <div className="flex items-center gap-1 flex-1">
                                            <input 
                                                value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleRenameFolder()}
                                                className="flex-1 bg-zinc-800 border border-zinc-700 p-1 rounded text-white text-sm"
                                                autoFocus
                                            />
                                            <button onClick={handleRenameFolder} className="text-green-500 p-1"><Save size={14}/></button>
                                            <button onClick={() => setEditingFolderId(null)} className="text-zinc-500 p-1"><X size={14}/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <FolderOpen size={16} className={selectedFolderId === folder.id ? 'text-red-500' : 'text-zinc-500'}/>
                                                <span className="text-sm text-zinc-300 font-medium">{folder.name}</span>
                                                <span className="text-[10px] text-zinc-600">{links.filter(l => l.folderId === folder.id).length}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }} className="p-1 text-zinc-500 hover:text-blue-400"><Edit2 size={12}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12}/></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {folders.length === 0 && <p className="text-zinc-600 text-sm text-center py-4 italic">Nenhuma pasta criada.</p>}
                        </div>
                    </div>

                    {/* Links Panel */}
                    <div className="md:col-span-2 bg-black/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5">
                        {selectedFolderId ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                        <LinkIcon size={14}/> Links em "{folders.find(f => f.id === selectedFolderId)?.name}"
                                    </h3>
                                </div>
                                
                                {/* Add Link Form */}
                                <div className="flex gap-2 mb-4 flex-wrap">
                                    <div className="flex flex-col gap-2 w-full">
                                        <input type="text" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} placeholder="Título do Assunto (Ex: Crase)" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white text-sm outline-none focus:border-red-600"/>
                                        <div className="flex gap-2">
                                            <input type="text" value={newResumoUrl} onChange={e => setNewResumoUrl(e.target.value)} placeholder="URL Resumo" className="flex-1 min-w-[100px] bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white text-sm outline-none focus:border-red-600"/>
                                            <input type="text" value={newQuestoesUrl} onChange={e => setNewQuestoesUrl(e.target.value)} placeholder="URL Questões" className="flex-1 min-w-[100px] bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white text-sm outline-none focus:border-red-600"/>
                                            <input type="text" value={newAulaUrl} onChange={e => setNewAulaUrl(e.target.value)} placeholder="URL Aula" className="flex-1 min-w-[100px] bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white text-sm outline-none focus:border-red-600"/>
                                            <button onClick={handleAddLink} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition flex items-center gap-1">
                                                <Plus size={14}/> Adicionar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Links List */}
                                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar mt-4">
                                    {folderLinks.map(link => (
                                        <div key={link.id} className="flex flex-col p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-bold text-white flex-1">{link.title}</p>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setDirectionModal({ isOpen: true, subject: link.title, linkOrTopicName: link.title, resumoUrl: link.resumoUrl, questoesUrl: link.questoesUrl, aulaUrl: link.aulaUrl })} className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-1.5 rounded border border-blue-900/50 transition">
                                                        <Send size={12}/> Direcionar
                                                    </button>
                                                    <button onClick={() => handleDeleteLink(link.id)} className="p-1.5 text-zinc-500 hover:text-red-400 transition"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                                {link.resumoUrl && (
                                                    <a href={link.resumoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-1 rounded border border-blue-900/50">
                                                        <BookOpen size={12}/> Resumo <ExternalLink size={10}/>
                                                    </a>
                                                )}
                                                {link.questoesUrl && (
                                                    <a href={link.questoesUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-green-400 hover:text-green-300 bg-green-900/20 px-2 py-1 rounded border border-green-900/50">
                                                        <FileText size={12}/> Questões <ExternalLink size={10}/>
                                                    </a>
                                                )}
                                                {link.aulaUrl && (
                                                    <a href={link.aulaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 bg-purple-900/20 px-2 py-1 rounded border border-purple-900/50">
                                                        <Video size={12}/> Aula <ExternalLink size={10}/>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {folderLinks.length === 0 && <p className="text-zinc-600 text-sm text-center py-8 italic">Nenhum assunto nesta pasta.</p>}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                                <FolderOpen size={48} className="mb-4 opacity-30"/>
                                <p className="font-medium">Selecione uma pasta para ver seus links</p>
                                <p className="text-xs mt-1">Ou crie uma nova pasta no painel à esquerda</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== SEQUENCES VIEW ==================== */}
            {activeView === 'SEQUENCES' && !creatingSequence && (
                <div className="space-y-6">
                    {/* Create Sequence */}
                    <div className="bg-black/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Plus size={14}/> Criar Nova Sequência
                        </h3>
                        <div className="flex gap-3 items-center">
                            <select 
                                value={selectedEditalId} 
                                onChange={e => setSelectedEditalId(e.target.value)} 
                                className="flex-1 bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white text-sm outline-none focus:border-red-600"
                            >
                                <option value="">Selecione um Edital Verticalizado...</option>
                                {editais.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </select>
                            <button 
                                onClick={handleStartSequence} 
                                disabled={!selectedEditalId}
                                className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Layers size={16}/> Montar Sequência
                            </button>
                        </div>
                    </div>

                    {/* Existing Sequences */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sequences.map(seq => (
                            <div key={seq.id} className="bg-black/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5 hover:border-red-900/50 transition group">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="text-white font-bold">{seq.title}</h4>
                                        <p className="text-xs text-zinc-500 mt-1">Edital: {seq.editalTitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-600 mb-4">
                                    <List size={12}/> {seq.items.length} tópicos
                                    <span>•</span>
                                    <span>{seq.items.filter(i => i.resumoUrl || i.questoesUrl || i.aulaUrl).length} com links</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditSequence(seq)} className="flex-1 bg-zinc-800 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold hover:bg-zinc-700 transition flex items-center justify-center gap-1">
                                        <Edit2 size={12}/> Editar
                                    </button>
                                    <button onClick={() => handleDeleteSequence(seq.id)} className="bg-red-900/20 text-red-400 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition">
                                        <Trash2 size={12}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {sequences.length === 0 && (
                            <div className="col-span-3 text-center py-12 bg-black/60 backdrop-blur-md border border-zinc-800/50 rounded-xl border-dashed">
                                <Layers size={48} className="mx-auto text-zinc-700 mb-4"/>
                                <p className="text-zinc-500 font-medium">Nenhuma sequência criada.</p>
                                <p className="text-zinc-600 text-xs mt-1">Selecione um edital acima para começar.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== SEQUENCE EDITOR ==================== */}
            {activeView === 'SEQUENCES' && creatingSequence && (
                <div className="space-y-4">
                    <div className="bg-black/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <button onClick={() => { setCreatingSequence(false); setEditingSequenceId(null); }} className="text-zinc-500 hover:text-white transition p-2 rounded-lg hover:bg-zinc-800">
                                    <X size={20}/>
                                </button>
                                <input 
                                    value={sequenceTitle} onChange={e => setSequenceTitle(e.target.value)}
                                    className="text-xl font-bold bg-transparent text-white border-b border-zinc-700 pb-1 outline-none focus:border-red-600 min-w-[300px]"
                                    placeholder="Título da sequência..."
                                />
                            </div>
                            <button onClick={handleSaveSequence} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 transition flex items-center gap-2">
                                <Save size={16}/> Salvar Sequência
                            </button>
                        </div>

                        <p className="text-zinc-500 text-sm mb-6">
                            Para cada tópico do edital, insira os links de Resumo, Questões e Aula. Você pode selecionar links existentes do Banco ou digitar URLs manualmente.
                        </p>

                        {/* Topics grouped by subject */}
                        {Object.entries(groupedSequenceItems).map(([subjectName, items]) => (
                            <div key={subjectName} className="mb-6">
                                <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2 sticky top-0 bg-black/60 py-2 z-10">
                                    <ChevronRight size={14}/> {subjectName}
                                </h4>
                                <div className="space-y-2">
                                    {(items as LinkSequenceItem[]).map(item => (
                                        <div key={item.topicId} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-medium text-zinc-300">{item.topicName}</p>
                                                <button onClick={() => setDirectionModal({ isOpen: true, subject: item.subjectName, linkOrTopicName: item.topicName, resumoUrl: item.resumoUrl, questoesUrl: item.questoesUrl, aulaUrl: item.aulaUrl, editalId: editingSequenceId ? sequences.find(s => s.id === editingSequenceId)?.editalId : '' })} className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-1.5 rounded border border-blue-900/50 transition">
                                                    <Send size={12}/> Direcionar
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <div className="flex items-center gap-1">
                                                    <BookOpen size={12} className="text-blue-400 flex-shrink-0"/>
                                                    <input 
                                                        value={item.resumoUrl} 
                                                        onChange={e => updateSequenceItem(item.topicId, 'resumoUrl', e.target.value)}
                                                        placeholder="Link do Resumo" 
                                                        className="flex-1 bg-zinc-800 border border-zinc-700 p-1.5 rounded text-white text-xs outline-none focus:border-blue-600"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FileText size={12} className="text-green-400 flex-shrink-0"/>
                                                    <input 
                                                        value={item.questoesUrl} 
                                                        onChange={e => updateSequenceItem(item.topicId, 'questoesUrl', e.target.value)}
                                                        placeholder="Link das Questões" 
                                                        className="flex-1 bg-zinc-800 border border-zinc-700 p-1.5 rounded text-white text-xs outline-none focus:border-green-600"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Video size={12} className="text-purple-400 flex-shrink-0"/>
                                                    <input 
                                                        value={item.aulaUrl} 
                                                        onChange={e => updateSequenceItem(item.topicId, 'aulaUrl', e.target.value)}
                                                        placeholder="Link da Aula" 
                                                        className="flex-1 bg-zinc-800 border border-zinc-700 p-1.5 rounded text-white text-xs outline-none focus:border-purple-600"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {sequenceItems.length === 0 && (
                            <div className="text-center py-8 text-zinc-600">
                                <p>Nenhum tópico encontrado no edital selecionado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Modal de Direcionamento */}
            {directionModal && directionModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button onClick={() => setDirectionModal(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                            <X size={20}/>
                        </button>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Send size={24} className="text-blue-500"/>
                            Direcionar Meta
                        </h3>
                        <div className="mb-4">
                            <p className="text-sm text-zinc-400 mb-1">Disciplina / Assunto</p>
                            <div className="bg-black/50 border border-zinc-800 p-2 rounded text-white text-sm font-bold">
                                {directionModal.subject}
                            </div>
                        </div>
                        <div className="mb-4">
                            <p className="text-sm text-zinc-400 mb-1">Tópico Específico</p>
                            <div className="bg-black/50 border border-zinc-800 p-2 rounded text-zinc-300 text-sm">
                                {directionModal.linkOrTopicName}
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Selecionar Aluno</label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="w-full bg-black/50 border border-zinc-800 text-white rounded-lg p-3 outline-none focus:border-blue-500 transition"
                            >
                                <option value="">-- Escolha um Aluno ou Grupo --</option>
                                {directionModal.editalId && (
                                    <option value="ALL_EDITAL" className="font-bold text-blue-400">TODOS OS ALUNOS DESTE EDITAL (Massa)</option>
                                )}
                                <option value="ALL_SYSTEM" className="font-bold text-purple-400">TODOS OS ALUNOS DO SISTEMA (Massa)</option>
                                <optgroup label="Alunos Individuais">
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name || s.email}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Repetição</label>
                            <select
                                value={directionRepetition}
                                onChange={(e) => setDirectionRepetition(e.target.value)}
                                className="w-full bg-black/50 border border-zinc-800 text-white rounded-lg p-3 outline-none focus:border-blue-500 transition"
                            >
                                <option value="1">Vez Única (Hoje)</option>
                                <option value="2">2 Dias Consecutivos</option>
                                <option value="3">3 Dias Consecutivos</option>
                                <option value="5">5 Dias Consecutivos</option>
                                <option value="7">7 Dias Consecutivos</option>
                                <option value="15">15 Dias Consecutivos</option>
                                <option value="30">30 Dias Consecutivos</option>
                            </select>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Mensagem do Mentor <span className="text-zinc-600 normal-case font-normal">(opcional)</span></label>
                            <textarea
                                value={directionMessage}
                                onChange={(e) => setDirectionMessage(e.target.value)}
                                placeholder="Digite uma mensagem específica para o aluno sobre essa meta..."
                                className="w-full bg-black/50 border border-zinc-800 text-white rounded-lg p-3 h-24 outline-none focus:border-blue-500 transition resize-none"
                            />
                        </div>
                        <button 
                            onClick={handleSendDirection}
                            disabled={!selectedStudentId}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ENVIAR META
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
