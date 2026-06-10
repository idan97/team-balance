import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Star, UserX, ArrowLeftRight, Edit } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function SoccerField({ team, formation, teamIndex, allTeams, onSwapPlayers, selectedPlayer, onPlayerSelect, onPlayerEdit }) {
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editedRating, setEditedRating] = useState(null);
  const [editedPositions, setEditedPositions] = useState([]);
  const formationParts = formation.split('-').map(Number);
  const rows = [
    { name: 'Striker', count: formationParts[formationParts.length - 1] || 1, position: 'striker', label: 'ATK' },
    ...formationParts.slice(0, -1).reverse().map((count, index) => ({
      name: index === 0 ? 'Midfielder' : 'Defender',
      count,
      position: index === 0 ? 'midfielder' : 'defender',
      label: index === 0 ? 'MID' : 'DEF'
    })),
    { name: 'Goalkeeper', count: 1, position: 'goalkeeper', label: 'GK' }
  ];

  // Intelligent player assignment based on positions
  const assignPlayersByPosition = () => {
    const availablePlayers = [...team.players];
    const assignedPlayers = [];

    rows.forEach(row => {
      const rowPlayers = [];
      
      if (row.position === 'goalkeeper') {
        // Assign goalkeeper
        const gkIndex = availablePlayers.findIndex(p => 
          p.positions && p.positions.includes('goalkeeper')
        );
        if (gkIndex !== -1) {
          rowPlayers.push(availablePlayers.splice(gkIndex, 1)[0]);
        } else if (availablePlayers.length > 0) {
          rowPlayers.push(availablePlayers.shift());
        }
      } else if (row.position === 'defender') {
        // For defenders: CBs in the middle, DEFs on sides
        for (let i = 0; i < row.count; i++) {
          let player = null;
          
          // Determine if this position should be CB (middle) or DEF (sides)
          const isMiddlePosition = row.count >= 3 && i > 0 && i < row.count - 1;
          
          if (isMiddlePosition) {
            // Try to place a CB in middle position
            const cbIndex = availablePlayers.findIndex(p => 
              p.positions && p.positions.includes('cb')
            );
            if (cbIndex !== -1) {
              player = availablePlayers.splice(cbIndex, 1)[0];
            }
          }
          
          // If no CB found for middle or it's a side position, try regular defender
          if (!player) {
            const defIndex = availablePlayers.findIndex(p => 
              p.positions && p.positions.includes('defender')
            );
            if (defIndex !== -1) {
              player = availablePlayers.splice(defIndex, 1)[0];
            }
          }
          
          // Fallback: use any available player
          if (!player && availablePlayers.length > 0) {
            player = availablePlayers.shift();
          }
          
          if (player) rowPlayers.push(player);
        }
      } else {
        // For midfielders and strikers
        for (let i = 0; i < row.count; i++) {
          const playerIndex = availablePlayers.findIndex(p => 
            p.positions && p.positions.includes(row.position)
          );
          
          if (playerIndex !== -1) {
            rowPlayers.push(availablePlayers.splice(playerIndex, 1)[0]);
          } else if (availablePlayers.length > 0) {
            rowPlayers.push(availablePlayers.shift());
          }
        }
      }
      
      assignedPlayers.push(rowPlayers);
    });

    return assignedPlayers;
  };

  const assignedPlayers = assignPlayersByPosition();

  const handlePlayerClick = (player) => {
    if (!selectedPlayer) {
      // First player selected
      onPlayerSelect({ player, teamIndex });
    } else if (selectedPlayer.player.id === player.id && selectedPlayer.teamIndex === teamIndex) {
      // Clicked same player - deselect
      onPlayerSelect(null);
    } else {
      // Second player selected - swap them
      onSwapPlayers(
        selectedPlayer.player,
        selectedPlayer.teamIndex,
        player,
        teamIndex
      );
      onPlayerSelect(null);
    }
  };

  const handleEditClick = (e, player) => {
    e.stopPropagation();
    setEditingPlayer(player);
    setEditedRating(player.skill_rating || 3);
    setEditedPositions(player.positions || []);
  };

  const handleSaveEdit = () => {
    if (onPlayerEdit && editingPlayer) {
      onPlayerEdit(teamIndex, editingPlayer.id, {
        skill_rating: editedRating,
        positions: editedPositions
      });
    }
    setEditingPlayer(null);
  };

  const togglePosition = (position) => {
    setEditedPositions(prev => 
      prev.includes(position) 
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const availablePositions = [
    { value: 'goalkeeper', label: 'שוער' },
    { value: 'defender', label: 'מגן' },
    { value: 'cb', label: 'בלם' },
    { value: 'midfielder', label: 'קשר' },
    { value: 'striker', label: 'חלוץ' }
  ];

  const getPlayerPositionsLabel = (playerPositions) => {
    if (!playerPositions || playerPositions.length === 0) return 'אין עמדות';
    return playerPositions
      .map(pos => availablePositions.find(p => p.value === pos)?.label || pos)
      .join(', ');
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex gap-0.5 justify-center mt-1">
        {[1, 2, 3, 4, 5, 6, 7].map((star) => (
          <Star
            key={star}
            className={`w-2 h-2 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const isPlayerSelected = (player) => 
    selectedPlayer && 
    selectedPlayer.player.id === player.id && 
    selectedPlayer.teamIndex === teamIndex;

  const unknownPlayers = team.players.filter(p => p.is_unknown);

  return (
    <Card className={`border-2 overflow-hidden transition-all ${
      selectedPlayer && selectedPlayer.teamIndex === teamIndex 
        ? 'border-blue-400 shadow-lg' 
        : selectedPlayer
        ? 'border-green-400 shadow-lg'
        : 'border-emerald-200'
    } bg-gradient-to-b from-green-50 to-emerald-50`}>
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">{team.team_name}</CardTitle>
          <Badge className="bg-white text-emerald-700 hover:bg-white text-lg px-4 py-1">
            ★ {team.total_rating.toFixed(1)}
          </Badge>
        </div>
        {selectedPlayer && (
          <p className="text-sm text-white/90 mt-2">
            {selectedPlayer.teamIndex === teamIndex 
              ? `Click another player to swap positions with ${selectedPlayer.player.name}`
              : `Click a player here to swap teams with ${selectedPlayer.player.name}`
            }
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-6">
        <div 
          className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-2xl p-6 shadow-inner"
          style={{ minHeight: '500px' }}
        >
          {/* Field Lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-16 border-2 border-white/30 rounded-b-lg" />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-16 border-2 border-white/30 rounded-t-lg" />
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full" />
          </div>

          {/* Players Grid */}
          <div className="relative z-10 h-full flex flex-col justify-between gap-4">
            {assignedPlayers.map((rowPlayers, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-3">
                {rowPlayers.map((player, playerIdx) => {
                  const selected = isPlayerSelected(player);
                  const showSwapIcon = selectedPlayer && !selected;
                  
                  // Determine position label - CB for middle defenders, DEF for sides
                  let positionLabel = rows[rowIndex].label;
                  if (rows[rowIndex].position === 'defender' && rowPlayers.length >= 3) {
                    // First and last are always DEF, middle ones are CB
                    if (playerIdx === 0 || playerIdx === rowPlayers.length - 1) {
                      positionLabel = 'DEF';
                    } else {
                      positionLabel = 'CB';
                    }
                  }
                  
                  if (player.is_unknown) {
                    positionLabel = '?';
                  }
                  
                  const isUnknown = player.is_unknown;
                  
                  return (
                    <TooltipProvider key={player.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="flex flex-col items-center cursor-pointer relative group"
                            onClick={() => handlePlayerClick(player)}
                          >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg font-bold text-sm transition-all relative ${
                              selected 
                                ? 'bg-blue-500 border-4 border-blue-700 text-white scale-110' 
                                : isUnknown
                                ? 'bg-orange-400 border-4 border-orange-500 text-white hover:scale-105'
                                : selectedPlayer
                                ? 'bg-white border-4 border-green-400 text-emerald-700 hover:scale-110'
                                : 'bg-white border-4 border-emerald-500 text-emerald-700 hover:scale-105'
                            }`}>
                              {selected ? '✓' : positionLabel}
                              {showSwapIcon && (
                                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                                  <ArrowLeftRight className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => handleEditClick(e, player)}
                              className="absolute -top-2 -left-2 bg-blue-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-blue-600"
                            >
                              <Edit className="w-3 h-3 text-white" />
                            </button>
                            <div className="mt-2 text-center">
                              <p className={`text-xs font-semibold px-2 py-1 rounded backdrop-blur-sm ${
                                selected 
                                  ? 'bg-blue-500 text-white' 
                                  : isUnknown
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-black/40 text-white'
                              }`}>
                                {player.name}
                              </p>
                              {!isUnknown && renderStars(player.skill_rating)}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">
                            {isUnknown ? 'שחקן לא ידוע' : getPlayerPositionsLabel(player.positions)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Formation & Player Count */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Formation: <span className="font-semibold text-emerald-700">{formation}</span>
            {' • '}
            {team.players.length} players
            {unknownPlayers.length > 0 && (
              <span className="text-orange-600 font-semibold"> ({unknownPlayers.length} unknown)</span>
            )}
          </p>
        </div>
      </CardContent>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ערוך שחקן - {editingPlayer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>דירוג כוכבים</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5, 6, 7].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setEditedRating(rating)}
                    className={`p-2 rounded ${
                      rating <= editedRating
                        ? 'text-yellow-500'
                        : 'text-gray-300'
                    }`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-3 block">עמדות</Label>
              <div className="space-y-2">
                {availablePositions.map((position) => (
                  <div key={position.value} className="flex items-center gap-2">
                    <Checkbox
                      id={position.value}
                      checked={editedPositions.includes(position.value)}
                      onCheckedChange={() => togglePosition(position.value)}
                    />
                    <label
                      htmlFor={position.value}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {position.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlayer(null)}>
              ביטול
            </Button>
            <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700">
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}