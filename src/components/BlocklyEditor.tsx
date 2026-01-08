
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
// Corrected import path. The original import was valid but due to reported error,
// explicitly listing all exports here ensures all exports from blocklySetup.ts are correctly resolved.
import { initBlockly, getScratchTheme, HAT_BLOCKS, toolbox } from '../services/blocklySetup';
import { X, Check, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';

interface BlocklyEditorProps {
  onCodeChange: (code: string, startBlockCount: number) => void;
  onEval?: (code: string) => Promise<any>;
  visibleVariables: Set<string>;
  onToggleVariable: (name: string) => void;
  onVariablesChanged?: (allVarNames: string[], renameInfo?: {oldName: string, newName: string}) => void;
  onShowNumpad: (initialValue: string | number, onConfirm: (newValue: number) => void) => void; // New prop
  onShowColorPicker: (onPick: (newColor: string) => void) => void; // New prop
}

export interface BlocklyEditorHandle {
  saveWorkspace: () => string | null;
  loadWorkspace: (xmlText: string) => void;
  getPythonCode: () => string;
}

const VariableModal = ({ isOpen, mode, initialValue, onClose, onConfirm }: { isOpen: boolean, mode: 'create' | 'rename', initialValue?: string, onClose: () => void, onConfirm: (name: string) => void }) => {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(mode === 'rename' ? (initialValue || '') : '');
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 100);
        }
    }, [isOpen, mode, initialValue]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-[2px]" onPointerDown={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-[12px] shadow-2xl w-full max-w-[480px] overflow-hidden border-[6px] border-[#4C97FF]/20 animate-in zoom-in duration-150" dir="ltr">
                <div className="bg-[#9966FF] p-3 flex justify-center items-center relative text-white">
                    <h2 className="text-xl font-bold tracking-tight">
                        {mode === 'rename' ? 'Rename Variable' : 'New Variable'}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="absolute right-3 p-1 hover:bg-black/10 rounded-full transition-colors flex items-center justify-center bg-white/20"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>
                
                <div className="p-8 bg-white">
                    <p className="text-[#575E75] font-medium mb-6 text-left text-lg">
                        {mode === 'rename' 
                            ? `Rename all "${initialValue}" variables to:` 
                            : 'New variable name:'}
                    </p>
                    
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
                        className="w-full p-3 border-2 border-[#9966FF] rounded-[8px] outline-none text-xl font-medium text-[#575E75] bg-white transition-shadow focus:shadow-[0_0_0_4px_rgba(153,102,255,0.15)]"
                    />
                    
                    <div className="mt-10 flex gap-3 justify-end">
                        <button 
                            onClick={onClose} 
                            className="px-6 py-2.5 rounded-[8px] font-bold text-[#575E75] bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => name.trim() && onConfirm(name.trim())} 
                            disabled={!name.trim()} 
                            className={`px-8 py-2.5 rounded-[8px] font-bold text-white shadow-md transition-all active:scale-95 ${name.trim() ? 'bg-[#9966FF] hover:bg-[#855CD6]' : 'bg-slate-300'}`}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const BlocklyEditor = forwardRef<BlocklyEditorHandle, BlocklyEditorProps>(({ onCodeChange, onEval, visibleVariables, onToggleVariable, onVariablesChanged, onShowNumpad, onShowColorPicker }, ref) => {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, mode: 'create' | 'rename', initialValue?: string, variableId?: string, onResult?: (res: string | null) => void}>({
      isOpen: false, mode: 'create'
  });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [variablePositions, setVariablePositions] = useState<{name: string, id: string, top: number, left: number}[]>([]);

  const generateAndNotify = useCallback(() => {
    const javascript = (window as any).javascript;
    if (!workspaceRef.current || !javascript) return;
    
    try {
        const code = javascript.javascriptGenerator.workspaceToCode(workspaceRef.current);
        const startBlockCount = workspaceRef.current.getTopBlocks(true).filter((b: any) => HAT_BLOCKS.includes(b.type)).length;
        onCodeChange(code, startBlockCount);
    } catch (e) {
        console.warn("Generation failed momentarily during block change", e);
    }
  }, [onCodeChange]);

  const updateCheckboxPositions = useCallback(() => {
    if (!workspaceRef.current) return;
    
    if (activeCategory !== 'Variables') {
        if (variablePositions.length > 0) setVariablePositions([]);
        return;
    }

    const flyout = workspaceRef.current.getFlyout();
    if (!flyout || !flyout.isVisible()) {
        if (variablePositions.length > 0) setVariablePositions([]);
        return;
    }

    const flyoutWorkspace = flyout.getWorkspace();
    const blocks = flyoutWorkspace.getTopBlocks();
    const newPositions: {name: string, id: string, top: number, left: number}[] = [];

    blocks.forEach((block: any) => {
      if (block.type === 'variables_get') {
        const varId = block.getFieldValue('VAR');
        const variable = flyoutWorkspace.getVariableById(varId) || workspaceRef.current.getVariableById(varId);
        const varName = variable ? variable.name : varId;
        
        const root = block.getSvgRoot();
        if (root) {
            const rect = root.getBoundingClientRect();
            newPositions.push({
                name: varName,
                id: varId,
                top: rect.top + (rect.height / 2),
                left: rect.right + 12
            });
        }
      }
    });

    setVariablePositions(newPositions);
  }, [activeCategory, variablePositions.length]);

  const notifyVariablesChange = useCallback((renameInfo?: {oldName: string, newName: string}) => {
    if (workspaceRef.current && onVariablesChanged) {
        const names = workspaceRef.current.getAllVariables().map((v: any) => v.name);
        onVariablesChanged(names, renameInfo);
    }
  }, [onVariablesChanged]);

  useImperativeHandle(ref, () => ({
    saveWorkspace: () => {
      const Blockly = (window as any).Blockly;
      if (!workspaceRef.current || !Blockly) return null;
      const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef.current);
      return Blockly.Xml.domToText(xmlDom);
    },
    loadWorkspace: (xmlText: string) => {
      const Blockly = (window as any).Blockly;
      if (!workspaceRef.current || !Blockly || !xmlText) return;
      try {
          let xml = Blockly.utils.xml.textToDom(xmlText);
          Blockly.Events.disable();
          workspaceRef.current.clear();
          Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
          Blockly.Events.enable();
          generateAndNotify();
          notifyVariablesChange();
      } catch (e) {
          console.error("Failed to load workspace", e);
      }
    },
    getPythonCode: () => {
        const python = (window as any).python;
        if (!workspaceRef.current || !python) return "# Python generator not loaded";
        try {
            return python.pythonGenerator.workspaceToCode(workspaceRef.current);
        } catch (e) {
            console.error("Python gen error", e);
            return "# Error generating Python code";
        }
    }
  }));

  useEffect(() => {
    const Blockly = (window as any).Blockly;
    const javascript = (window as any).javascript;
    const python = (window as any).python;
    if (!Blockly || !javascript || !python) return;

    // Expose these functions globally for Blockly to use, before initBlockly
    window.showBlocklyNumpad = onShowNumpad;
    window.showBlocklyColorPicker = onShowColorPicker;

    initBlockly();
    const scratchTheme = getScratchTheme();

    // Override Blockly dialogs to use our React Modal
    Blockly.dialog.setPrompt((message: string, defaultValue: string, callback: (res: string | null) => void) => {
        const isRename = message.toLowerCase().includes('rename');
        setModalConfig({
            isOpen: true,
            mode: isRename ? 'rename' : 'create',
            initialValue: defaultValue,
            onResult: callback
        });
    });

    if (blocklyDiv.current && !workspaceRef.current) {
      workspaceRef.current = Blockly.inject(blocklyDiv.current, {
        toolbox: toolbox,
        rtl: false, 
        scrollbars: true,
        renderer: 'zelos', 
        theme: scratchTheme, 
        zoom: { controls: true, wheel: true, startScale: 0.85 }, 
        trashcan: true,
      });

      workspaceRef.current.registerToolboxCategoryCallback('VARIABLE', (workspace: any) => {
        const xmlList = [];
        const button = document.createElement('button');
        button.setAttribute('text', 'Make a Variable');
        button.setAttribute('callbackKey', 'CREATE_VARIABLE');
        xmlList.push(button);

        const variableList = workspace.getAllVariables();
        variableList.forEach((v: any) => {
          const block = document.createElement('block');
          block.setAttribute('type', 'variables_get');
          block.setAttribute('gap', '8');
          const field = document.createElement('field');
          field.setAttribute('name', 'VAR');
          field.setAttribute('id', v.getId()); 
          field.innerText = v.name; 
          block.appendChild(field);
          xmlList.push(block);
        });

        if (variableList.length > 0) {
          xmlList[xmlList.length - 1].setAttribute('gap', '24');
          
          const setBlock = document.createElement('block');
          setBlock.setAttribute('type', 'variables_set');
          setBlock.setAttribute('gap', '8');
          const setField = document.createElement('field');
          setField.setAttribute('name', 'VAR');
          setField.setAttribute('id', variableList[0].getId());
          setField.innerText = variableList[0].name;
          setBlock.appendChild(setField);
          
          const setValue = document.createElement('value');
          setValue.setAttribute('name', 'VALUE');
          const setShadow = document.createElement('shadow');
          setShadow.setAttribute('type', 'math_number');
          const setNum = document.createElement('field');
          setNum.setAttribute('name', 'NUM');
          setNum.innerText = '0';
          setShadow.appendChild(setNum);
          setValue.appendChild(setShadow);
          setBlock.appendChild(setValue);
          xmlList.push(setBlock);

          const changeBlock = document.createElement('block');
          changeBlock.setAttribute('type', 'math_change');
          const changeField = document.createElement('field');
          changeField.setAttribute('name', 'VAR');
          changeField.setAttribute('id', variableList[0].getId());
          changeField.innerText = variableList[0].name;
          changeBlock.appendChild(changeField);
          
          const changeValue = document.createElement('value');
          changeValue.setAttribute('name', 'DELTA');
          const changeShadow = document.createElement('shadow');
          changeShadow.setAttribute('type', 'math_number');
          const changeNum = document.createElement('field');
          changeNum.setAttribute('name', 'NUM');
          changeNum.innerText = '1';
          setShadow.appendChild(changeNum);
          changeValue.appendChild(setShadow);
          changeBlock.appendChild(changeValue);
          xmlList.push(changeBlock);
        }
        return xmlList;
      });

      workspaceRef.current.registerButtonCallback('CREATE_VARIABLE', () => setModalConfig({ isOpen: true, mode: 'create' }));

      workspaceRef.current.addChangeListener((e: any) => {
        if (e.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
            setActiveCategory(e.newItem);
        }
        
        if (e.type === Blockly.Events.UI || e.type === Blockly.Events.VIEWPORT_CHANGE || e.type === Blockly.Events.MOVE) {
            updateCheckboxPositions();
        }

        if (e.type === Blockly.Events.VAR_CREATE || e.type === Blockly.Events.VAR_DELETE) {
            notifyVariablesChange();
        }

        if (e.type !== Blockly.Events.UI) {
            generateAndNotify();
        }
      });

      const flyout = workspaceRef.current.getFlyout();
      if (flyout && flyout.getWorkspace()) {
          flyout.getWorkspace().addChangeListener((e: any) => {
              if (e.type === Blockly.Events.VIEWPORT_CHANGE || e.type === Blockly.Events.MOVE) {
                  updateCheckboxPositions();
              }
          });
      }
    }
    
    const handleResize = () => { if(workspaceRef.current) Blockly.svgResize(workspaceRef.current); };
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        if (workspaceRef.current) workspaceRef.current.dispose();
        workspaceRef.current = null;
        // Clean up on unmount
        delete window.showBlocklyNumpad;
        delete window.showBlocklyColorPicker;
    };
  }, [generateAndNotify, notifyVariablesChange, onShowNumpad, onShowColorPicker]);

  useEffect(() => {
    const timer = setTimeout(updateCheckboxPositions, 50);
    return () => clearTimeout(timer);
  }, [activeCategory, updateCheckboxPositions]);

  return (
    <div className="w-full h-full relative">
      <div ref={blocklyDiv} className="absolute inset-0" />
      
      {/* Variable Action Overlay - Monitor Only */}
      {activeCategory === 'Variables' && variablePositions.map((pos) => (
          <div 
            key={pos.id}
            className="fixed z-[1000] pointer-events-auto flex flex-col items-start gap-1"
            style={{ 
                top: pos.top - 18, 
                left: pos.left,
            }}
            onPointerDown={(e) => e.stopPropagation()} 
          >
            {/* Monitor Toggle */}
            <div 
                onClick={() => onToggleVariable(pos.name)}
                className={`p-2 cursor-pointer bg-white shadow-md border rounded-xl transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${visibleVariables.has(pos.name) ? 'border-orange-400 text-orange-600' : 'border-slate-200 text-slate-400'}`}
                title={visibleVariables.has(pos.name) ? "Hide from Dashboard" : "Show on Dashboard"}
            >
                {visibleVariables.has(pos.name) ? <Eye size={18} /> : <EyeOff size={18} />}
            </div>
          </div>
      ))}

      <VariableModal 
        isOpen={modalConfig.isOpen} 
        mode={modalConfig.mode}
        initialValue={modalConfig.initialValue}
        onClose={() => {
            if (modalConfig.onResult) modalConfig.onResult(null);
            setModalConfig({ ...modalConfig, isOpen: false });
        }} 
        onConfirm={(name) => {
            if (modalConfig.onResult) {
                modalConfig.onResult(name);
            } else if (workspaceRef.current) {
                if (modalConfig.mode === 'create') {
                    workspaceRef.current.createVariable(name);
                } else if (modalConfig.variableId) {
                    const oldName = modalConfig.initialValue || "";
                    workspaceRef.current.renameVariableById(modalConfig.variableId, name);
                    const toolbox = workspaceRef.current.getToolbox();
                    if (toolbox) {
                        toolbox.refreshSelection();
                    }
                    notifyVariablesChange({ oldName, newName: name });
                }
            }
            setTimeout(() => {
                updateCheckboxPositions();
                if (modalConfig.mode === 'create' && !modalConfig.onResult) notifyVariablesChange();
            }, 100);
            setModalConfig({ ...modalConfig, isOpen: false });
        }} 
      />
    </div>
  );
});

export default BlocklyEditor;