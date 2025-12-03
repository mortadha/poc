import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from 'reactflow';

// Initial mock modules
const initialModules = {
  'root': {
    id: 'root',
    name: 'Main Module',
    nodes: [],
    edges: [],
    inputs: [],
    outputs: []
  }
};

const useModuleStore = create((set, get) => ({
  modules: initialModules,
  activeModuleId: 'root',
  
  // React Flow State for the Active Module
  nodes: [],
  edges: [],

  // Actions
  setActiveModule: (moduleId) => {
    const module = get().modules[moduleId];
    if (module) {
      set({
        activeModuleId: moduleId,
        nodes: module.nodes || [],
        edges: module.edges || []
      });
    }
  },

  createModule: (name) => {
    const newId = `module-${Date.now()}`;
    const newModule = {
      id: newId,
      name,
      nodes: [],
      edges: [],
      inputs: [], // Defined by "Input" nodes inside this module
      outputs: [] // Defined by "Output" nodes inside this module
    };
    
    set((state) => ({
      modules: { ...state.modules, [newId]: newModule }
    }));
    return newId;
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
    get().syncModuleData();
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
    get().syncModuleData();
  },

  onConnect: (connection) => {
    set({
      edges: addEdge({ 
        ...connection, 
        type: 'smoothstep', 
        animated: true,
        style: { stroke: 'hsl(210 100% 50%)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(210 100% 50%)' }
      }, get().edges),
    });
    get().syncModuleData();
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
    get().syncModuleData();
  },

  deleteNode: (nodeId) => {
    set({ 
      nodes: get().nodes.filter(n => n.id !== nodeId),
      edges: get().edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    });
    get().syncModuleData();
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      }),
    });
    get().syncModuleData();
  },

  // Sync current nodes/edges back to the modules storage
  syncModuleData: () => {
    const { activeModuleId, nodes, edges, modules } = get();
    
    // Calculate dynamic inputs/outputs for the module based on special nodes
    // "Input" node -> Module Input
    // "Output" node -> Module Output
    const inputs = nodes
      .filter(n => n.type === 'inputNode')
      .map(n => ({ id: n.id, label: n.data.label, type: n.data.valueType }));
      
    const outputs = nodes
      .filter(n => n.type === 'outputNode')
      .map(n => ({ id: n.id, label: n.data.label, type: n.data.valueType }));

    set({
      modules: {
        ...modules,
        [activeModuleId]: {
          ...modules[activeModuleId],
          nodes,
          edges,
          inputs,
          outputs
        }
      }
    });
  },

  // Helper to get module definition for "userModule" nodes
  getModuleDefinition: (moduleId) => {
    return get().modules[moduleId];
  }
}));

export default useModuleStore;
