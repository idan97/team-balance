import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Users, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Zap,
      title: "Create Match",
      description: "Generate balanced teams for a new match",
      color: "bg-emerald-500",
      onClick: () => navigate(createPageUrl("CreateMatch"))
    },
    {
      icon: Users,
      title: "Manage Players",
      description: "Add or edit player information",
      color: "bg-blue-500",
      onClick: () => navigate(createPageUrl("Players"))
    },
    {
      icon: Trophy,
      title: "View Matches",
      description: "See all your past and upcoming matches",
      color: "bg-purple-500",
      onClick: () => navigate(createPageUrl("Matches"))
    }
  ];

  return (
    <Card className="border-2 border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              onClick={action.onClick}
              variant="outline"
              className="w-full h-auto p-4 justify-start hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300"
            >
              <div className="flex items-center gap-4 w-full">
                <div className={`p-3 rounded-xl ${action.color}`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">{action.title}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </div>
            </Button>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}