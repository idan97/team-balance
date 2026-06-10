import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Save, X } from "lucide-react";
import { motion } from "framer-motion";

const positions = [
  { value: 'goalkeeper', label: 'Goalkeeper', icon: '🥅' },
  { value: 'defender', label: 'Defender', icon: '🛡️' },
  { value: 'cb', label: 'Center Back', icon: '🔰' },
  { value: 'midfielder', label: 'Midfielder', icon: '⚡' },
  { value: 'striker', label: 'Striker', icon: '🎯' }
];

export default function PlayerForm({ player, onSave, onCancel, maxStars = 7 }) {
  const defaultRating = Math.ceil(maxStars / 2);
  
  const [formData, setFormData] = useState(player || {
    name: '',
    positions: [],
    skill_rating: defaultRating,
    is_unknown: false
  });

  const togglePosition = (position) => {
    if (formData.is_unknown) return;
    
    const positions = formData.positions || [];
    if (positions.includes(position)) {
      setFormData({ ...formData, positions: positions.filter(p => p !== position) });
    } else {
      setFormData({ ...formData, positions: [...positions, position] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a player name');
      return;
    }
    
    if (!formData.is_unknown && (!formData.positions || formData.positions.length === 0)) {
      alert('Please select at least one position');
      return;
    }
    
    onSave(formData);
  };

  const toggleUnknown = (checked) => {
    setFormData({
      ...formData,
      is_unknown: checked,
      positions: checked ? [] : formData.positions,
      skill_rating: checked ? undefined : (formData.skill_rating || defaultRating)
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <Card className="border-2 border-emerald-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
          <CardTitle>{player ? 'Edit Player' : 'Add New Player'}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Player Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter player name"
                className="mt-2"
                required
              />
            </div>

            <div className="flex items-center space-x-2 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
              <Checkbox
                id="is_unknown"
                checked={formData.is_unknown}
                onCheckedChange={toggleUnknown}
              />
              <label
                htmlFor="is_unknown"
                className="text-sm font-medium cursor-pointer flex-1"
              >
                Mark as Unknown Player (won't be positioned on field visualization)
              </label>
            </div>

            {!formData.is_unknown && (
              <>
                <div>
                  <Label className="mb-3 block">Positions</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {positions.map((pos) => (
                      <div
                        key={pos.value}
                        onClick={() => togglePosition(pos.value)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          (formData.positions || []).includes(pos.value)
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">{pos.icon}</div>
                          <p className="text-sm font-medium">{pos.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">
                    Skill Rating: {formData.skill_rating || defaultRating} stars
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: maxStars }, (_, i) => i + 1).map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFormData({ ...formData, skill_rating: rating })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            rating <= (formData.skill_rating || defaultRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {player ? 'Update' : 'Add'} Player
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}