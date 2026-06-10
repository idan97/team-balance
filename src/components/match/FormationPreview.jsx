import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function FormationPreview({ formation, playersPerTeam }) {
  const parseFormation = (formationString) => {
    if (!formationString) return [];
    const parts = formationString.split('-').map(Number).filter(n => !isNaN(n));
    return parts;
  };

  const formationRows = parseFormation(formation);
  const totalFieldPlayers = formationRows.reduce((sum, num) => sum + num, 0);
  const totalPlayers = totalFieldPlayers + 1; // +1 for goalkeeper
  const isValid = totalPlayers === playersPerTeam;

  return (
    <Card className={`border-2 ${isValid ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Formation Preview</h3>
          {isValid ? (
            <Badge className="bg-emerald-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Valid
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Invalid
            </Badge>
          )}
        </div>

        <div className="relative w-full aspect-[2/3] bg-gradient-to-b from-emerald-600 to-emerald-700 rounded-lg overflow-hidden">
          {/* Field markings */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-10 border-2 border-white rounded-b-full" />
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white transform -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white rounded-full" />
          </div>

          {/* Goalkeeper */}
          <div
            className="absolute left-1/2 top-[8%] transform -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
              <span className="text-xs font-bold">GK</span>
            </div>
          </div>

          {/* Field players */}
          {formationRows.map((playersInRow, rowIndex) => {
            const topPercent = ((rowIndex + 1) / (formationRows.length + 1)) * 80 + 10;
            
            return Array(playersInRow).fill(0).map((_, colIndex) => {
              const leftPercent = ((colIndex + 1) / (playersInRow + 1)) * 100;
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`
                  }}
                >
                  <div className="w-8 h-8 bg-white rounded-full border-2 border-emerald-800 flex items-center justify-center shadow-lg">
                    <span className="text-xs font-bold text-gray-900">
                      {rowIndex * 3 + colIndex + 1}
                    </span>
                  </div>
                </div>
              );
            });
          })}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Goalkeeper:</span>
            <span className="font-semibold">1</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Field players:</span>
            <span className="font-semibold">{totalFieldPlayers}</span>
          </div>
          <div className="flex justify-between text-xs font-bold border-t pt-2">
            <span className="text-gray-900">Total players:</span>
            <span className={isValid ? 'text-emerald-600' : 'text-orange-600'}>
              {totalPlayers} {isValid ? '✓' : `(need ${playersPerTeam})`}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}