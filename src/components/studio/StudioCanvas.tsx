"use client";

import React, { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStudioStore } from '@/store/useStudioStore';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

const initialNodes: Node[] = [
  {
    id: '1',
    position: { x: 250, y: 250 },
    data: { label: 'Astron Default Node' },
    type: 'default',
  },
];

const initialEdges: Edge[] = [];

export function StudioCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { setNodes: setStoreNodes, setEdges: setStoreEdges } = useStudioStore();

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Sync with store
  useEffect(() => {
    setStoreNodes(nodes);
    setStoreEdges(edges);
  }, [nodes, edges, setStoreNodes, setStoreEdges]);

  const handleDeploy = () => {
    const currentState = useStudioStore.getState();
    console.log("=== DEPLOY PAYLOAD ===");
    console.log("Nodes:", currentState.nodes);
    console.log("Edges:", currentState.edges);
    alert("Canvas state logged to console!");
  };

  return (
    <div className="relative bg-black text-white" style={{ width: '100vw', height: '100vh' }}>
      {/* Top Navbar overlay for actions */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 border-b border-[#333333] bg-[#000000] bg-opacity-80 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-white">Astron Studio</h1>
        <Button onClick={handleDeploy} className="bg-[#0070F3] hover:bg-blue-600 text-white font-medium">
          <Play className="w-4 h-4 mr-2" />
          Deploy
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        colorMode="dark"
        className="bg-black"
      >
        <Controls className="bg-[#111111] border-[#333333] fill-white" />
        <MiniMap nodeStrokeColor="#333333" nodeColor="#222222" maskColor="rgba(0,0,0,0.8)" className="bg-[#111111]" />
        <Background gap={20} size={1} color="#333333" />
      </ReactFlow>
    </div>
  );
}
