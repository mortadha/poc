import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

const useModuleStore = create(
  persist(
    (set, get) => ({
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
          inputs: [], 
          outputs: [] 
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

      // Reset/Clear all data (useful for testing or reset)
      resetStore: () => {
          set({
              modules: initialModules,
              activeModuleId: 'root',
              nodes: [],
              edges: []
          });
      }
    }),
    {
      name: 'module-storage', // unique name
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ modules: state.modules }), // Only persist modules data
      onRehydrateStorage: () => (state) => {
         // hydrate nodes/edges from the active module after loading
         if(state && state.modules && state.activeModuleId) {
             const active = state.modules[state.activeModuleId] || state.modules['root'];
             if(active) {
                 // Set nodes and edges directly to avoid infinite loop
                 state.nodes = active.nodes || [];
                 state.edges = active.edges || [];
             }
         }
      }
    }
  )
);

export default useModuleStore;
