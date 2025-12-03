import React, { useEffect, useState } from 'react';
import useModuleStore from '../../store/useModuleStore';
import { Settings, Trash2 } from 'lucide-react';

const PropertiesPanel = ({ selectedNode }) => {
  const updateNodeData = useModuleStore((state) => state.updateNodeData);
  const [label, setLabel] = useState('');
  const [valueType, setValueType] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setValueType(selectedNode.data.valueType || 'Integer');
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { label, valueType });
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-64 h-full bg-background border-l border-border p-6 flex flex-col items-center justify-center text-center text-muted-foreground">
        <Settings className="mb-4 opacity-20" size={48} />
        <p className="text-sm">Select a node to configure properties</p>
      </div>
    );
  }

  const isInputOutput = selectedNode.type === 'inputNode' || selectedNode.type === 'outputNode';

  return (
    <div className="w-64 h-full bg-background border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold tracking-tight text-primary mb-1">Properties</h2>
        <p className="text-xs text-muted-foreground">ID: {selectedNode.id}</p>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
                setLabel(e.target.value);
                updateNodeData(selectedNode.id, { label: e.target.value });
            }}
            className="w-full bg-card border border-border rounded p-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {isInputOutput && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Data Type</label>
            <select
              value={valueType}
              onChange={(e) => {
                setValueType(e.target.value);
                updateNodeData(selectedNode.id, { valueType: e.target.value });
              }}
              className="w-full bg-card border border-border rounded p-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="Integer">Integer</option>
              <option value="List<Int>">List of Integers</option>
              <option value="String">String</option>
              <option value="Boolean">Boolean</option>
            </select>
          </div>
        )}

        {selectedNode.type === 'userModule' && (
           <div className="p-3 bg-primary/10 rounded border border-primary/20 text-xs text-primary">
              This is an instance of a composite module. Edit the original module definition to change its inputs/outputs.
           </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
