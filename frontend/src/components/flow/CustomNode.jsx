import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Box, GripHorizontal, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

const CustomNode = ({ data, selected }) => {
  // data.inputs = [{ id, label, type }]
  // data.outputs = [{ id, label, type }]
  // data.isPrimitive = true/false

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
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/90">
          {data.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-3 relative">
        {/* Inputs (Left Side) */}
        <div className="flex flex-col gap-3">
          {data.inputs?.map((input, index) => (
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
        {data.inputs?.length > 0 && data.outputs?.length > 0 && (
          <div className="h-px bg-border/50 w-full" />
        )}

        {/* Outputs (Right Side) */}
        <div className="flex flex-col gap-3 items-end">
          {data.outputs?.map((output, index) => (
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
      </div>
      
      {/* Status Indicator */}
      <div className="h-1 w-full bg-primary/20 rounded-b-lg overflow-hidden">
         <div className="h-full w-full bg-primary/50" />
      </div>
    </div>
  );
};

export default memo(CustomNode);
