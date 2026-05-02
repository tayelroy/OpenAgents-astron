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
import { Play } from 'lucide-react';
import StarfieldCanvas from '@/sections/StarfieldCanvas';
import LiquidGlassButton from '@/components/LiquidGlassButton';

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
    <div
      className="relative overflow-hidden text-white"
      style={{ width: '100vw', height: '100vh', background: '#02030A' }}
    >
      {/* Starfield */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <StarfieldCanvas />
      </div>

      {/* Top Navbar overlay for actions */}
      <div
        className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 border-b border-white/10"
        style={{
          background: 'rgba(2, 3, 10, 0.75)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Astron Studio
        </h1>

        <LiquidGlassButton
          type="button"
          onClick={handleDeploy}
          className="inline-flex"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Play className="w-4 h-4" style={{ color: '#00E676' }} />
            <span style={{ color: '#ffffff' }}>Deploy</span>
          </span>
        </LiquidGlassButton>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        colorMode="dark"
        className="bg-[#02030A]"
        style={{ position: 'relative', zIndex: 2 }}
      >
        <Controls
          className="border border-white/10 bg-[#0B1220]/50"
        />
        <MiniMap
          nodeStrokeColor="#00B0FF"
          nodeColor="#0B1220"
          maskColor="rgba(2,3,10,0.8)"
          className="bg-[#0B1220]/60"
        />
        <Background gap={20} size={1} color="rgba(0,176,255,0.25)" />
      </ReactFlow>
    </div>
  );
}
