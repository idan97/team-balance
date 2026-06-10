import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, X, Star } from "lucide-react";

export default function PreAssignPlayers({ players, teamsCount, preAssignedTeams, onPreAssign, onRemovePreAssign }) {
  const teams = Array.from({ length: teamsCount }, (_, i) => i);
  
  const getAvailablePlayers = () => {
    const assignedIds = Object.values(preAssignedTeams).flat();
    return players.filter(p => !assignedIds.includes(p.id));
  };

  const getTeamPlayers = (teamIndex) => {
    const playerIds = preAssignedTeams[teamIndex] || [];
    return players.filter(p => playerIds.includes(p.id));
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex gap-0.5">
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

  const availablePlayers = getAvailablePlayers();
  const hasPreAssignments = Object.values(preAssignedTeams).some(team => team && team.length > 0);

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Pre-Assign Players (Optional)
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Manually assign specific players to teams. The algorithm will balance the remaining players.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {teams.map((teamIndex) => {
            const teamPlayers = getTeamPlayers(teamIndex);
            const teamName = `Team ${String.fromCharCode(65 + teamIndex)}`;
            
            return (
              <Card key={teamIndex} className="border-2 border-emerald-200">
                <CardHeader className="bg-emerald-50 py-3">
                  <CardTitle className="text-sm font-semibold">{teamName}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {teamPlayers.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">No pre-assigned players</p>
                  ) : (
                    <div className="space-y-2">
                      {teamPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{player.name}</p>
                            {!player.is_unknown && renderStars(player.skill_rating)}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemovePreAssign(teamIndex, player.id)}
                            className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {availablePlayers.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Available Players - Click to assign to a team:</p>
            <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
              {availablePlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-white p-2 rounded border-2 border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{player.name}</p>
                      {!player.is_unknown && renderStars(player.skill_rating)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {teams.map((teamIndex) => (
                      <Button
                        key={teamIndex}
                        size="sm"
                        variant="outline"
                        onClick={() => onPreAssign(teamIndex, player.id)}
                        className="flex-1 h-7 text-xs bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                      >
                        {String.fromCharCode(65 + teamIndex)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}