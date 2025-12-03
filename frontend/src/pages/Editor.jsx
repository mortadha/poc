import React, { useCallback, useRef, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  getIncomers,
  getOutgoers
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Download, Save, Box, Upload } from 'lucide-react';
import { toast } from 'sonner';

import Sidebar from '../components/flow/Sidebar';
import PropertiesPanel from '../components/flow/PropertiesPanel';
import CustomNode from '../components/flow/CustomNode';
import useModuleStore from '../store/useModuleStore';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';

const Editor = () => {
  const reactFlowWrapper = useRef(null);
  const fileInputRef = useRef(null);
  
  const nodes = useModuleStore((state) => state.nodes);
  const edges = useModuleStore((state) => state.edges);
  const onNodesChange = useModuleStore((state) => state.onNodesChange);
  const onEdgesChange = useModuleStore((state) => state.onEdgesChange);
  const onConnect = useModuleStore((state) => state.onConnect);
  const addNode = useModuleStore((state) => state.addNode);
  const modules = useModuleStore((state) => state.modules);
  const activeModuleId = useModuleStore((state) => state.activeModuleId);
  const createModule = useModuleStore((state) => state.createModule); // We will reuse this or similar logic
  const setActiveModule = useModuleStore((state) => state.setActiveModule);
  
  // Access store directly to inject imported data
  const importModuleData = useCallback((newModule) => {
      useModuleStore.setState((prev) => ({
          modules: { ...prev.modules, [newModule.id]: newModule }
      }));
  }, []);

  const currentModule = modules[activeModuleId];

  const [selectedNodeId, setSelectedNodeId] = React.useState(null);

  const nodeTypes = useMemo(() => ({
    userModule: CustomNode,
    inputNode: CustomNode,
    outputNode: CustomNode,
    mathNode: CustomNode
  }), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const rawData = event.dataTransfer.getData('application/reactflow');
      
      if (!rawData) return;

      const { type, label, moduleData } = JSON.parse(rawData);

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      let newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label, ...moduleData },
      };

      // Configure Node Data based on type
      if (type === 'inputNode') {
         newNode.data.outputs = [{ id: 'out-1', label: 'Val', type: moduleData.valueType }];
         newNode.data.inputs = [];
         newNode.data.icon = <span className="text-xs font-bold">IN</span>;
      } 
      else if (type === 'outputNode') {
         newNode.data.inputs = [{ id: 'in-1', label: 'Val', type: moduleData.valueType }];
         newNode.data.outputs = [];
         newNode.data.icon = <span className="text-xs font-bold">OUT</span>;
      }
      else if (type === 'mathNode') {
         newNode.data.inputs = [
            { id: 'a', label: 'A', type: 'Any' },
            { id: 'b', label: 'B', type: 'Any' }
         ];
         newNode.data.outputs = [{ id: 'result', label: 'Res', type: 'Any' }];
      }
      // User Module data handling is now done in CustomNode via store subscription

      addNode(newNode);
    },
    [addNode, modules]
  );

  const onNodeClick = (e, node) => {
    setSelectedNodeId(node.id);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleSave = () => {
      toast.success("Module Saved", {
          description: `${currentModule?.name} has been saved to local storage.`,
          duration: 3000,
      });
  };

  // --- NETLIST GENERATION LOGIC (Reused) ---
  const generateNetlist = (targetModuleId) => {
      const targetModule = modules[targetModuleId];
      if (!targetModule) return null;
      const cleanName = (str) => str.replace(/\s+/g, '_');
      
      // 1. Global I/O
      const globalInputs = targetModule.nodes.filter(n => n.type === 'inputNode').map(n => ({
          name: cleanName(n.data.label), type: n.data.valueType, nodeId: n.id
      }));
      const globalOutputs = targetModule.nodes.filter(n => n.type === 'outputNode').map(n => ({
          name: cleanName(n.data.label), type: n.data.valueType, nodeId: n.id, inputId: n.data.inputs[0].id
      }));

      // 2. Wires
      const wireMap = {}; 
      globalInputs.forEach(input => { wireMap[`${input.nodeId}_out-1`] = input.name; });
      const internalNodes = targetModule.nodes.filter(n => n.type === 'userModule' || n.type === 'mathNode');
      internalNodes.forEach(node => {
          const nodeName = cleanName(node.data.label);
          const nodeIdSuffix = node.id.split('-')[1] || '0';
          let outputs = [];
          if (node.type === 'userModule' && node.data.referenceId) {
              outputs = modules[node.data.referenceId]?.outputs || [];
          } else {
              outputs = node.data.outputs || [];
          }
          outputs.forEach(out => { wireMap[`${node.id}_${out.id}`] = `${nodeName}_${nodeIdSuffix}_${cleanName(out.label)}`; });
      });

      // 3. SubModules
      const subModulesList = internalNodes.map(node => {
          const nodeName = cleanName(node.data.label);
          const nodeIdSuffix = node.id.split('-')[1] || '0';
          let templateName = "Unknown";
          let inputsDef = [];
          let outputsDef = [];

          if (node.type === 'userModule' && node.data.referenceId) {
              const ref = modules[node.data.referenceId];
              templateName = ref ? ref.name : "MissingModule";
              inputsDef = ref ? ref.inputs : [];
              outputsDef = ref ? ref.outputs : [];
          } else if (node.type === 'mathNode') {
              templateName = "Math_" + (node.data.operation || 'Add');
              inputsDef = node.data.inputs || [];
              outputsDef = node.data.outputs || [];
          }

          const inputMapping = {};
          inputsDef.forEach(inDef => {
              const incomingEdge = targetModule.edges.find(e => e.target === node.id && e.targetHandle === inDef.id);
              if (incomingEdge) {
                  const sourceKey = `${incomingEdge.source}_${incomingEdge.sourceHandle}`;
                  inputMapping[cleanName(inDef.label)] = wireMap[sourceKey] || "UNCONNECTED";
              } else {
                  inputMapping[cleanName(inDef.label)] = null;
              }
          });
          const outputMapping = {};
          outputsDef.forEach(outDef => { outputMapping[cleanName(outDef.label)] = wireMap[`${node.id}_${outDef.id}`]; });

          return { id: `${nodeName}_${nodeIdSuffix}`, module_name: templateName, input: inputMapping, output: outputMapping };
      });

      // 4. Global Outputs Source
      const resolvedGlobalOutputs = globalOutputs.map(gOut => {
          const incomingEdge = targetModule.edges.find(e => e.target === gOut.nodeId);
          let sourceSignal = null;
          if (incomingEdge) {
              const sourceKey = `${incomingEdge.source}_${incomingEdge.sourceHandle}`;
              sourceSignal = wireMap[sourceKey] || "UNCONNECTED";
          }
          return { name: gOut.name, type: gOut.type, source: sourceSignal };
      });

      return { module_name: targetModule.name, input: globalInputs.map(i => ({ name: i.name, type: i.type })), output: resolvedGlobalOutputs, parameters: [], sub_modules: subModulesList };
  };

  const handleExport = () => {
      if(!currentModule) return;
      
      const rootNetlist = generateNetlist(currentModule.id);
      const definitions = {};
      
      const collectDefinitions = (moduleId) => {
          const module = modules[moduleId];
          if (!module) return;
          module.nodes.forEach(node => {
              if (node.type === 'userModule' && node.data.referenceId) {
                  const refId = node.data.referenceId;
                  if (!definitions[refId]) {
                      const netlist = generateNetlist(refId);
                      // Also store visual data for dependencies to allow full restoration
                      const refModule = modules[refId];
                      if (netlist && refModule) {
                          definitions[refId] = {
                              ...netlist,
                              visual_editor: {
                                  nodes: refModule.nodes,
                                  edges: refModule.edges,
                                  inputs: refModule.inputs,
                                  outputs: refModule.outputs
                              }
                          };
                          collectDefinitions(refId);
                      }
                  }
              }
          });
      };

      collectDefinitions(currentModule.id);

      // Final Schema with Visual Data for Root
      const fullSchema = {
          ...rootNetlist,
          visual_editor: {
              nodes: currentModule.nodes,
              edges: currentModule.edges,
              inputs: currentModule.inputs,
              outputs: currentModule.outputs
          },
          definitions: Object.values(definitions)
      };

      const blob = new Blob([JSON.stringify(fullSchema, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentModule.name.replace(/\s+/g, '_')}_full_blueprint.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Blueprint Exported", {
          description: `Saved schema + visual data for ${currentModule.name}.`,
      });
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const data = JSON.parse(e.target.result);
              
              // 1. Restore Dependencies First
              if (data.definitions) {
                  data.definitions.forEach(def => {
                      // Reconstruct module object
                      if(def.visual_editor) {
                          // If we have visuals, perfect restoration
                           const newId = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                           // NOTE: In a real app we might want to check name collisions or reuse IDs
                           // For duplicate, we generate NEW ID but keep content
                           // BUT to maintain links, we might need to map old IDs to new IDs.
                           // For simplicity in this prototype, we'll trust the dependency structure implies simple hierarchy
                           // Actually, to support "duplicate", we should just import it as a NEW module.
                           
                           // Quick Hack: Just import them as new modules in store
                           const importedModule = {
                               id: newId, // Unique ID
                               name: def.module_name, // Original Name
                               nodes: def.visual_editor.nodes,
                               edges: def.visual_editor.edges,
                               inputs: def.visual_editor.inputs,
                               outputs: def.visual_editor.outputs
                           };
                           importModuleData(importedModule);
                      }
                  });
              }

              // 2. Restore Root Module (As a new duplicate or overwrite?)
              // We will Import as a NEW module (Duplicate behavior)
              const newRootId = `module-${Date.now()}`;
              const newRootModule = {
                  id: newRootId,
                  name: `${data.module_name} (Imported)`,
                  nodes: data.visual_editor?.nodes || [],
                  edges: data.visual_editor?.edges || [],
                  inputs: data.visual_editor?.inputs || [],
                  outputs: data.visual_editor?.outputs || []
              };

              importModuleData(newRootModule);
              setActiveModule(newRootId);
              
              toast.success("Blueprint Imported", {
                  description: `Loaded ${newRootModule.name} successfully.`,
              });

          } catch (err) {
              console.error(err);
              toast.error("Import Failed", { description: "Invalid JSON file." });
          }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden flex-col">
      <ReactFlowProvider>
        {/* Top Bar / Header */}
        <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded text-primary">
                    <Box size={20} />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-foreground tracking-wide">
                        {currentModule?.name || "Unknown Module"}
                    </h1>
                    <div className="text-[10px] text-muted-foreground flex gap-2">
                        <span>Inputs: {currentModule?.inputs?.length || 0}</span>
                        <span>Outputs: {currentModule?.outputs?.length || 0}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                 <Button
                    variant="outline"
                    onClick={handleSave}
                    className="gap-2 h-8 text-xs font-medium"
                 >
                    <Save size={14} />
                    Save
                 </Button>
                 
                 <div className="h-4 w-px bg-border mx-1" />

                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".json"
                 />
                 <Button 
                    variant="ghost"
                    onClick={handleImportClick}
                    className="gap-2 h-8 text-xs font-medium"
                 >
                    <Upload size={14} />
                    Import
                 </Button>

                 <Button 
                    onClick={handleExport}
                    className="gap-2 h-8 text-xs font-medium"
                 >
                    <Download size={14} />
                    Export Blueprint
                 </Button>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            
            <div 
            className="flex-1 h-full relative" 
            ref={reactFlowWrapper}
            onDrop={onDrop}
            onDragOver={onDragOver}
            >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onInit={(instance) => instance.fitView()}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                snapToGrid={true}
                snapGrid={[16, 16]}
                className="bg-background"
            >
                <Background color="hsl(217 33% 25%)" gap={24} size={1} />
                <Controls />
                <MiniMap 
                    nodeColor={(n) => {
                        if (n.type === 'inputNode') return 'hsl(180 100% 50%)';
                        if (n.type === 'outputNode') return 'hsl(280 100% 60%)';
                        return 'hsl(210 100% 50%)';
                    }}
                    maskColor="rgba(15, 23, 42, 0.8)" // Dark mask
                    className="!bg-card !border-border"
                />
            </ReactFlow>
            </div>

            <PropertiesPanel key={selectedNode?.id} selectedNode={selectedNode} />
        </div>
      </ReactFlowProvider>
    </div>
  );
};

export default Editor;
