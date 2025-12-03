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

import Sidebar from '../components/flow/Sidebar';
import PropertiesPanel from '../components/flow/PropertiesPanel';
import CustomNode from '../components/flow/CustomNode';
import useModuleStore from '../store/useModuleStore';

const Editor = () => {
  const reactFlowWrapper = useRef(null);
  
  const nodes = useModuleStore((state) => state.nodes);
  const edges = useModuleStore((state) => state.edges);
  const onNodesChange = useModuleStore((state) => state.onNodesChange);
  const onEdgesChange = useModuleStore((state) => state.onEdgesChange);
  const onConnect = useModuleStore((state) => state.onConnect);
  const addNode = useModuleStore((state) => state.addNode);
  const modules = useModuleStore((state) => state.modules);

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
      else if (type === 'userModule') {
         // Load module definition to set handles
         const refModule = modules[moduleData.referenceId];
         if(refModule) {
            newNode.data.inputs = refModule.inputs;
            newNode.data.outputs = refModule.outputs;
         }
      }

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

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      <ReactFlowProvider>
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
      </ReactFlowProvider>
    </div>
  );
};

export default Editor;
