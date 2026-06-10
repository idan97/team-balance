
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Users, ArrowRight, X, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TeamAssignmentView({ 
  players, 
  teamsCount, 
  preAssignedTeams, 
  onPreAssign, 
  onRemovePreAssign,
  friendRestrictions,
  playersPerTeam
}) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const teams = Array.from({ length: teamsCount }, (_, i) => i);
  
  const getTeamPlayers = (teamIndex) => {
    const playerIds = preAssignedTeams[teamIndex] || [];
    return players.filter(p => playerIds.includes(p.id));
  };

  const isPlayerInFriendGroup = (playerId) => {
    return friendRestrictions.some(group => group.includes(playerId));
  };

  const getFriendGroupForPlayer = (playerId) => {
    return friendRestrictions.find(group => group.includes(playerId));
  };

  const getRequiredTeamForPlayer = (playerId) => {
    const friendGroup = getFriendGroupForPlayer(playerId);
    if (!friendGroup) return null;
    
    // Check if any other group member is already assigned to a team
    for (const memberId of friendGroup) {
      if (memberId === playerId) continue;
      
      for (let teamIndex = 0; teamIndex < teamsCount; teamIndex++) {
        if ((preAssignedTeams[teamIndex] || []).includes(memberId)) {
          return teamIndex;
        }
      }
    }
    
    return null;
  };

  const getUnassignedPlayers = () => {
    const assignedIds = Object.values(preAssignedTeams).flat();
    return players.filter(p => !assignedIds.includes(p.id));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rating' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-3 h-3 ml-1 text-emerald-600" /> : 
      <ArrowDown className="w-3 h-3 ml-1 text-emerald-600" />;
  };

  const getPositionPriority = (playerPositions) => {
    if (!playerPositions || playerPositions.length === 0) return 999;
    const priorities = { goalkeeper: 1, cb: 2, defender: 3, midfielder: 4, striker: 5 };
    const positionPriorities = playerPositions.map(pos => priorities[pos] || 999);
    return Math.min(...positionPriorities);
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="text-gray-400 text-xs">-</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const handleAssignToTeam = (teamIndex) => {
    if (!selectedPlayer) return;
    
    const requiredTeam = getRequiredTeamForPlayer(selectedPlayer.id);
    if (requiredTeam !== null && requiredTeam !== teamIndex) {
      const friendGroup = getFriendGroupForPlayer(selectedPlayer.id);
      const assignedMembers = friendGroup.filter(id => 
        (preAssignedTeams[requiredTeam] || []).includes(id)
      ).map(id => players.find(p => p.id === id)?.name).filter(Boolean);
      
      alert(`This player is in a friend group with ${assignedMembers.join(', ')} who ${assignedMembers.length === 1 ? 'is' : 'are'} already assigned to Team ${String.fromCharCode(65 + requiredTeam)}. Friend group members must be on the same team.`);
      return;
    }
    
    const teamPlayers = getTeamPlayers(teamIndex);
    if (teamPlayers.length >= playersPerTeam) {
      alert(`Team ${String.fromCharCode(65 + teamIndex)} is full. Maximum ${playersPerTeam} players per team.`);
      return;
    }
    
    onPreAssign(teamIndex, selectedPlayer.id);
    setSelectedPlayer(null);
  };

  const handleRemovePlayer = (teamIndex, playerId) => {
    onRemovePreAssign(teamIndex, playerId);
  };

  const handlePlayerClick = (player) => {
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
    }
  };

  const unassignedPlayers = getUnassignedPlayers()
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = positionFilter === "all" || 
        (player.positions && player.positions.includes(positionFilter));
      return matchesSearch && matchesPosition;
    })
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
        default:
          return 0;
      }
      
      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const requiredTeamForSelected = selectedPlayer ? getRequiredTeamForPlayer(selectedPlayer.id) : null;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Available Players ({unassignedPlayers.length})
          </CardTitle>
          <p className="text-sm text-gray-600">Click a player to select, then click a team to assign. Friend group members must be assigned to the same team.</p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="goalkeeper">GK</SelectItem>
                <SelectItem value="cb">CB</SelectItem>
                <SelectItem value="defender">DEF</SelectItem>
                <SelectItem value="midfielder">MID</SelectItem>
                <SelectItem value="striker">STR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[500px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10">
                <TableRow>
                  <TableHead className="font-bold">
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      className="flex items-center hover:text-emerald-700 transition-colors"
                    >
                      Name
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="font-bold">
                    <button
                      type="button"
                      onClick={() => handleSort('rating')}
                      className="flex items-center hover:text-emerald-700 transition-colors"
                    >
                      Rating
                      <SortIcon field="rating" />
                    </button>
                  </TableHead>
                  <TableHead className="font-bold">
                    <button
                      type="button"
                      onClick={() => handleSort('positions')}
                      className="flex items-center hover:text-emerald-700 transition-colors"
                    >
                      Positions
                      <SortIcon field="positions" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      {searchQuery || positionFilter !== "all" 
                        ? 'No players match filters' 
                        : 'All players assigned to teams'}
                    </TableCell>
                  </TableRow>
                ) : (
                  unassignedPlayers.map((player) => (
                    <TableRow
                      key={player.id}
                      className={`cursor-pointer transition-colors ${
                        selectedPlayer?.id === player.id
                          ? 'bg-blue-100 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handlePlayerClick(player)}
                    >
                      <TableCell className="font-medium">
                        {player.name}
                        {player.is_unknown && (
                          <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 text-xs">
                            Unknown
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {player.is_unknown ? (
                          <span className="text-gray-400 text-xs">-</span>
                        ) : (
                          renderStars(player.skill_rating)
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {player.positions?.sort((a, b) => {
                            const priorities = { goalkeeper: 1, cb: 2, defender: 3, midfielder: 4, striker: 5 };
                            return (priorities[a] || 999) - (priorities[b] || 999);
                          }).map(pos => {
                            const posLabels = {
                              goalkeeper: { label: 'GK', color: 'bg-yellow-100 text-yellow-700' },
                              cb: { label: 'CB', color: 'bg-indigo-100 text-indigo-700' },
                              defender: { label: 'DEF', color: 'bg-blue-100 text-blue-700' },
                              midfielder: { label: 'MID', color: 'bg-green-100 text-green-700' },
                              striker: { label: 'STR', color: 'bg-red-100 text-red-700' }
                            };
                            const posData = posLabels[pos];
                            return posData ? (
                              <Badge key={pos} className={`${posData.color} text-xs`}>
                                {posData.label}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">
            {selectedPlayer ? (
              requiredTeamForSelected !== null ? (
                <>
                  <span className="font-bold">{selectedPlayer.name}</span> is in a friend group. 
                  Must be assigned to <span className="font-bold">Team {String.fromCharCode(65 + requiredTeamForSelected)}</span> with their friend(s).
                </>
              ) : (
                <>
                  <span className="font-bold">{selectedPlayer.name}</span> selected. Click a team below to assign.
                </>
              )
            ) : (
              'Select a player from the table to assign to a team'
            )}
          </p>
        </div>

        {teams.map((teamIndex) => {
          const teamPlayers = getTeamPlayers(teamIndex);
          const teamName = `Team ${String.fromCharCode(65 + teamIndex)}`;
          const totalRating = teamPlayers.reduce((sum, p) => 
            sum + (p.is_unknown ? 0 : (p.skill_rating || 0)), 0
          );
          const isFull = teamPlayers.length >= playersPerTeam;
          const isRequiredTeam = requiredTeamForSelected === teamIndex;
          const isBlockedByFriendGroup = selectedPlayer && requiredTeamForSelected !== null && requiredTeamForSelected !== teamIndex;
          
          return (
            <Card 
              key={teamIndex} 
              className={`border-2 transition-all ${
                isBlockedByFriendGroup
                  ? 'border-gray-300 opacity-40'
                  : isFull
                  ? 'border-gray-300 opacity-60'
                  : isRequiredTeam
                  ? 'border-blue-500 shadow-lg cursor-pointer hover:border-blue-700 hover:shadow-xl'
                  : selectedPlayer 
                  ? 'border-emerald-400 shadow-lg cursor-pointer hover:border-emerald-600 hover:shadow-xl' 
                  : 'border-emerald-200'
              }`}
              onClick={() => {
                if (isBlockedByFriendGroup) return;
                if (!isFull && selectedPlayer) handleAssignToTeam(teamIndex);
              }}
            >
              <CardHeader className={`pb-3 ${isRequiredTeam ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'bg-gradient-to-r from-emerald-50 to-green-50'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{teamName}</CardTitle>
                    {isRequiredTeam && (
                      <Badge className="bg-blue-600 text-white text-xs">Required</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`bg-white ${isFull ? 'border-red-500 text-red-700' : ''}`}>
                      {teamPlayers.length}/{playersPerTeam} players
                    </Badge>
                    <Badge className="bg-emerald-600 text-white">
                      ★ {totalRating.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {teamPlayers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    {isBlockedByFriendGroup ? (
                      <p className="text-sm text-gray-500">Cannot assign here</p>
                    ) : selectedPlayer ? (
                      <div className="flex flex-col items-center gap-2">
                        <ArrowRight className="w-6 h-6" />
                        <p className="text-sm">Click to assign here</p>
                      </div>
                    ) : (
                      <p className="text-sm">No players assigned</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamPlayers.map((player) => {
                      const inFriendGroup = isPlayerInFriendGroup(player.id);
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{player.name}</p>
                              {player.is_unknown && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-700 text-xs">
                                  Unknown
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {!player.is_unknown && renderStars(player.skill_rating)}
                              <div className="flex flex-wrap gap-1">
                                {player.positions?.slice(0, 3).map(pos => {
                                  const posLabels = {
                                    goalkeeper: { label: 'GK', color: 'bg-yellow-100 text-yellow-700' },
                                    cb: { label: 'CB', color: 'bg-indigo-100 text-indigo-700' },
                                    defender: { label: 'DEF', color: 'bg-blue-100 text-blue-700' },
                                    midfielder: { label: 'MID', color: 'bg-green-100 text-green-700' },
                                    striker: { label: 'STR', color: 'bg-red-100 text-red-700' }
                                  };
                                  const posData = posLabels[pos];
                                  return posData ? (
                                    <Badge key={pos} className={`${posData.color} text-xs`}>
                                      {posData.label}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePlayer(teamIndex, player.id);
                            }}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
