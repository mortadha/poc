import React, { useState, useEffect } from 'react';
import useModuleStore from '../../store/useModuleStore';
import { Settings, Trash2, Plus, ArrowRightFromLine, ArrowLeftFromLine } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

const PropertiesPanel = ({ selectedNode }) => {
  const nodes = useModuleStore((state) => state.nodes);
  const addNode = useModuleStore((state) => state.addNode);
  const updateNodeData = useModuleStore((state) => state.updateNodeData);
  const deleteNode = useModuleStore((state) => state.deleteNode);
  const activeModuleId = useModuleStore((state) => state.activeModuleId);
  const modules = useModuleStore((state) => state.modules);
  
  const activeModule = modules[activeModuleId];

  // -- State for Selected Node Editing --
  const [label, setLabel] = useState('');
  const [valueType, setValueType] = useState('Integer');

  // Sync state when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data?.label || '');
      setValueType(selectedNode.data?.valueType || 'Integer');
    }
  }, [selectedNode]);

  const handleNodeSave = (newLabel, newValueType) => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { label: newLabel, valueType: newValueType });
    }
  };

  // -- Module Settings Actions --
  const handleAddInput = () => {
      const inputsCount = nodes.filter(n => n.type === 'inputNode').length;
      addNode({
          id: `input-${Date.now()}`,
          type: 'inputNode',
          position: { x: 50, y: 100 + (inputsCount * 80) },
          data: { 
              label: `Input ${inputsCount + 1}`, 
              valueType: 'Integer',
              icon: <span className="text-xs font-bold">IN</span>,
              outputs: [{ id: 'out-1', label: 'Val', type: 'Integer' }],
              inputs: []
          }
      });
  };

  const handleAddOutput = () => {
      const outputsCount = nodes.filter(n => n.type === 'outputNode').length;
      addNode({
          id: `output-${Date.now()}`,
          type: 'outputNode',
          position: { x: 500, y: 100 + (outputsCount * 80) },
          data: { 
              label: `Output ${outputsCount + 1}`, 
              valueType: 'Integer',
              icon: <span className="text-xs font-bold">OUT</span>,
              inputs: [{ id: 'in-1', label: 'Val', type: 'Integer' }],
              outputs: []
          }
      });
  };


  // RENDER: Module Configuration (No Node Selected)
  if (!selectedNode) {
    const inputs = nodes.filter(n => n.type === 'inputNode');
    const outputs = nodes.filter(n => n.type === 'outputNode');

    return (
      <div className="w-72 h-full bg-background border-l border-border flex flex-col shadow-xl z-10">
        <div className="p-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="text-primary" size={16} />
            <h2 className="text-sm font-bold tracking-wide text-foreground">Module Settings</h2>
          </div>
          <p className="text-xs text-muted-foreground truncate">{activeModule?.name || 'Global Configuration'}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Inputs Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Inputs</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/20" onClick={handleAddInput}>
                        <Plus size={14} />
                    </Button>
                </div>
                <div className="space-y-2">
                    {inputs.length === 0 && <p className="text-[10px] text-muted-foreground italic">No inputs defined</p>}
                    {inputs.map(node => (
                        <div key={node.id} className="flex items-center gap-2 bg-card border border-border p-2 rounded group">
                            <ArrowRightFromLine size={12} className="text-secondary shrink-0" />
                            <div className="flex-1 min-w-0">
                                <input 
                                    className="w-full bg-transparent text-xs text-foreground border-none p-0 focus:ring-0 h-auto"
                                    value={node.data.label}
                                    onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
                                />
                                <div className="text-[10px] text-muted-foreground">{node.data.valueType}</div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteNode(node.id)}
                            >
                                <Trash2 size={12} />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Outputs Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Outputs</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-accent hover:bg-accent/20" onClick={handleAddOutput}>
                        <Plus size={14} />
                    </Button>
                </div>
                <div className="space-y-2">
                    {outputs.length === 0 && <p className="text-[10px] text-muted-foreground italic">No outputs defined</p>}
                    {outputs.map(node => (
                        <div key={node.id} className="flex items-center gap-2 bg-card border border-border p-2 rounded group">
                            <ArrowLeftFromLine size={12} className="text-accent shrink-0" />
                            <div className="flex-1 min-w-0">
                                <input 
                                    className="w-full bg-transparent text-xs text-foreground border-none p-0 focus:ring-0 h-auto"
                                    value={node.data.label}
                                    onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
                                />
                                <div className="text-[10px] text-muted-foreground">{node.data.valueType}</div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteNode(node.id)}
                            >
                                <Trash2 size={12} />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // RENDER: Selected Node Properties
  const isInputOutput = selectedNode.type === 'inputNode' || selectedNode.type === 'outputNode';

  return (
    <div className="w-72 h-full bg-background border-l border-border flex flex-col shadow-xl z-10">
      <div className="p-4 border-b border-border bg-card/50">
        <h2 className="text-sm font-bold tracking-wide text-foreground mb-1">Node Properties</h2>
        <p className="text-xs text-muted-foreground font-mono truncate">ID: {selectedNode.id}</p>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
                const val = e.target.value;
                setLabel(val);
                handleNodeSave(val, valueType);
            }}
            className="w-full bg-card border border-border rounded p-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
          />
        </div>

        {isInputOutput && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Data Type</label>
            <select
              value={valueType}
              onChange={(e) => {
                const val = e.target.value;
                setValueType(val);
                handleNodeSave(label, val);
              }}
              className="w-full bg-card border border-border rounded p-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="Integer">Integer</option>
              <option value="List<Int>">List of Integers</option>
              <option value="String">String</option>
              <option value="Boolean">Boolean</option>
              <option value="Vector3">Vector3</option>
            </select>
          </div>
        )}

        {selectedNode.type === 'userModule' && (
           <div className="p-3 bg-primary/10 rounded border border-primary/20 text-xs text-primary leading-relaxed">
              This is an instance of a composite module. <br/>
              To change inputs/outputs, edit the <strong>{selectedNode.data.label}</strong> module directly.
           </div>
        )}

        <div className="pt-4 border-t border-border mt-auto">
            <Button 
                variant="destructive" 
                className="w-full gap-2"
                onClick={() => deleteNode(selectedNode.id)}
            >
                <Trash2 size={14} />
                Delete Node
            </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
