import React, { useState } from 'react';
import { Box, Plus, Minus, ArrowRightFromLine, ArrowLeftFromLine, Component, Calculator } from 'lucide-react';
import useModuleStore from '../../store/useModuleStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const ModuleItem = ({ type, label, icon: Icon, moduleData }) => {
  const onDragStart = (event) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type, 
      label,
      moduleData // Pass reference ID for user modules
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-md bg-card border border-border cursor-grab hover:border-primary/50 hover:bg-muted/50 transition-all group"
      draggable
      onDragStart={onDragStart}
    >
      <div className="p-2 rounded bg-primary/10 text-primary group-hover:text-primary-foreground group-hover:bg-primary transition-colors">
        <Icon size={16} />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground">Drag to add</span>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const modules = useModuleStore((state) => state.modules);
  const activeModuleId = useModuleStore((state) => state.activeModuleId);
  const createModule = useModuleStore((state) => state.createModule);
  const setActiveModule = useModuleStore((state) => state.setActiveModule);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");

  // Filter out primitives (we hardcode them) and the current module (recursion check)
  const userModules = Object.values(modules).filter(m => m.id !== 'root' && m.id !== activeModuleId);

  const handleCreate = () => {
    if (newModuleName.trim()) {
      const id = createModule(newModuleName);
      setActiveModule(id);
      setNewModuleName("");
      setIsCreateOpen(false);
    }
  };

  return (
    <div className="w-64 h-full bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold tracking-tight text-primary mb-1">Module Lib</h2>
        <p className="text-xs text-muted-foreground">Drag modules to canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Primitives Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primitives</h3>
          
          <ModuleItem 
            type="inputNode" 
            label="Module Input" 
            icon={ArrowRightFromLine} 
            moduleData={{ valueType: 'List<Int>' }}
          />
          <ModuleItem 
            type="outputNode" 
            label="Module Output" 
            icon={ArrowLeftFromLine} 
            moduleData={{ valueType: 'List<Int>' }}
          />
           <ModuleItem 
            type="mathNode" 
            label="Math Operation" 
            icon={Calculator} 
            moduleData={{ operation: 'add' }}
          />
        </div>

        {/* User Modules Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
             <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Modules</h3>
             <button 
                onClick={() => setIsCreateOpen(true)}
                className="p-1 hover:bg-primary/20 rounded text-primary transition-colors"
             >
                <Plus size={14} />
             </button>
          </div>

          {userModules.length === 0 && (
            <div className="text-xs text-muted-foreground italic py-2">
              No other modules created.
            </div>
          )}

          {userModules.map(module => (
            <ModuleItem 
              key={module.id}
              type="userModule" 
              label={module.name} 
              icon={Component}
              moduleData={{ referenceId: module.id }}
            />
          ))}
        </div>
      </div>

      {/* Navigation / Active Module Switcher (Quick Hack for Prototype) */}
      <div className="p-4 border-t border-border bg-muted/10">
         <label className="text-xs text-muted-foreground block mb-2">Active Workspace:</label>
         <select 
            className="w-full bg-card border border-border text-sm rounded p-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            value={activeModuleId}
            onChange={(e) => setActiveModule(e.target.value)}
         >
            {Object.values(modules).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
            ))}
         </select>
      </div>

      {/* Create Module Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Create New Module</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                className="col-span-3 bg-background border-border focus:ring-primary"
                placeholder="e.g., Vector Processor"
                autoFocus
                onKeyDown={(e) => {
                    if(e.key === 'Enter') handleCreate();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sidebar;
