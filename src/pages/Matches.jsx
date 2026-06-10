import React, { useState, useEffect } from "react";
import { client } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trophy, Calendar, Eye, Loader2, Trash2, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GameSelector from "../components/GameSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Matches() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const selectedGameId = localStorage.getItem('selectedGameId');

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await client.auth.isAuthenticated();
      if (!isAuth) {
        client.auth.redirectToLogin();
        return;
      }
      const currentUser = await client.auth.me();
      setUser(currentUser);
    };
    checkAuth();
  }, []);

  const { data: currentGame } = useQuery({
    queryKey: ['currentGame', selectedGameId],
    queryFn: async () => {
      if (!selectedGameId) return null;
      const allGames = await client.entities.Game.list();
      return allGames.find(g => g.id === selectedGameId) || null;
    },
    enabled: !!selectedGameId
  });

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', selectedGameId],
    queryFn: async () => {
      if (!selectedGameId) return [];
      return await client.entities.Match.filter({ game_id: selectedGameId }, '-created_date');
    },
    enabled: !!selectedGameId
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.entities.Match.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    }
  });

  const handleDelete = (match) => {
    if (window.confirm(`Are you sure you want to delete "${match.match_name}"?`)) {
      deleteMutation.mutate(match.id);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-lg text-gray-700">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <GameSelector currentGame={currentGame} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-emerald-600" />
              Matches
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage your soccer matches
            </p>
          </div>
          {selectedGameId && (
            <Link to={createPageUrl("CreateMatch")}>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Match
              </Button>
            </Link>
          )}
        </motion.div>

        {/* Matches List */}
        {selectedGameId && (
          <>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
              </div>
            ) : matches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No matches yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first match to get started
                </p>
                <Link to={createPageUrl("CreateMatch")}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-5 h-5 mr-2" />
                    Create First Match
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {matches.map((match) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Card className="border-2 border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300">
                        <CardHeader className="bg-gradient-to-br from-emerald-50 to-green-50">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg flex-1">{match.match_name}</CardTitle>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`${createPageUrl("ViewMatch")}?id=${match.id}`} className="cursor-pointer">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Teams
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(match)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Match
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {match.match_date ? format(new Date(match.match_date), 'PPP') : 'No date set'}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Trophy className="w-4 h-4" />
                              {match.teams_count} teams × {match.players_per_team} players
                            </div>
                            <div className="pt-3">
                              <Link to={`${createPageUrl("ViewMatch")}?id=${match.id}`} className="w-full">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Teams
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}