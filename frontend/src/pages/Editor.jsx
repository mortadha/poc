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
import { Download, Save, Box } from 'lucide-react';
import { toast } from 'sonner';

import Sidebar from '../components/flow/Sidebar';
import PropertiesPanel from '../components/flow/PropertiesPanel';
import CustomNode from '../components/flow/CustomNode';
import useModuleStore from '../store/useModuleStore';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';

const Editor = () => {
  const reactFlowWrapper = useRef(null);
  
  const nodes = useModuleStore((state) => state.nodes);
  const edges = useModuleStore((state) => state.edges);
  const onNodesChange = useModuleStore((state) => state.onNodesChange);
  const onEdgesChange = useModuleStore((state) => state.onEdgesChange);
  const onConnect = useModuleStore((state) => state.onConnect);
  const addNode = useModuleStore((state) => state.addNode);
  const modules = useModuleStore((state) => state.modules);
  const activeModuleId = useModuleStore((state) => state.activeModuleId);
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

  // --- NETLIST GENERATION LOGIC ---
  const generateNetlist = (targetModuleId) => {
      const targetModule = modules[targetModuleId];
      if (!targetModule) return null;

      const cleanName = (str) => str.replace(/\s+/g, '_');
      
      // 1. Identify Global Inputs & Outputs
      const globalInputs = targetModule.nodes
          .filter(n => n.type === 'inputNode')
          .map(n => ({
              name: cleanName(n.data.label),
              type: n.data.valueType,
              nodeId: n.id
          }));

      const globalOutputs = targetModule.nodes
          .filter(n => n.type === 'outputNode')
          .map(n => ({
              name: cleanName(n.data.label),
              type: n.data.valueType,
              nodeId: n.id,
              inputId: n.data.inputs[0].id // The handle ID on this node that receives data
          }));

      // 2. Generate "Wire" names for every data source
      // Sources are: Global Inputs AND Outputs of Internal Nodes
      const wireMap = {}; // Key: `${NodeID}_${HandleID}` -> Value: WireName

      // A. Wires from Global Inputs
      globalInputs.forEach(input => {
          // For Input Nodes, the source handle is usually 'out-1' defined in CustomNode or handleAddInput
          // We need to match the handle ID from the node definition
          const sourceHandleId = 'out-1'; // Hardcoded standard for inputNode
          wireMap[`${input.nodeId}_${sourceHandleId}`] = input.name;
      });

      // B. Wires from Internal Nodes (SubModules/Math)
      const internalNodes = targetModule.nodes.filter(n => n.type === 'userModule' || n.type === 'mathNode');
      
      internalNodes.forEach(node => {
          const nodeName = cleanName(node.data.label);
          const nodeIdSuffix = node.id.split('-')[1] || '0';
          
          // Get outputs definition
          let outputs = [];
          if (node.type === 'userModule' && node.data.referenceId) {
              outputs = modules[node.data.referenceId]?.outputs || [];
          } else {
              outputs = node.data.outputs || [];
          }

          outputs.forEach(out => {
              // Wire Name = NodeName_NodeID_PortLabel
              const wireName = `${nodeName}_${nodeIdSuffix}_${cleanName(out.label)}`;
              wireMap[`${node.id}_${out.id}`] = wireName;
          });
      });

      // 3. Build SubModule Instances with Connections
      const subModulesList = internalNodes.map(node => {
          const nodeName = cleanName(node.data.label);
          const nodeIdSuffix = node.id.split('-')[1] || '0';
          
          // Determine Template Name
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

          // Map Inputs: Find edges connected TO this node's input handles
          const inputMapping = {};
          inputsDef.forEach(inDef => {
              // Find edge: target = node.id, targetHandle = inDef.id
              const incomingEdge = targetModule.edges.find(e => e.target === node.id && e.targetHandle === inDef.id);
              if (incomingEdge) {
                  // Find the wire name for the source of this edge
                  const sourceKey = `${incomingEdge.source}_${incomingEdge.sourceHandle}`;
                  inputMapping[cleanName(inDef.label)] = wireMap[sourceKey] || "UNCONNECTED";
              } else {
                  inputMapping[cleanName(inDef.label)] = null; // Unconnected
              }
          });

          // Map Outputs: Declare the wires this node drives
          const outputMapping = {};
          outputsDef.forEach(outDef => {
               const wireKey = `${node.id}_${outDef.id}`;
               outputMapping[cleanName(outDef.label)] = wireMap[wireKey];
          });

          return {
              id: `${nodeName}_${nodeIdSuffix}`,
              module_name: templateName,
              input: inputMapping,
              output: outputMapping
          };
      });

      // 4. Resolve Global Outputs Source
      const resolvedGlobalOutputs = globalOutputs.map(gOut => {
          // Find edge connecting TO the Output Node
          const incomingEdge = targetModule.edges.find(e => e.target === gOut.nodeId); // Output nodes usually have 1 input handle
          let sourceSignal = null;
          
          if (incomingEdge) {
              const sourceKey = `${incomingEdge.source}_${incomingEdge.sourceHandle}`;
              sourceSignal = wireMap[sourceKey] || "UNCONNECTED";
          }

          return {
              name: gOut.name,
              type: gOut.type,
              source: sourceSignal
          };
      });

      // 5. Construct Netlist Object
      return {
          module_name: targetModule.name,
          input: globalInputs.map(i => ({ name: i.name, type: i.type })),
          output: resolvedGlobalOutputs,
          parameters: [],
          sub_modules: subModulesList,
      };
  };

  const handleExport = () => {
      if(!currentModule) return;
      
      // Generate the Root Netlist
      const rootNetlist = generateNetlist(currentModule.id);
      
      // Recursively collect definitions for all used User Modules
      const definitions = {};
      
      const collectDefinitions = (moduleId) => {
          const module = modules[moduleId];
          if (!module) return;

          module.nodes.forEach(node => {
              if (node.type === 'userModule' && node.data.referenceId) {
                  const refId = node.data.referenceId;
                  
                  // Only process if not already collected
                  if (!definitions[refId]) {
                      const netlist = generateNetlist(refId);
                      if (netlist) {
                          definitions[refId] = netlist;
                          // Recurse
                          collectDefinitions(refId);
                      }
                  }
              }
          });
      };

      collectDefinitions(currentModule.id);

      // Assemble Final Schema
      const fullSchema = {
          ...rootNetlist,
          definitions: Object.values(definitions)
      };

      const blob = new Blob([JSON.stringify(fullSchema, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentModule.name.replace(/\s+/g, '_')}_full_schema.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const defCount = Object.keys(definitions).length;
      toast.success("Schema Exported", {
          description: `Exported ${currentModule.name} with ${defCount} dependency definitions.`,
      });
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
                 
                 <Button 
                    onClick={handleExport}
                    className="gap-2 h-8 text-xs font-medium"
                 >
                    <Download size={14} />
                    Export Schema
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
