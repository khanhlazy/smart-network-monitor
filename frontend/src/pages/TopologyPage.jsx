import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../services/api';
import { getSocket } from '../sockets';
import { Save, RefreshCw, Loader2, Server, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

const statusColors = {
  online: '#22C55E', // nms-green
  offline: '#EF4444', // nms-red
  warning: '#F59E0B', // nms-amber
  critical: '#EF4444', // nms-critical
  unknown: '#768497', // nms-text-muted
};

const CustomNode = ({ data }) => {
  const color = statusColors[data.status] || statusColors.unknown;
  return (
    <div className="px-4 py-2 shadow-lg rounded-lg border-2 bg-nms-surface-raised min-w-[150px]" style={{ borderColor: color }}>
      <div className="flex items-center gap-2 mb-1">
        <Server size={14} style={{ color }} />
        <div className="font-bold text-sm text-nms-text">{data.label}</div>
      </div>
      <div className="text-xs text-nms-text-muted">{data.ip}</div>
      <div className="text-[10px] text-nms-text-muted uppercase mt-1 opacity-70">{data.type}</div>
    </div>
  );
};

const nodeTypes = {
  device: CustomNode,
};

export default function TopologyPage() {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTopology = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/topology');
      
      const mappedNodes = res.data.data.nodes.map(n => ({
        id: n.id,
        type: 'device',
        position: n.position,
        data: n.data,
      }));
      
      const mappedEdges = res.data.data.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.animated,
        style: { stroke: '#3A4B5C', strokeWidth: 2 },
      }));

      // Apply some basic layout if everything is at 0,0 (just a fallback)
      if (mappedNodes.length > 0 && mappedNodes.every(n => n.position.x === 0 && n.position.y === 0)) {
         mappedNodes.forEach((n, i) => {
           n.position = { x: (i % 5) * 200 + 100, y: Math.floor(i / 5) * 150 + 100 };
         });
      }

      setNodes(mappedNodes);
      setEdges(mappedEdges);
    } catch (error) {
      console.error('Failed to load topology', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();

    const socket = getSocket();
    if (socket) {
      socket.emit('device:subscribe', {});
      socket.emit('topology:subscribe', {});
      socket.on('device:state.updated', (payload) => {
        const { deviceId, status } = payload.data;
        setNodes(nds => nds.map(node => {
          if (node.id === deviceId) {
            return { ...node, data: { ...node.data, status } };
          }
          return node;
        }));
      });
      socket.on('topology:updated', fetchTopology);
    }
    
    return () => {
      if (socket) {
        socket.off('device:state.updated');
        socket.off('topology:updated', fetchTopology);
      }
    };
  }, [setNodes]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3A4B5C', strokeWidth: 2 } }, eds)), [setEdges]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await Promise.all(edges.map(edge => api.post('/api/v1/topology/links', {
        sourceDeviceId: edge.source,
        targetDeviceId: edge.target,
        linkType: edge.type || 'default',
        status: 'active',
      }).catch(() => null)));
      // In a real app we'd save node positions too, but keeping it simple for edges right now
    } catch (error) {
      console.error('Failed to save topology', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4 animate-fade-in">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-page-title text-nms-text">{t('nav.topology', 'Bản đồ mạng')}</h1>
        <div className="flex gap-3">
          <button onClick={fetchTopology} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border hover:border-nms-brand text-sm text-nms-text-secondary hover:text-nms-text transition-all">
            <RefreshCw size={14} />
            {t('common.refresh', 'Làm mới')}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nms-brand hover:bg-blue-600 text-sm font-medium text-white disabled:opacity-50 transition-all shadow-lg shadow-nms-brand/20">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('common.save', 'Lưu thay đổi')}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-nms-bg border border-nms-border rounded-xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-nms-bg/50 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-nms-brand" />
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background color="#243244" gap={20} size={1} />
          <Controls className="bg-nms-surface border-nms-border !fill-nms-text-muted" />
          <MiniMap 
            nodeColor={(node) => statusColors[node.data?.status] || statusColors.unknown}
            maskColor="#0B0F14"
            className="bg-nms-surface border-nms-border"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
