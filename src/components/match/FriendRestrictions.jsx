// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Users, Trash2, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function FriendRestrictions({ players, friendRestrictions, onUpdate, preAssignedTeams }) {
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  const handleTogglePlayer = (playerId) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleCreateGroup = () => {
    if (selectedPlayers.length < 2) {
      alert('Please select at least 2 players for a friend group');
      return;
    }
    onUpdate([...friendRestrictions, selectedPlayers]);
    setSelectedPlayers([]);
  };

  const handleRemoveGroup = (groupIndex) => {
    onUpdate(friendRestrictions.filter((_, idx) => idx !== groupIndex));
  };

  const handleRemovePlayerFromGroup = (groupIndex, playerId) => {
    const updatedGroups = friendRestrictions.map((group, idx) => {
      if (idx === groupIndex) {
        const newGroup = group.filter(id => id !== playerId);
        return newGroup.length >= 2 ? newGroup : null;
      }
      return group;
    }).filter(Boolean);
    onUpdate(updatedGroups);
  };

  const isPlayerInAnyGroup = (playerId) => {
    return friendRestrictions.some(group => group.includes(playerId));
  };

  const isPlayerManuallyAssigned = (playerId) => {
    return Object.values(preAssignedTeams).flat().includes(playerId);
  };

  const availablePlayers = players.filter(p => 
    !isPlayerInAnyGroup(p.id) && !isPlayerManuallyAssigned(p.id)
  );

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">💡 Friend Groups:</span> Select players who must play together on the same team. 
            Players manually assigned to teams cannot be added to friend groups.
          </p>
        </CardContent>
      </Card>

      {/* Existing Friend Groups */}
      {friendRestrictions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Friend Groups ({friendRestrictions.length})
          </h3>
          
          {friendRestrictions.map((group, groupIndex) => (
            <Card key={groupIndex} className="border-2 border-blue-200 bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                      {groupIndex + 1}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.map(playerId => {
                        const player = players.find(p => p.id === playerId);
                        return player ? (
                          <Badge key={playerId} className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300 px-3 py-1.5">
                            {player.name}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePlayerFromGroup(groupIndex, playerId);
                              }}
                              className="ml-2 hover:text-blue-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveGroup(groupIndex)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create New Friend Group */}
      {availablePlayers.length >= 2 && (
        <Card className="border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-br from-emerald-50 to-green-50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Create Friend Group
              </CardTitle>
              {selectedPlayers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    {selectedPlayers.length} selected
                  </span>
                  <Button
                    type="button"
                    onClick={handleCreateGroup}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                    disabled={selectedPlayers.length < 2}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlayers([])}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {availablePlayers.map(player => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPlayers.includes(player.id)
                      ? 'bg-emerald-100 border-emerald-400 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                  onClick={() => handleTogglePlayer(player.id)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedPlayers.includes(player.id)}
                      onCheckedChange={() => handleTogglePlayer(player.id)}
                    />
                  </div>
                  <span className="text-sm font-medium flex-1 truncate">{player.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {availablePlayers.length < 2 && friendRestrictions.length === 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No players available
            </h3>
            <p className="text-gray-600">
              All players are already in friend groups or manually assigned to teams
            </p>
          </CardContent>
        </Card>
      )}

      {availablePlayers.length === 1 && friendRestrictions.length > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">
              Only 1 player available. Need at least 2 players to create a friend group.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}