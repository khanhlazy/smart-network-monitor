import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../services/api';
import { getSocket } from '../sockets';
import { Save, RefreshCw, Loader2, Server, LayoutTemplate } from 'lucide-react';
import dagre from 'dagre';

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

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 80 }); // Standardized node sizes
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };
    newNode.targetPosition = isHorizontal ? 'left' : 'top';
    newNode.sourcePosition = isHorizontal ? 'right' : 'bottom';
    
    newNode.position = {
      x: nodeWithPosition.x - 90,
      y: nodeWithPosition.y - 40,
    };
    return newNode;
  });

  return { nodes: newNodes, edges };
};

export default function TopologyPage() {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collectors, setCollectors] = useState([]);
  const [selectedCollector, setSelectedCollector] = useState('');

  const fetchCollectors = async () => {
    try {
      const res = await api.get('/api/v1/collectors');
      setCollectors(res.data.data || []);
    } catch (error) {
      console.error('Failed to load collectors', error);
    }
  };

  const fetchTopology = useCallback(async () => {
    try {
      setLoading(true);
      const url = selectedCollector ? `/api/v1/topology?collectorId=${selectedCollector}` : '/api/v1/topology';
      const res = await api.get(url);
      
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

      // Auto Layout check if nodes are placed at 0,0
      if (mappedNodes.length > 0 && mappedNodes.every(n => n.position.x === 0 && n.position.y === 0)) {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          mappedNodes,
          mappedEdges,
          'TB'
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
      } else {
        setNodes(mappedNodes);
        setEdges(mappedEdges);
      }
    } catch (error) {
      console.error('Failed to load topology', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCollector, setNodes, setEdges]);

  const onLayout = useCallback(
    (direction) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      
      // Hack to auto fit-view after layout runs
      setTimeout(() => {
        const fitViewBtn = document.querySelector('.react-flow__controls-fitview');
        if (fitViewBtn) fitViewBtn.click();
      }, 50);
    },
    [nodes, edges]
  );

  useEffect(() => {
    fetchCollectors();
  }, []);

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
  }, [fetchTopology, setNodes]); // Include fetchTopology as dependency

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3A4B5C', strokeWidth: 2 } }, eds)), [setEdges]);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Save Links
      await Promise.all(edges.map(edge => api.post('/api/v1/topology/links', {
        sourceDeviceId: edge.source,
        targetDeviceId: edge.target,
        linkType: edge.type || 'default',
        status: 'active',
      }).catch(() => null)));
      
      // Save Node Positions
      const nodePositions = nodes.map(n => ({
        id: n.id,
        position: n.position
      }));
      await api.post('/api/v1/topology/positions', { nodes: nodePositions });
      
    } catch (error) {
      console.error('Failed to save topology', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4 animate-fade-in">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-page-title text-nms-text">{t('nav.topology', 'Sơ đồ mạng')}</h1>
        <div className="flex gap-3 items-center">
          <select 
            value={selectedCollector} 
            onChange={(e) => setSelectedCollector(e.target.value)}
            className="bg-nms-surface border border-nms-border text-nms-text text-sm rounded-lg px-3 py-2 outline-none focus:border-nms-brand"
          >
            <option value="">{t('common.all', 'Tất cả')} Collectors</option>
            {collectors.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <button onClick={() => onLayout('TB')} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border hover:border-nms-brand text-sm text-nms-text-secondary hover:text-nms-text transition-all">
            <LayoutTemplate size={14} />
            {t('common.autoLayout', 'Auto Layout')}
          </button>
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
