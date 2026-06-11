import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Zap, Target, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { client } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CrewSelector from "../components/CrewSelector";

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedCrewId, setSelectedCrewId] = useState(localStorage.getItem('selectedCrewId'));

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

  // Ensure default crew exists
  const { data: allCrews = [], isLoading: crewsLoading } = useQuery({
    queryKey: ['allCrews', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const myCrews = await client.entities.Crew.filter({ created_by: user.email });
      const allCrews = await client.entities.Crew.list();
      const sharedCrews = allCrews.filter(g =>
        g.shared_with_emails && g.shared_with_emails.includes(user.email)
      );
      return [...myCrews, ...sharedCrews];
    },
    enabled: !!user
  });

  const createDefaultCrewMutation = useMutation({
    mutationFn: async () => {
      const defaultCrew = await client.entities.Crew.create({
        name: "My Crew",
        max_stars: 7,
        description: "Your default crew"
      });
      return defaultCrew;
    },
    onSuccess: (newCrew) => {
      localStorage.setItem('selectedCrewId', newCrew.id);
      setSelectedCrewId(newCrew.id);
      queryClient.invalidateQueries({ queryKey: ['allCrews'] });
      queryClient.invalidateQueries({ queryKey: ['currentCrew'] });
    }
  });

  // Migrate orphaned players to default crew
  const migratePlayersMutation = useMutation({
    mutationFn: async (crewId) => {
      const allPlayers = await client.entities.Player.list();
      const orphanedPlayers = allPlayers.filter(p => !p.game_ids || p.game_ids.length === 0);

      for (const player of orphanedPlayers) {
        await client.entities.Player.update(player.id, { game_ids: [crewId] });
      }
    }
  });

  useEffect(() => {
    if (user && !crewsLoading && allCrews.length === 0) {
      createDefaultCrewMutation.mutate();
    } else if (user && !crewsLoading && allCrews.length > 0 && !selectedCrewId) {
      const defaultCrew = allCrews[0];
      localStorage.setItem('selectedCrewId', defaultCrew.id);
      setSelectedCrewId(defaultCrew.id);
      migratePlayersMutation.mutate(defaultCrew.id);
    } else if (user && !crewsLoading && selectedCrewId) {
      migratePlayersMutation.mutate(selectedCrewId);
    }
  }, [user, crewsLoading, allCrews, selectedCrewId]);

  const { data: currentCrew } = useQuery({
    queryKey: ['currentCrew', selectedCrewId],
    queryFn: async () => {
      if (!selectedCrewId) return null;
      const allCrews = await client.entities.Crew.list();
      return allCrews.find(g => g.id === selectedCrewId) || null;
    },
    enabled: !!selectedCrewId
  });

  const features = [
    {
      icon: Users,
      title: "Manage Players",
      description: "Add players with positions and skill ratings"
    },
    {
      icon: Zap,
      title: "Auto Balance",
      description: "AI-powered team balancing based on ratings"
    },
    {
      icon: Target,
      title: "Visual Formation",
      description: "See teams displayed on a soccer field"
    },
    {
      icon: Trophy,
      title: "Easy Editing",
      description: "Manually adjust teams after generation"
    }
  ];

  if (!user || crewsLoading || createDefaultCrewMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto w-full">
        <CrewSelector currentCrew={currentCrew} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Team Balancer ⚽
            </h1>
            <p className="text-xl text-gray-600 mb-2 max-w-2xl mx-auto">
              Create perfectly balanced soccer teams in seconds. Add your players, set formations, and let AI do the rest.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Welcome, {user.full_name || user.email}!
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-6 shadow-lg"
                onClick={() => navigate(createPageUrl("CreateMatch"))}
              >
                <Zap className="w-5 h-5 mr-2" />
                Create Match
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => navigate(createPageUrl("Players"))}
              >
                <Users className="w-5 h-5 mr-2" />
                Manage Players
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-16">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-2 border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 p-8 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6 text-left">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                  1
                </div>
                <p className="text-sm text-gray-700">Select or create a crew</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                  2
                </div>
                <p className="text-sm text-gray-700">Add players with skill ratings</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                  3
                </div>
                <p className="text-sm text-gray-700">Create match and select attendees</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                  4
                </div>
                <p className="text-sm text-gray-700">View balanced teams on field</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
