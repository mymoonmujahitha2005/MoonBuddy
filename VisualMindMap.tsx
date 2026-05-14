import React, { useMemo, useImperativeHandle, forwardRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  Handle,
  Position,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Loader2 } from 'lucide-react';

interface VisualMindMapProps {
  data: string;
  loading?: boolean;
}

export interface VisualMindMapRef {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const CustomNode = ({ data }: any) => {
  return (
    <div className="px-6 py-4 shadow-xl rounded-full bg-blue-600 text-white border-2 border-white/20 min-w-[120px] text-center font-bold text-sm">
      {data.label}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const MapInner = forwardRef<VisualMindMapRef, VisualMindMapProps>(({ data, loading }, ref) => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  useImperativeHandle(ref, () => ({
    resetView: () => {
      fitView({ duration: 800 });
    },
    zoomIn: () => {
      zoomIn({ duration: 400 });
    },
    zoomOut: () => {
      zoomOut({ duration: 400 });
    }
  }));

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const lines = data.split('\n').filter(l => l.trim().length > 0);
    const nodesMap = new Map<string, Node>();
    const edgesList: Edge[] = [];
    
    lines.forEach((line) => {
      const parts = line.split('>').map(p => p.trim());
      
      parts.forEach((part, index) => {
        if (!nodesMap.has(part)) {
          nodesMap.set(part, {
            id: part,
            type: 'custom',
            data: { label: part, level: index },
            position: { x: 0, y: 0 },
          });
        }
        
        if (index > 0) {
          const source = parts[index - 1];
          const target = part;
          const edgeId = `e-${source}-${target}`;
          
          if (!edgesList.find(e => e.id === edgeId)) {
            edgesList.push({
              id: edgeId,
              source,
              target,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#3b82f6', strokeWidth: 2 },
            });
          }
        }
      });
    });

    const nodeList = Array.from(nodesMap.values());
    const levels: { [key: number]: string[] } = {};
    nodeList.forEach(node => {
      const level = node.data.level || 0;
      if (!levels[level]) levels[level] = [];
      levels[level].push(node.id);
    });

    Object.keys(levels).forEach((levelStr) => {
      const level = parseInt(levelStr);
      const ids = levels[level];
      const width = ids.length * 250;
      ids.forEach((id, i) => {
        const node = nodesMap.get(id);
        if (node) {
          node.position = {
            x: (i * 300) - (width / 2) + 400,
            y: level * 150 + 50
          };
        }
      });
    });

    return { nodes: Array.from(nodesMap.values()), edges: edgesList };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10 absolute inset-0">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-slate-600">Regenerating map...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="flex h-full items-center justify-center text-slate-400">Processing mind map...</div>;

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      >
        <Background color="transparent" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
});

export const VisualMindMap = forwardRef<VisualMindMapRef, VisualMindMapProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <MapInner {...props} ref={ref} />
    </ReactFlowProvider>
  );
});
