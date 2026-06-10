import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function TopPlayers({ players }) {
  const navigate = useNavigate();
  const topPlayers = players
    .filter(p => p.skill_rating && !p.is_unknown)
    .sort((a, b) => b.skill_rating - a.skill_rating)
    .slice(0, 5);

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
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

  if (topPlayers.length === 0) {
    return (
      <Card className="border-2 border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Top Rated Players
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No rated players yet</p>
          <Button
            onClick={() => navigate(createPageUrl("Players"))}
            variant="outline"
          >
            Add Players
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Top Rated Players
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl("Players"))}
            className="text-emerald-600 hover:text-emerald-700"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {topPlayers.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-50 transition-all duration-300"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{player.name}</p>
              {renderStars(player.skill_rating)}
            </div>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              {player.skill_rating} ★
            </Badge>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}