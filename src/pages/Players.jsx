import React, { useState, useMemo } from "react";
import { client } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Pencil, Trash2, Save, X, Star, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Download, Trophy, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import CrewSelector from "../components/CrewSelector";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StatsCard from "@/components/home/StatsCard";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const positions = [
  { value: 'goalkeeper', label: 'GK', color: 'bg-yellow-100 text-yellow-700', priority: 1 },
  { value: 'cb', label: 'CB', color: 'bg-indigo-100 text-indigo-700', priority: 2 },
  { value: 'defender', label: 'DEF', color: 'bg-blue-100 text-blue-700', priority: 3 },
  { value: 'midfielder', label: 'MID', color: 'bg-green-100 text-green-700', priority: 4 },
  { value: 'striker', label: 'STR', color: 'bg-red-100 text-red-700', priority: 5 }
];

export default function Players() {
  const navigate = useNavigate();
  const user = useAuthGuard();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddRow, setShowAddRow] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    positions: [],
    skill_rating: 4,
    is_unknown: false,
    is_default: false
  });
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportColumns, setExportColumns] = useState({
    name: true,
    positions: true,
    rating: true,
    unknown: true,
    default: true
  });
  const queryClient = useQueryClient();
  const selectedCrewId = localStorage.getItem('selectedCrewId');

  const { data: currentCrew } = useQuery({
    queryKey: ['currentCrew', selectedCrewId],
    queryFn: async () => {
      if (!selectedCrewId) return null;
      const allCrews = await client.entities.Crew.list();
      return allCrews.find(g => g.id === selectedCrewId) || null;
    },
    enabled: !!selectedCrewId
  });

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players', selectedCrewId],
    queryFn: async () => {
      if (!selectedCrewId) return [];
      const allPlayers = await client.entities.Player.list('-created_date');
      return allPlayers.filter(p => p.game_ids && p.game_ids.includes(selectedCrewId));
    },
    enabled: !!selectedCrewId
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', selectedCrewId],
    queryFn: () => client.entities.Match.filter({ game_id: selectedCrewId }),
    enabled: !!selectedCrewId,
  });

  const appearanceStats = useMemo(() => {
    const map = {};
    for (const match of matches) {
      for (const team of match.generated_teams || []) {
        for (const player of team.players || []) {
          if (!player.name) continue;
          if (!map[player.name]) {
            map[player.name] = { count: 0, positions: player.positions || [], skill_rating: player.skill_rating };
          }
          map[player.name].count++;
        }
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [matches]);

  const avgPlayersPerMatch = useMemo(() => {
    if (!matches.length) return 0;
    const total = matches.reduce((sum, m) => sum + (m.attending_player_ids?.length || 0), 0);
    return Math.round(total / matches.length);
  }, [matches]);

  const createMutation = useMutation({
    mutationFn: (data) => client.entities.Player.create({
      ...data,
      game_ids: [selectedCrewId]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowAddRow(false);
      setNewPlayer({ name: '', positions: [], skill_rating: 4, is_unknown: false, is_default: false });
    },
    onError: () => { alert('Failed to create player. Please try again.'); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Player.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setEditingId(null);
      setEditForm({});
    },
    onError: () => { alert('Failed to update player. Please try again.'); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.entities.Player.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
    onError: () => { alert('Failed to delete player. Please try again.'); }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rating' ? 'desc' : 'asc');
    }
  };

  const handleEdit = (player) => {
    setEditingId(player.id);
    setEditForm({ ...player });
  };

  const handleSave = (id) => {
    updateMutation.mutate({ id, data: editForm });
  };

  const handleDelete = (id) => setPlayerToDelete(id);

  const handleAddPlayer = () => {
    if (!newPlayer.name.trim()) {
      alert('Please enter a player name');
      return;
    }
    if (!newPlayer.is_unknown && newPlayer.positions.length === 0) {
      alert('Please select at least one position');
      return;
    }
    createMutation.mutate(newPlayer);
  };

  const togglePosition = (positions, position) => {
    if (positions.includes(position)) {
      return positions.filter(p => p !== position);
    }
    return [...positions, position];
  };

  const renderStars = (rating, maxStars, onChange) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 cursor-pointer transition-colors ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
            }`}
            onClick={() => onChange && onChange(star)}
          />
        ))}
      </div>
    );
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 text-emerald-600" /> : 
      <ArrowDown className="w-4 h-4 ml-1 text-emerald-600" />;
  };

  const getPositionPriority = (playerPositions) => {
    if (!playerPositions || playerPositions.length === 0) return 999;
    
    const priorities = playerPositions.map(pos => {
      const posData = positions.find(p => p.value === pos);
      return posData ? posData.priority : 999;
    });
    
    return Math.min(...priorities);
  };

  const filteredPlayers = players
    .filter(player => player?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    .sort((a, b) => {
      let compareA, compareB;
      
      switch(sortField) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'rating':
          compareA = a.skill_rating || 0;
          compareB = b.skill_rating || 0;
          break;
        case 'positions':
          compareA = getPositionPriority(a.positions);
          compareB = getPositionPriority(b.positions);
          break;
        case 'unknown':
          compareA = a.is_unknown ? 1 : 0;
          compareB = b.is_unknown ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const maxStars = currentCrew?.max_stars || 7;

  const handleExport = () => {
    const headers = [];
    const columnsMap = [];

    if (exportColumns.name) {
      headers.push('Name');
      columnsMap.push('name');
    }
    if (exportColumns.positions) {
      headers.push('Positions');
      columnsMap.push('positions');
    }
    if (exportColumns.rating) {
      headers.push('Rating');
      columnsMap.push('rating');
    }
    if (exportColumns.unknown) {
      headers.push('Unknown');
      columnsMap.push('unknown');
    }
    if (exportColumns.default) {
      headers.push('Default');
      columnsMap.push('default');
    }

    const rows = filteredPlayers.map(player => {
      const row = [];
      columnsMap.forEach(col => {
        switch(col) {
          case 'name':
            row.push(player.name);
            break;
          case 'positions':
            row.push((player.positions || []).map(p => {
              const posData = positions.find(pos => pos.value === p);
              return posData ? posData.label : p;
            }).join(', '));
            break;
          case 'rating':
            row.push(player.is_unknown ? '-' : (player.skill_rating || 4));
            break;
          case 'unknown':
            row.push(player.is_unknown ? 'Yes' : 'No');
            break;
          case 'default':
            row.push(player.is_default ? 'Yes' : 'No');
            break;
        }
      });
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `players_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDialog(false);
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-lg font-medium text-gray-700">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <CrewSelector currentCrew={currentCrew} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />
              Players
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your player roster ({players.length} total)
            </p>
          </div>
          {selectedCrewId && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="outline"
                className="border-2 border-blue-300 hover:bg-blue-50"
                size="lg"
                disabled={players.length === 0}
              >
                <Download className="w-5 h-5 mr-2" />
                Export to Excel
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("ImportPlayers"))}
                variant="outline"
                className="border-2 border-emerald-300 hover:bg-emerald-50"
                size="lg"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                Import from File
              </Button>
              <Button
                onClick={() => setShowAddRow(true)}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Player
              </Button>
            </div>
          )}
        </motion.div>

        {selectedCrewId && (
          <Tabs defaultValue="players">
            <TabsList className="mb-6">
              <TabsTrigger value="players" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Players
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Stats
              </TabsTrigger>
            </TabsList>

            <TabsContent value="players">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-2 border-gray-200 focus:border-emerald-300"
                />
              </div>
            </motion.div>

            <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-emerald-50">
                      <TableHead className="font-bold">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center hover:text-emerald-700 transition-colors"
                        >
                          Name
                          <SortIcon field="name" />
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">
                        <button
                          onClick={() => handleSort('positions')}
                          className="flex items-center hover:text-emerald-700 transition-colors"
                        >
                          Positions
                          <SortIcon field="positions" />
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">
                        <button
                          onClick={() => handleSort('rating')}
                          className="flex items-center hover:text-emerald-700 transition-colors"
                        >
                          Rating
                          <SortIcon field="rating" />
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">
                        <button
                          onClick={() => handleSort('unknown')}
                          className="flex items-center hover:text-emerald-700 transition-colors"
                        >
                          Unknown
                          <SortIcon field="unknown" />
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">Default</TableHead>
                      <TableHead className="font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showAddRow && (
                      <TableRow className="bg-blue-50 border-2 border-blue-300">
                        <TableCell>
                          <Input
                            value={newPlayer.name}
                            onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                            placeholder="Player name"
                            className="border-blue-300"
                          />
                        </TableCell>
                        <TableCell>
                          {!newPlayer.is_unknown && (
                            <div className="flex flex-wrap gap-1">
                              {positions.map(pos => (
                                <Badge
                                  key={pos.value}
                                  className={`cursor-pointer ${
                                    newPlayer.positions.includes(pos.value)
                                      ? pos.color + ' border-2 border-emerald-600'
                                      : 'bg-gray-100 text-gray-400'
                                  }`}
                                  onClick={() => setNewPlayer({
                                    ...newPlayer,
                                    positions: togglePosition(newPlayer.positions, pos.value)
                                  })}
                                >
                                  {pos.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {!newPlayer.is_unknown && renderStars(newPlayer.skill_rating, maxStars, (rating) => 
                            setNewPlayer({ ...newPlayer, skill_rating: rating })
                          )}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={newPlayer.is_unknown}
                            onCheckedChange={(checked) => setNewPlayer({
                              ...newPlayer,
                              is_unknown: checked,
                              positions: checked ? [] : newPlayer.positions
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={newPlayer.is_default}
                            onCheckedChange={(checked) => setNewPlayer({
                              ...newPlayer,
                              is_default: checked
                            })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={handleAddPlayer}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowAddRow(false);
                                setNewPlayer({ name: '', positions: [], skill_rating: 4, is_unknown: false, is_default: false });
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredPlayers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {searchQuery ? 'No players found' : 'No players yet'}
                          </h3>
                          <p className="text-gray-600 mb-6">
                            {searchQuery ? 'Try a different search term' : 'Add your first player to get started'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPlayers.map((player) => (
                        <TableRow key={player.id} className="hover:bg-emerald-50 transition-colors">
                          {editingId === player.id ? (
                            <>
                              <TableCell>
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  className="border-emerald-300"
                                />
                              </TableCell>
                              <TableCell>
                                {!editForm.is_unknown && (
                                  <div className="flex flex-wrap gap-1">
                                    {positions.map(pos => (
                                      <Badge
                                        key={pos.value}
                                        className={`cursor-pointer ${
                                          (editForm.positions || []).includes(pos.value)
                                            ? pos.color + ' border-2 border-emerald-600'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}
                                        onClick={() => setEditForm({
                                          ...editForm,
                                          positions: togglePosition(editForm.positions || [], pos.value)
                                        })}
                                      >
                                        {pos.label}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {!editForm.is_unknown && renderStars(editForm.skill_rating || 4, maxStars, (rating) =>
                                  setEditForm({ ...editForm, skill_rating: rating })
                                )}
                              </TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={editForm.is_unknown}
                                  onCheckedChange={(checked) => setEditForm({
                                    ...editForm,
                                    is_unknown: checked,
                                    positions: checked ? [] : editForm.positions
                                  })}
                                />
                              </TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={editForm.is_default}
                                  onCheckedChange={(checked) => setEditForm({
                                    ...editForm,
                                    is_default: checked
                                  })}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSave(player.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditForm({});
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium">{player.name}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(player.positions || [])
                                    .sort((a, b) => {
                                      const posA = positions.find(p => p.value === a);
                                      const posB = positions.find(p => p.value === b);
                                      return (posA?.priority || 999) - (posB?.priority || 999);
                                    })
                                    .map(pos => {
                                      const posData = positions.find(p => p.value === pos);
                                      return posData ? (
                                        <Badge key={pos} className={posData.color}>
                                          {posData.label}
                                        </Badge>
                                      ) : null;
                                    })}
                                </div>
                              </TableCell>
                              <TableCell>
                                {player.is_unknown ? (
                                  <span className="text-sm text-gray-400">-</span>
                                ) : (
                                  renderStars(player.skill_rating || 4, maxStars)
                                )}
                              </TableCell>
                              <TableCell>
                                {player.is_unknown && (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-700">
                                    Yes
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={player.is_default || false}
                                  onCheckedChange={(checked) => {
                                    updateMutation.mutate({ 
                                      id: player.id, 
                                      data: { is_default: checked } 
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(player)}
                                    className="hover:bg-emerald-50"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(player.id)}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            </TabsContent>

            <TabsContent value="stats">
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatsCard
                    icon={Trophy}
                    title="Total Matches"
                    value={String(matches.length)}
                    subtitle="in this crew"
                    color="text-emerald-600"
                    delay={0}
                  />
                  <StatsCard
                    icon={Users}
                    title="Most Appearances"
                    value={appearanceStats[0]?.count ? String(appearanceStats[0].count) : '—'}
                    subtitle={appearanceStats[0]?.name || 'No data yet'}
                    color="text-yellow-500"
                    delay={0.1}
                  />
                  <StatsCard
                    icon={BarChart2}
                    title="Avg Players / Match"
                    value={avgPlayersPerMatch ? String(avgPlayersPerMatch) : '—'}
                    subtitle="attending per session"
                    color="text-blue-600"
                    delay={0.2}
                  />
                </div>

                {/* Leaderboard */}
                <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-emerald-50 border-b border-gray-200">
                    <h2 className="font-bold text-lg text-gray-900">Appearances Leaderboard</h2>
                    <p className="text-sm text-gray-500">Based on {matches.length} matches</p>
                  </div>
                  {appearanceStats.length === 0 ? (
                    <div className="text-center py-16">
                      <BarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No stats yet</h3>
                      <p className="text-gray-500">Create matches and generate teams to start tracking appearances.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {appearanceStats.map((player, idx) => {
                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                        return (
                          <div key={player.name} className="flex items-center gap-4 px-6 py-3 hover:bg-emerald-50 transition-colors">
                            <div className="w-8 text-center font-bold text-gray-400 text-sm">
                              {medal || `#${idx + 1}`}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-900 truncate block">{player.name}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {(player.positions || []).map(pos => {
                                  const posData = positions.find(p => p.value === pos);
                                  return posData ? (
                                    <Badge key={pos} className={`${posData.color} text-xs py-0`}>{posData.label}</Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {player.skill_rating != null && renderStars(player.skill_rating, maxStars)}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-sm min-w-[3.5rem] justify-center">
                              <Users className="w-3.5 h-3.5" />
                              {player.count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Player</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this player? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => { deleteMutation.mutate(playerToDelete); setPlayerToDelete(null); }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>בחר עמודות לייצוא</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-name"
                  checked={exportColumns.name}
                  onCheckedChange={(checked) => setExportColumns({ ...exportColumns, name: checked })}
                />
                <Label htmlFor="export-name" className="cursor-pointer">שם שחקן</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-positions"
                  checked={exportColumns.positions}
                  onCheckedChange={(checked) => setExportColumns({ ...exportColumns, positions: checked })}
                />
                <Label htmlFor="export-positions" className="cursor-pointer">עמדות</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-rating"
                  checked={exportColumns.rating}
                  onCheckedChange={(checked) => setExportColumns({ ...exportColumns, rating: checked })}
                />
                <Label htmlFor="export-rating" className="cursor-pointer">דירוג</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-unknown"
                  checked={exportColumns.unknown}
                  onCheckedChange={(checked) => setExportColumns({ ...exportColumns, unknown: checked })}
                />
                <Label htmlFor="export-unknown" className="cursor-pointer">שחקן לא ידוע</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-default"
                  checked={exportColumns.default}
                  onCheckedChange={(checked) => setExportColumns({ ...exportColumns, default: checked })}
                />
                <Label htmlFor="export-default" className="cursor-pointer">ברירת מחדל</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                ביטול
              </Button>
              <Button 
                onClick={handleExport} 
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!Object.values(exportColumns).some(v => v)}
              >
                <Download className="w-4 h-4 mr-2" />
                ייצא
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}