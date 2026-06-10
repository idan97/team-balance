import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Users, Eye, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function RecentMatches({ matches }) {
  const navigate = useNavigate();
  const recentMatches = matches.slice(0, 3);

  if (matches.length === 0) {
    return (
      <Card className="border-2 border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            Recent Matches
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No matches yet</p>
          <Button
            onClick={() => navigate(createPageUrl("CreateMatch"))}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Create Your First Match
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
            <Trophy className="w-5 h-5 text-emerald-600" />
            Recent Matches
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl("Matches"))}
            className="text-emerald-600 hover:text-emerald-700"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentMatches.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border hover:border-emerald-300 hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`${createPageUrl("ViewMatch")}?id=${match.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">{match.match_name}</h4>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      {match.match_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(match.match_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {match.attending_player_ids?.length || 0} players
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {match.formation}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}