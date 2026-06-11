import React, { useState, useEffect } from "react";
import { client } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trophy, Loader2, Calendar, Share2, Save, Pencil, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import SoccerField from "../components/match/SoccerField";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ViewMatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('id');
  const user = useAuthGuard();
  const [editedTeams, setEditedTeams] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const matches = await client.entities.Match.filter({ id: matchId });
      return matches[0] || null;
    },
    enabled: !!matchId && !!user
  });

  useEffect(() => {
    if (match && !editedTeams) {
      setEditedTeams(JSON.parse(JSON.stringify(match.generated_teams)));
    }
  }, [match, editedTeams]);

  const updateMutation = useMutation({
    mutationFn: async (updatedTeams) => {
      await client.entities.Match.update(matchId, {
        generated_teams: updatedTeams
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    },
    onError: () => {
      alert('Failed to save changes. Please try again.');
    }
  });

  const handleSwapPlayers = (player1, team1Index, player2, team2Index) => {
    const newTeams = [...editedTeams];
    
    const team1Players = [...newTeams[team1Index].players];
    const team2Players = [...newTeams[team2Index].players];
    
    const p1Index = team1Players.findIndex(p => p.id === player1.id);
    const p2Index = team2Players.findIndex(p => p.id === player2.id);
    
    if (p1Index === -1 || p2Index === -1) {
      console.warn('Player not found');
      return;
    }
    
    if (team1Index === team2Index) {
      [team1Players[p1Index], team1Players[p2Index]] = [team1Players[p2Index], team1Players[p1Index]];
      newTeams[team1Index].players = team1Players;
    } else {
      team1Players[p1Index] = player2;
      team2Players[p2Index] = player1;
      newTeams[team1Index].players = team1Players;
      newTeams[team2Index].players = team2Players;
    }
    
    newTeams.forEach(team => {
      team.total_rating = team.players.reduce((sum, p) => {
        if (p.is_unknown) return sum;
        return sum + (p.skill_rating || 3);
      }, 0);
    });
    
    setEditedTeams(newTeams);
    setHasChanges(true);
  };

  const handlePlayerEdit = (teamIndex, playerId, updates) => {
    const newTeams = [...editedTeams];
    const playerIndex = newTeams[teamIndex].players.findIndex(p => p.id === playerId);
    
    if (playerIndex !== -1) {
      newTeams[teamIndex].players[playerIndex] = {
        ...newTeams[teamIndex].players[playerIndex],
        ...updates
      };
      
      newTeams[teamIndex].total_rating = newTeams[teamIndex].players.reduce((sum, p) => {
        if (p.is_unknown) return sum;
        return sum + (p.skill_rating || 3);
      }, 0);
      
      setEditedTeams(newTeams);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(editedTeams);
  };

  const handleShareWhatsApp = () => {
    if (!match || !editedTeams) return;

    const shirtColors = [
      "חולצה לבנה וחולצה אדומה 🟥⬜",
      "חולצה לבנה וחולצה שחורה ⬜⬛",
      "חולצה אדומה וחולצה שחורה 🟥⬛"
    ];

    let message = `⚽ *${match.match_name}*\n`;
    message += `20:45 במגרש לסדר ולעשות חימום חזק\n\n`;

    editedTeams.forEach((team, index) => {
      const shirtText = index < shirtColors.length ? ` *${shirtColors[index]}*` : '';
      message += `*${team.team_name}*${shirtText}\n`;
      
      team.players.forEach((player) => {
        message += `${player.name}\n`;
      });
      
      if (index < editedTeams.length - 1) {
        message += `\n`;
      }
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
          <p className="text-gray-500 mt-3">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Match not found</p>
            <Button onClick={() => navigate(createPageUrl("Matches"))}>
              Back to Matches
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Matches"))}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Matches
          </Button>

          <Card className="border-2 border-emerald-200 mb-8 bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="p-8">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Trophy className="w-8 h-8 text-emerald-600" />
                    <h1 className="text-3xl font-bold text-gray-900">{match.match_name}</h1>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {match.match_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(match.match_date), 'PPP')}
                      </div>
                    )}
                    <div>Formation: <span className="font-semibold">{match.formation}</span></div>
                    <div>{match.attending_player_ids?.length || 0} players</div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => navigate(`${createPageUrl("CreateMatch")}?edit=${matchId}`)}
                    variant="outline"
                    className="border-2 border-blue-300 hover:bg-blue-50"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Match Setup
                  </Button>
                  {saveSuccess && !hasChanges && (
                    <span className="flex items-center gap-1 text-sm text-green-600 font-medium px-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Saved!
                    </span>
                  )}
                  {hasChanges && (
                    <Button
                      onClick={handleSave}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={handleShareWhatsApp}
                    variant="outline"
                    className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share to WhatsApp
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-blue-50 mb-6">
            <CardContent className="p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">💡 Tip:</span> Click on any player, then click another player to swap them. 
                Players will swap positions exactly - they stay in the same spot on the field.
              </p>
            </CardContent>
          </Card>

          {editedTeams && editedTeams.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-8">
              {editedTeams.map((team, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <SoccerField 
                    team={team} 
                    formation={match.formation}
                    teamIndex={index}
                    allTeams={editedTeams}
                    onSwapPlayers={handleSwapPlayers}
                    selectedPlayer={selectedPlayer}
                    onPlayerSelect={setSelectedPlayer}
                    onPlayerEdit={handlePlayerEdit}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">No teams generated yet</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}