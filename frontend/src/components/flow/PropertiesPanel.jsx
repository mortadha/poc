import React, { useState } from 'react';
import useModuleStore from '../../store/useModuleStore';
import { Settings } from 'lucide-react';

const PropertiesPanel = ({ selectedNode }) => {
  const updateNodeData = useModuleStore((state) => state.updateNodeData);
  
  // Initialize state from props (safe because we force re-mount on ID change via key in parent)
  const [label, setLabel] = useState(selectedNode?.data?.label || '');
  const [valueType, setValueType] = useState(selectedNode?.data?.valueType || 'Integer');

  const handleSave = (newLabel, newValueType) => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { label: newLabel, valueType: newValueType });
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
                const val = e.target.value;
                setLabel(val);
                handleSave(val, valueType);
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
                const val = e.target.value;
                setValueType(val);
                handleSave(label, val);
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
