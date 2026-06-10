import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Zap, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormationPreview from "../components/match/FormationPreview";
import TeamAssignmentView from "../components/match/TeamAssignmentView";
import FriendRestrictions from "../components/match/FriendRestrictions";
import PlayerSelectionTable from "../components/match/PlayerSelectionTable";
import GameSelector from "../components/GameSelector";
import { generateBalancedTeams } from "../components/utils/teamGeneration";

export default function CreateMatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const selectedGameId = localStorage.getItem('selectedGameId');
  const hasInitializedFromLastMatch = useRef(false);
  const urlParams = new URLSearchParams(window.location.search);
  const editMatchId = urlParams.get('edit');
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [matchName, setMatchName] = useState('');
  const [matchDate, setMatchDate] = useState(today);
  const [teamsCount, setTeamsCount] = useState(3);
  const [playersPerTeam, setPlayersPerTeam] = useState(7);
  const [formation, setFormation] = useState('3-2-1');
  const [attendingPlayerIds, setAttendingPlayerIds] = useState([]);
  const [preAssignedTeams, setPreAssignedTeams] = useState({});
  const [friendRestrictions, setFriendRestrictions] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin();
        return;
      }
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    hasInitializedFromLastMatch.current = false;
  }, [editMatchId]);

  const { data: currentGame } = useQuery({
    queryKey: ['currentGame', selectedGameId],
    queryFn: async () => {
      if (!selectedGameId) return null;
      const allGames = await base44.entities.Game.list();
      return allGames.find(g => g.id === selectedGameId) || null;
    },
    enabled: !!selectedGameId
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', selectedGameId],
    queryFn: async () => {
      if (!selectedGameId) return [];
      const allPlayers = await base44.entities.Player.list('name');
      return allPlayers.filter(p => p.game_ids && p.game_ids.includes(selectedGameId));
    },
    enabled: !!selectedGameId
  });

  const { data: editingMatch } = useQuery({
    queryKey: ['editMatch', editMatchId],
    queryFn: async () => {
      const matches = await base44.entities.Match.list();
      return matches.find(m => m.id === editMatchId);
    },
    enabled: !!editMatchId
  });

  const { data: lastMatch } = useQuery({
    queryKey: ['lastMatch', selectedGameId],
    queryFn: async () => {
      if (!selectedGameId) return null;
      const matches = await base44.entities.Match.filter({ game_id: selectedGameId }, '-created_date', 1);
      return matches[0] || null;
    },
    enabled: !!selectedGameId && !editMatchId
  });

  useEffect(() => {
    if (editMatchId && editingMatch && !hasInitializedFromLastMatch.current) {
      setMatchName(editingMatch.match_name || '');
      setMatchDate(editingMatch.match_date || today);
      setTeamsCount(editingMatch.teams_count || 3);
      setPlayersPerTeam(editingMatch.players_per_team || 7);
      setFormation(editingMatch.formation || '3-2-1');
      setAttendingPlayerIds(editingMatch.attending_player_ids || []);
      setPreAssignedTeams(editingMatch.pre_assigned_teams || {});
      setFriendRestrictions(editingMatch.friend_restrictions || []);
      hasInitializedFromLastMatch.current = true;
    } else if (!editMatchId && lastMatch?.attending_player_ids?.length > 0 && !hasInitializedFromLastMatch.current) {
      setAttendingPlayerIds(lastMatch.attending_player_ids);
      hasInitializedFromLastMatch.current = true;
    } else if (!editMatchId && !lastMatch && players.length > 0 && !hasInitializedFromLastMatch.current) {
      const defaultPlayerIds = players.filter(p => p.is_default).map(p => p.id);
      if (defaultPlayerIds.length > 0) {
        setAttendingPlayerIds(defaultPlayerIds);
        hasInitializedFromLastMatch.current = true;
      }
    }
  }, [editMatchId, editingMatch, lastMatch, players, today]);

  const attendingPlayers = useMemo(() => 
    players.filter(p => attendingPlayerIds.includes(p.id)),
    [players, attendingPlayerIds]
  );

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const attendingPlayers = players.filter(p => data.attending_player_ids.includes(p.id));
      
      const teams = generateBalancedTeams(
        attendingPlayers,
        data.teams_count,
        data.players_per_team,
        data.pre_assigned_teams,
        data.friend_restrictions,
        currentGame?.max_stars || 7,
        data.formation
      );
      
      const finalMatchName = data.match_name.trim() || `Match ${format(new Date(data.match_date), 'MMM d, yyyy')}`;
      
      const matchData = {
        game_id: selectedGameId,
        match_name: finalMatchName,
        match_date: data.match_date,
        teams_count: data.teams_count,
        players_per_team: data.players_per_team,
        formation: data.formation,
        attending_player_ids: data.attending_player_ids,
        pre_assigned_teams: data.pre_assigned_teams,
        friend_restrictions: data.friend_restrictions,
        generated_teams: teams
      };
      
      if (editMatchId) {
        const match = await base44.entities.Match.update(editMatchId, matchData);
        return match;
      } else {
        const match = await base44.entities.Match.create(matchData);
        return match;
      }
    },
    onSuccess: (match) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['match'] });
      navigate(`${createPageUrl("ViewMatch")}?id=${match.id}`);
    }
  });

  const togglePlayer = useCallback((playerId) => {
    setAttendingPlayerIds(prev => {
      const isSelected = prev.includes(playerId);
      if (isSelected) {
        setPreAssignedTeams(current => {
          const updated = { ...current };
          Object.keys(updated).forEach(teamIndex => {
            if (updated[teamIndex]) {
              updated[teamIndex] = updated[teamIndex].filter(id => id !== playerId);
            }
          });
          return updated;
        });
        
        setFriendRestrictions(current => 
          current.map(group => group.filter(id => id !== playerId))
            .filter(group => group.length >= 2)
        );
        
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  }, []);

  const handlePreAssign = useCallback((teamIndex, playerId) => {
    setPreAssignedTeams(prev => ({
      ...prev,
      [teamIndex]: [...(prev[teamIndex] || []), playerId]
    }));
  }, []);

  const handleRemovePreAssign = useCallback((teamIndex, playerId) => {
    setPreAssignedTeams(prev => ({
      ...prev,
      [teamIndex]: (prev[teamIndex] || []).filter(id => id !== playerId)
    }));
  }, []);

  const handleUpdateFriendRestrictions = useCallback((restrictions) => {
    setFriendRestrictions(restrictions);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const requiredPlayers = teamsCount * playersPerTeam;
    
    if (attendingPlayerIds.length > requiredPlayers) {
      alert(`You have selected ${attendingPlayerIds.length} players, but only ${requiredPlayers} are needed. Please deselect ${attendingPlayerIds.length - requiredPlayers} player(s).`);
      return;
    }
    
    if (attendingPlayerIds.length < requiredPlayers) {
      alert(`You need exactly ${requiredPlayers} players for this match configuration`);
      return;
    }
    
    const formationParts = formation.split('-').map(Number).filter(n => !isNaN(n));
    const totalFieldPlayers = formationParts.reduce((sum, num) => sum + num, 0);
    const totalPlayers = totalFieldPlayers + 1; // Assuming 1 goalkeeper
    
    if (totalPlayers !== playersPerTeam) {
      alert(`Formation ${formation} requires ${totalPlayers} players, but you have ${playersPerTeam} per team. Please adjust the formation or players per team.`);
      return;
    }
    
    createMutation.mutate({
      match_name: matchName,
      match_date: matchDate,
      teams_count: teamsCount,
      players_per_team: playersPerTeam,
      formation: formation,
      attending_player_ids: attendingPlayerIds,
      pre_assigned_teams: preAssignedTeams,
      friend_restrictions: friendRestrictions
    });
  };

  const requiredPlayers = teamsCount * playersPerTeam;

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <GameSelector currentGame={currentGame} />
        
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

          {selectedGameId && (
            <Card className="border-2 border-emerald-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                <CardTitle className="text-2xl">
                  {editMatchId ? 'Edit Match Setup' : 'Create New Match'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Match Name (Optional)</Label>
                          <Input
                            value={matchName}
                            onChange={(e) => setMatchName(e.target.value)}
                            placeholder="Sunday Game"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={matchDate}
                            onChange={(e) => setMatchDate(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Teams</Label>
                          <Input
                            type="number"
                            min="2"
                            max="3"
                            value={teamsCount}
                            onChange={(e) => setTeamsCount(parseInt(e.target.value))}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Players/Team</Label>
                          <Input
                            type="number"
                            min="5"
                            max="11"
                            value={playersPerTeam}
                            onChange={(e) => setPlayersPerTeam(parseInt(e.target.value))}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Formation</Label>
                          <Input
                            value={formation}
                            onChange={(e) => setFormation(e.target.value)}
                            placeholder="3-2-1"
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-1">
                      <FormationPreview 
                        formation={formation}
                        playersPerTeam={playersPerTeam}
                      />
                    </div>
                  </div>

                  <Tabs defaultValue="select" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="select">1. Select Players</TabsTrigger>
                      <TabsTrigger value="friends" disabled={attendingPlayerIds.length < 2}>
                        2. Friend Groups
                      </TabsTrigger>
                      <TabsTrigger value="assign" disabled={attendingPlayerIds.length === 0}>
                        3. Manual Assignment
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="select" className="mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <Label className="text-lg">Select Attending Players</Label>
                        <div className="text-sm">
                          <span className={
                            attendingPlayerIds.length === requiredPlayers 
                              ? "text-green-600 font-semibold" 
                              : attendingPlayerIds.length > requiredPlayers
                              ? "text-red-600 font-semibold"
                              : "text-orange-600 font-semibold"
                          }>
                            {attendingPlayerIds.length} / {requiredPlayers} needed
                          </span>
                        </div>
                      </div>
                      
                      {players.length === 0 ? (
                        <Card className="bg-yellow-50 border-yellow-200">
                          <CardContent className="p-6 text-center">
                            <p className="text-yellow-800">
                              No players available. Add players first!
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <PlayerSelectionTable
                          players={players}
                          selectedPlayerIds={attendingPlayerIds}
                          onTogglePlayer={togglePlayer}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="friends" className="mt-6">
                      {attendingPlayers.length > 0 && (
                        <FriendRestrictions
                          players={attendingPlayers}
                          friendRestrictions={friendRestrictions}
                          onUpdate={handleUpdateFriendRestrictions}
                          preAssignedTeams={preAssignedTeams}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="assign" className="mt-6">
                      {attendingPlayers.length > 0 && (
                        <TeamAssignmentView
                          players={attendingPlayers}
                          teamsCount={teamsCount}
                          preAssignedTeams={preAssignedTeams}
                          onPreAssign={handlePreAssign}
                          onRemovePreAssign={handleRemovePreAssign}
                          friendRestrictions={friendRestrictions}
                          playersPerTeam={playersPerTeam}
                        />
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(createPageUrl("Matches"))}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={createMutation.isPending || attendingPlayerIds.length !== requiredPlayers}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          {editMatchId ? 'Update Teams' : 'Generate Teams'}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}