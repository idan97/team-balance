import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Edit, Trash2, Shield, Target, Zap, Goal, UserX } from "lucide-react";
import { motion } from "framer-motion";

const positionIcons = {
  goalkeeper: Goal,
  defender: Shield,
  cb: Shield,
  midfielder: Zap,
  striker: Target
};

const positionColors = {
  goalkeeper: "bg-yellow-100 text-yellow-700 border-yellow-300",
  defender: "bg-blue-100 text-blue-700 border-blue-300",
  cb: "bg-indigo-100 text-indigo-700 border-indigo-300",
  midfielder: "bg-green-100 text-green-700 border-green-300",
  striker: "bg-red-100 text-red-700 border-red-300"
};

const positionLabels = {
  goalkeeper: "goalkeeper",
  defender: "defender",
  cb: "center back",
  midfielder: "midfielder",
  striker: "striker"
};

export default function PlayerCard({ player, onEdit, onDelete, maxStars = 7 }) {
  const renderStars = (rating) => {
    if (!rating) {
      return <span className="text-xs text-gray-400 italic">Not rated</span>;
    }
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-2 ${
        player.is_unknown ? 'border-orange-200 bg-orange-50/50' : 'border-gray-100 hover:border-emerald-200'
      }`}>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg text-gray-900">{player.name}</h3>
                {player.is_unknown && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    <UserX className="w-3 h-3 mr-1" />
                    Unknown
                  </Badge>
                )}
              </div>
              {!player.is_unknown && (
                <div className="mt-2">{renderStars(player.skill_rating)}</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(player)}
                className="hover:bg-emerald-50 hover:text-emerald-600"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(player.id)}
                className="hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {!player.is_unknown && (
            <div className="flex flex-wrap gap-2">
              {player.positions?.map((position) => {
                const Icon = positionIcons[position];
                return (
                  <Badge
                    key={position}
                    variant="outline"
                    className={`${positionColors[position]} border flex items-center gap-1`}
                  >
                    <Icon className="w-3 h-3" />
                    {positionLabels[position]}
                  </Badge>
                );
              })}
            </div>
          )}
          
          {player.is_unknown && (
            <p className="text-xs text-orange-600">
              Won't be positioned on field visualization
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}