
import React, { useState, useRef, useEffect } from 'react';
import { X, Move, Hand, Bot, Square, Mountain, Palette, Map as MapIcon, PlusCircle, Undo, Trash2, Hammer, CornerDownRight, MoveUpRight, Minus, ChevronUp, ChevronDown, Plus, Minus as MinusIcon, GripHorizontal, Save, Check, Code, Target, Trophy } from 'lucide-react';
import { CustomObject, EditorTool, PathShape } from '../types';

interface ChallengeBuilderUIProps {
    isVisible: boolean;
    selectedTool: EditorTool;
    onSelectTool: (tool: EditorTool) => void;
    selectedPathShape: PathShape;
    onSelectPathShape: (shape: PathShape) => void;
    selectedObjectId: string | null;
    onDeselect: () => void;
    customObjects: CustomObject[];
    onPropertyChange: (updates: Partial<CustomObject> | { id: 'DELETE' }) => void;
    onClose: () => void;
    onSaveChallenge: (title: string, desc: string, winCondition: string) => void;
    onImportChallenge: (code: string) => void;
    onOpenNumpad: (v: number, cb: (val: number) => void) => void;
    onUndo: () => void;
    onClearAll: () => void;
    editingChallengeId: string | null;
    currentChallengeData?: { title: string, description: string };
    robotPos?: {x: number, z: number, rotation: number};
}

export const ChallengeBuilderUI: React.FC<ChallengeBuilderUIProps> = ({
    isVisible, selectedTool, onSelectTool, selectedPathShape, onSelectPathShape,
    selectedObjectId, onDeselect, customObjects, 
    onPropertyChange, onClose, onSaveChallenge, onImportChallenge, onOpenNumpad, onUndo, onClearAll,
    editingChallengeId, currentChallengeData, robotPos
}) => {
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [saveDesc, setSaveDesc] = useState('');
    const [winCondition, setWinCondition] = useState('REACH_FINISH');
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    
    useEffect(() => {
        if (isSaveModalOpen) {
            setSaveTitle(currentChallengeData?.title || '');
            setSaveDesc(currentChallengeData?.description || '');
        }
    }, [isSaveModalOpen, currentChallengeData]);

    const handleGenerateCode = () => {
        const id = editingChallengeId || `custom_${Date.now()}`;
        const code = `{
    id: '${id}',
    title: '${saveTitle || 'משימה חדשה'}',
    description: '${saveDesc || 'תיאור המשימה'}',
    difficulty: 'Medium',
    check: (start, end, history) => {
        // תנאי הצלחה: ${winCondition}
        if ('${winCondition}' === 'REACH_FINISH') return end.x > 14 && end.z < 0; 
        if ('${winCondition}' === 'DRIVE_DISTANCE') return history.maxDistanceMoved > 50;
        return history.maxDistanceMoved > 10;
    },
    startPosition: { x: ${robotPos?.x.toFixed(2) || 0}, y: 0, z: ${robotPos?.z.toFixed(2) || 0} },
    startRotation: ${robotPos?.rotation.toFixed(0) || 180},
    environmentObjects: ${JSON.stringify(customObjects, null, 8)}
},`;
        setGeneratedCode(code);
        setIsCodeModalOpen(true);
    };

    const [panelPos, setPanelPos] = useState({ x: 100, y: 20 });
    const [isDraggingPanel, setIsDraggingPanel] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const selectedObj = customObjects.find(o => o.id === selectedObjectId);

    const handlePanelMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setIsDraggingPanel(true);
        dragOffset.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingPanel) {
                setPanelPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
            }
        };
        const handleMouseUp = () => setIsDraggingPanel(false);
        if (isDraggingPanel) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingPanel]);

    if (!isVisible) return null;

    const PropertyRow = ({ label, value, onStep, onClick, suffix = "" }: { label: string, value: number, onStep: (delta: number) => void, onClick: () => void, suffix?: string }) => (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</label>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button onClick={() => onStep(-1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-400 hover:text-blue-500 transition-all active:scale-90"><MinusIcon size={14} strokeWidth={3} /></button>
                <button onClick={onClick} className="flex-1 text-center font-mono font-bold text-slate-700 text-sm py-1">{value.toFixed(1)}{suffix}</button>
                <button onClick={() => onStep(1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-400 hover:text-blue-500 transition-all active:scale-90"><Plus size={14} strokeWidth={3} /></button>
            </div>
        </div>
    );

    const ColorPickerRow = ({ current, onChange }: { current?: string, onChange: (c: string) => void }) => {
        const colors = [
            { name: 'אדום', value: '#ef4444' },
            { name: 'ירוק', value: '#22c55e' },
            { name: 'כחול', value: '#3b82f6' },
            { name: 'צהוב', value: '#facc15' },
            { name: 'מגנטה', value: '#d946ef' },
            { name: 'ציאן', value: '#06b6d4' },
            { name: 'לבן', value: '#ffffff' },
            { name: 'שחור', value: '#1f2937' },
            { name: 'כתום', value: '#f97316' },
            { name: 'סגול', value: '#8b5cf6' }
        ];
        return (
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">צבע אובייקט</label>
                <div className="grid grid-cols-5 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {colors.map(c => (
                        <button
                            key={c.value}
                            onClick={() => onChange(c.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-125 active:scale-90 shadow-sm ${current?.toLowerCase() === c.value.toLowerCase() ? 'border-blue-500 scale-110 ring-2 ring-blue-200' : 'border-white'}`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="absolute top-4 left-4 z-20 flex flex-row items-start gap-4" dir="rtl">
                <div className="bg-white/95 rounded-2xl shadow-2xl p-2 border-2 border-slate-200 flex flex-col gap-1 backdrop-blur-sm">
                    <div className="flex justify-between items-center px-2 pt-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">בנאי</p>
                        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={14}/></button>
                    </div>
                    <button onClick={() => onSelectTool('ROTATE')} className={`p-3 rounded-xl transition-all ${selectedTool === 'ROTATE' ? 'bg-blue-600 text-white shadow-lg scale-110' : 'text-slate-500 hover:bg-slate-100'}`} title="סיבוב מצלמה"><Move size={20} /></button>
                    <button onClick={() => onSelectTool('PAN')} className={`p-3 rounded-xl transition-all ${selectedTool === 'PAN' ? 'bg-blue-600 text-white shadow-lg scale-110' : 'text-slate-500 hover:bg-slate-100'}`} title="הנעה אופקית"><Hand size={20} /></button>
                    <div className="h-px bg-slate-200 my-1 mx-2" />
                    <button onClick={() => onSelectTool('ROBOT_MOVE')} className={`p-3 rounded-xl transition-all ${selectedTool === 'ROBOT_MOVE' ? 'bg-blue-600 text-white shadow-lg scale-110' : 'text-slate-500 hover:bg-slate-100'}`} title="מיקום רובוט"><Bot size={20} /></button>
                    <div className="h-px bg-slate-200 my-1 mx-2" />
                    <button onClick={() => onSelectTool('WALL')} className={`p-3 rounded-xl transition-all ${selectedTool === 'WALL' ? 'bg-orange-500 text-white shadow-lg scale-110' : 'text-slate-500 hover:bg-slate-100'}`} title="מכשול / קיר"><Square size={20} /></button>
                    <button onClick={() => onSelectTool('RAMP')} className={`p-3 rounded-xl transition-all ${selectedTool === 'RAMP' ? 'bg-orange-500 text-white shadow-lg scale-110' : 'text-slate-500 hover:bg-slate-100'}`} title="רמפה / מדרון"><Mountain size={20} /></button>
                    <button onClick={() => onSelectTool('COLOR_LINE')} className={`p-3 rounded-xl transition-all ${selectedTool === 'COLOR_LINE' ? 'bg-orange-500 text-white shadow-lg scale-110' : 'text-slate-500 hover:bg-slate-100'}`} title="פס צבע"><Palette size={20} /></button>
                    <button onClick={() => onSelectTool('PATH')} className={`p-3 rounded-xl transition-all ${selectedTool === 'PATH' ? 'bg-orange-500 text-white shadow-lg scale-110' : 'text-slate-500 hover:bg-slate-100'}`} title="כביש (לחץ לבחירת צורה)"><MapIcon size={20} /></button>
                    <div className="h-px bg-slate-200 my-1 mx-2" />
                    <button 
                        onClick={() => setIsSaveModalOpen(true)} 
                        className={`p-3 rounded-xl transition-all shadow-md active:scale-95 ${editingChallengeId ? 'bg-green-600 text-white hover:bg-green-500' : 'text-green-600 hover:bg-green-50'}`} 
                        title={editingChallengeId ? "עדכן משימה קיימת" : "שמור כמשימה חדשה"}
                    >
                        {editingChallengeId ? <Check size={20} strokeWidth={3} /> : <Save size={20} />}
                    </button>
                    <button onClick={handleGenerateCode} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="הפק קוד למפתח (שמירה קבועה)"><Code size={20} /></button>
                    <button onClick={onUndo} className="p-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="בטל פעולה"><Undo size={20} /></button>
                    <button onClick={onClearAll} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="נקה הכל"><Trash2 size={20} /></button>
                </div>
                {selectedTool === 'PATH' && (
                    <div className="bg-white/95 rounded-2xl shadow-xl p-2 border-2 border-slate-200 flex flex-col gap-1 backdrop-blur-sm animate-in fade-in slide-in-from-right-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase text-center mb-1">צורה</p>
                        <button onClick={() => onSelectPathShape('STRAIGHT')} className={`p-2.5 rounded-lg transition-all ${selectedPathShape === 'STRAIGHT' ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`} title="מסלול ישר"><Minus size={20} /></button>
                        <button onClick={() => onSelectPathShape('CORNER')} className={`p-2.5 rounded-lg transition-all ${selectedPathShape === 'CORNER' ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`} title="פנייה 90°"><CornerDownRight size={20} /></button>
                        <button onClick={() => onSelectPathShape('CURVED')} className={`p-2.5 rounded-lg transition-all ${selectedPathShape === 'CURVED' ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`} title="עיקול (קשת)"><MoveUpRight size={20} /></button>
                    </div>
                )}
            </div>
            {selectedObjectId && selectedObj && (
                <div className="fixed z-50 bg-white/95 rounded-2xl shadow-2xl border-2 border-slate-200 w-72 overflow-hidden backdrop-blur-md animate-in slide-in-from-left duration-200 select-none" dir="rtl" style={{ left: panelPos.x, top: panelPos.y }}>
                    <div onMouseDown={handlePanelMouseDown} className="bg-slate-100 px-3 py-2 flex justify-between items-center cursor-grab active:cursor-grabbing border-b">
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-xs"><GripHorizontal size={14} className="text-slate-400" />מאפייני אובייקט</div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onPropertyChange({ id: 'DELETE' })} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="מחק אובייקט"><Trash2 size={16}/></button>
                            <div className="w-px h-4 bg-slate-200 mx-1" /><button onClick={onDeselect} className="text-slate-400 hover:text-slate-800 transition-colors p-1" title="סגור חלונית"><X size={18} strokeWidth={3} /></button>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <PropertyRow label="מיקום X" value={selectedObj.x} onStep={(d) => onPropertyChange({ x: selectedObj.x + d * 1.0 })} onClick={() => onOpenNumpad(selectedObj.x, (val) => onPropertyChange({ x: val }))} />
                            <PropertyRow label="מיקום Z" value={selectedObj.z} onStep={(d) => onPropertyChange({ z: selectedObj.z + d * 1.0 })} onClick={() => onOpenNumpad(selectedObj.z, (val) => onPropertyChange({ z: val }))} />
                        </div>
                        <PropertyRow label="סיבוב (מעלות)" value={(selectedObj.rotation || 0) * (180/Math.PI)} onStep={(d) => onPropertyChange({ rotation: (selectedObj.rotation || 0) + (d * 1 * (Math.PI/180)) })} onClick={() => onOpenNumpad((selectedObj.rotation || 0) * (180/Math.PI), (val) => onPropertyChange({ rotation: val * (Math.PI/180) }))} suffix="°" />
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <PropertyRow label="רוחב (Width)" value={selectedObj.width} onStep={(d) => onPropertyChange({ width: Math.max(0.1, selectedObj.width + d * 1.0) })} onClick={() => onOpenNumpad(selectedObj.width, (val) => onPropertyChange({ width: val }))} />
                            <PropertyRow label="אורך (Length)" value={selectedObj.length} onStep={(d) => onPropertyChange({ length: Math.max(0.1, selectedObj.length + d * 1.0) })} onClick={() => onOpenNumpad(selectedObj.length, (val) => onPropertyChange({ length: val }))} />
                        </div>
                        {(selectedObj.type === 'RAMP' || selectedObj.height !== undefined) && (
                            <div className="pt-1">
                                <PropertyRow label="גובה (Height)" value={selectedObj.height || 0} onStep={(d) => onPropertyChange({ height: Math.max(0.01, (selectedObj.height || 0) + d * 1.0) })} onClick={() => onOpenNumpad(selectedObj.height || 0, (val) => onPropertyChange({ height: val }))} />
                            </div>
                        )}
                        
                        {(selectedObj.type === 'WALL' || selectedObj.type === 'COLOR_LINE' || selectedObj.type === 'PATH') && (
                            <ColorPickerRow current={selectedObj.color} onChange={(color) => onPropertyChange({ color })} />
                        )}
                    </div>
                </div>
            )}
            {isSaveModalOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border-4 border-orange-400">
                        <div className="p-6 border-b flex justify-between items-center bg-orange-50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Hammer className="text-orange-500" /> {editingChallengeId ? 'עדכון משימה' : 'שמירה כמשימת אתגר'}</h2>
                            <button onClick={() => setIsSaveModalOpen(false)} className="p-2 hover:bg-orange-100 rounded-full text-orange-400"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div><label className="block text-slate-600 font-bold mb-2">שם האתגר:</label><input type="text" value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 outline-none" placeholder="למשל: מסלול מכשולים מורכב" /></div>
                            <div><label className="block text-slate-600 font-bold mb-2">תיאור המשימה:</label><textarea value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 outline-none h-24 resize-none" placeholder="תאר מה הרובוט צריך לבצע..." /></div>
                            
                            <div>
                                <label className="block text-slate-600 font-bold mb-2 flex items-center gap-2"><Trophy size={16} className="text-yellow-500" /> תנאי ניצחון:</label>
                                <select 
                                    value={winCondition} 
                                    onChange={(e) => setWinCondition(e.target.value)}
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-orange-500 bg-white font-bold text-slate-700"
                                >
                                    <option value="REACH_FINISH">הגעה לקו סיום (ימין למעלה)</option>
                                    <option value="DRIVE_DISTANCE">נסיעה של 5 מטרים</option>
                                    <option value="TOUCH_ANY">נגיעה במכשול כלשהו</option>
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all">ביטול</button>
                                <button onClick={() => { if(saveTitle.trim()) { onSaveChallenge(saveTitle, saveDesc, winCondition); setIsSaveModalOpen(false); } }} disabled={!saveTitle.trim()} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${saveTitle.trim() ? 'bg-orange-500 hover:bg-orange-400' : 'bg-slate-300'}`}>{editingChallengeId ? 'עדכן עכשיו' : 'שמור אתגר'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isCodeModalOpen && (
                <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" dir="rtl">
                    <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border-4 border-indigo-500 animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-3"><Code /> קוד המשימה להטמעה קבועה</h2>
                            <button onClick={() => setIsCodeModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-slate-300 text-sm">העתק את הקוד הבא ושלח אותו למפתח (או הדבק אותו בצ'אט איתי) כדי שהמשימה תהיה חלק קבוע מהאפליקציה:</p>
                            <div className="bg-black/50 p-4 rounded-2xl border border-slate-700 max-h-80 overflow-y-auto">
                                <pre className="text-xs font-mono text-indigo-300 whitespace-pre-wrap text-left" dir="ltr">{generatedCode}</pre>
                            </div>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(generatedCode); alert('הקוד הועתק!'); }} 
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
                            >
                                העתק קוד ללוח
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};