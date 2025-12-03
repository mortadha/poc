import React, { useCallback, useRef, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Download, Save, Box } from 'lucide-react';

import Sidebar from '../components/flow/Sidebar';
import PropertiesPanel from '../components/flow/PropertiesPanel';
import CustomNode from '../components/flow/CustomNode';
import useModuleStore from '../store/useModuleStore';
import { cn } from '../lib/utils';

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

  const handleExport = () => {
      if(!currentModule) return;
      
      // Create a clean export object
      const exportData = {
          id: currentModule.id,
          name: currentModule.name,
          description: "Exported from Blueprint Editor",
          version: "1.0",
          configuration: {
              inputs: currentModule.inputs,
              outputs: currentModule.outputs,
              nodes: currentModule.nodes.map(n => ({
                  id: n.id,
                  type: n.type,
                  position: n.position,
                  data: n.data
              })),
              edges: currentModule.edges.map(e => ({
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  sourceHandle: e.sourceHandle,
                  targetHandle: e.targetHandle
              }))
          }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentModule.name.replace(/\s+/g, '_')}_config.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
                 <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-xs font-medium transition-colors"
                 >
                    <Download size={14} />
                    Save JSON
                 </button>
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
