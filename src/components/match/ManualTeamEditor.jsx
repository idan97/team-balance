
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowLeftRight, Save, X } from "lucide-react";

export default function ManualTeamEditor({ teams, onSave, onCancel }) {
  const [editedTeams, setEditedTeams] = useState(JSON.parse(JSON.stringify(teams)));
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const swapPlayers = (player1, team1Index, player2, team2Index) => {
    const newTeams = [...editedTeams];
    
    // Remove both players from their teams
    newTeams[team1Index].players = newTeams[team1Index].players.filter(
      p => p.id !== player1.id
    );
    newTeams[team2Index].players = newTeams[team2Index].players.filter(
      p => p.id !== player2.id
    );
    
    // Add them to opposite teams
    newTeams[team1Index].players.push(player2);
    newTeams[team2Index].players.push(player1);
    
    // Recalculate ratings
    newTeams.forEach(team => {
      team.total_rating = team.players.reduce((sum, p) => {
        if (p.is_unknown) return sum;
        return sum + (p.skill_rating || 3);
      }, 0);
    });
    
    setEditedTeams(newTeams);
    setSelectedPlayer(null);
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="text-xs text-gray-400">-</span>;
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

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">Manual Edit Mode</p>
              <p className="text-sm text-blue-700">
                {selectedPlayer 
                  ? `Click another player to swap with ${selectedPlayer.player.name}`
                  : 'Click on a player, then click another player to swap them'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {editedTeams.map((team, teamIndex) => {
          // Sort players by skill rating (highest first)
          const sortedPlayers = [...team.players].sort((a, b) => {
            if (a.is_unknown && b.is_unknown) return 0;
            if (a.is_unknown) return 1;
            if (b.is_unknown) return -1;
            return (b.skill_rating || 3) - (a.skill_rating || 3);
          });

          return (
            <Card key={teamIndex} className="border-2 border-gray-200">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{team.team_name}</CardTitle>
                  <Badge className="bg-emerald-600">
                    Rating: {team.total_rating.toFixed(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {sortedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedPlayer?.player.id === player.id
                          ? 'border-blue-500 bg-blue-50'
                          : selectedPlayer
                          ? 'border-green-300 bg-green-50 hover:border-green-500'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                      onClick={() => {
                        if (!selectedPlayer) {
                          // First player selected
                          setSelectedPlayer({ player, fromTeamIndex: teamIndex });
                        } else if (selectedPlayer.player.id === player.id) {
                          // Clicked same player - deselect
                          setSelectedPlayer(null);
                        } else {
                          // Second player selected - swap them
                          swapPlayers(
                            selectedPlayer.player, 
                            selectedPlayer.fromTeamIndex,
                            player,
                            teamIndex
                          );
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{player.name}</p>
                          {player.is_unknown ? (
                            <Badge variant="outline" className="mt-1 text-xs bg-orange-100 text-orange-700">
                              Unknown
                            </Badge>
                          ) : (
                            <div className="flex gap-2 items-center mt-1">
                              {renderStars(player.skill_rating)}
                              {player.positions && (
                                <span className="text-xs text-gray-500">
                                  {player.positions.join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedPlayer?.player.id === player.id && (
                          <Badge className="bg-blue-600">Selected</Badge>
                        )}
                        {selectedPlayer && selectedPlayer.player.id !== player.id && (
                          <ArrowLeftRight className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedPlayer(null);
            onCancel();
          }}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onSave(editedTeams)}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
