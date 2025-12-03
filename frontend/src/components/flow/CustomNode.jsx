import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Box } from 'lucide-react';
import { cn } from '../../lib/utils';
import useModuleStore from '../../store/useModuleStore';

const CustomNode = ({ data, selected }) => {
  // Subscribe to modules to get real-time updates for User Modules
  const modules = useModuleStore((state) => state.modules);
  
  // Determine source of inputs/outputs
  // If referenceId exists, this is an instance of another module -> get live inputs/outputs
  // Otherwise, use static data (for Primitives like Math, or the Input/Output definition nodes)
  const refModule = data.referenceId ? modules[data.referenceId] : null;
  
  const inputs = refModule ? refModule.inputs : data.inputs;
  const outputs = refModule ? refModule.outputs : data.outputs;
  const label = refModule ? refModule.name : data.label;

  return (
    <div 
      className={cn(
        "blueprint-node min-w-[180px] flex flex-col",
        selected && "ring-2 ring-primary"
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border rounded-t-lg flex items-center gap-2">
        <div className="p-1 rounded bg-primary/10 text-primary">
          {data.icon || <Box size={14} />}
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/90 truncate max-w-[140px]">
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-3 relative">
        {/* Inputs (Left Side) */}
        <div className="flex flex-col gap-3">
          {inputs?.map((input, index) => (
            <div key={input.id || index} className="relative flex items-center h-5">
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                className="!w-3 !h-3 !bg-secondary !border-background -ml-[18px]"
              />
              <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                {input.label} <span className="text-secondary/70 opacity-75">({input.type})</span>
              </span>
            </div>
          ))}
        </div>

        {/* Divider if both exist */}
        {inputs?.length > 0 && outputs?.length > 0 && (
          <div className="h-px bg-border/50 w-full" />
        )}

        {/* Outputs (Right Side) */}
        <div className="flex flex-col gap-3 items-end">
          {outputs?.map((output, index) => (
            <div key={output.id || index} className="relative flex items-center justify-end h-5">
              <span className="text-[10px] text-muted-foreground mr-1 font-mono text-right">
                <span className="text-accent/70 opacity-75">({output.type})</span> {output.label}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                className="!w-3 !h-3 !bg-accent !border-background -mr-[18px]"
              />
            </div>
          ))}
        </div>

        {/* Empty State for User Module with no IO */}
        {refModule && inputs?.length === 0 && outputs?.length === 0 && (
            <div className="text-[10px] text-muted-foreground italic text-center py-2">
                No Inputs/Outputs defined. <br/> Edit module to add them.
            </div>
        )}
      </div>
      
      {/* Status Indicator */}
      <div className="h-1 w-full bg-primary/20 rounded-b-lg overflow-hidden">
         <div className="h-full w-full bg-primary/50" />
      </div>
    </div>
  );
};

export default memo(CustomNode);
