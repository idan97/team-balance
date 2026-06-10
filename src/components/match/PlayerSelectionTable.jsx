import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Star, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PlayerSelectionTable({ players, selectedPlayerIds, onTogglePlayer }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rating' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-3 h-3 ml-1 text-emerald-600" /> : 
      <ArrowDown className="w-3 h-3 ml-1 text-emerald-600" />;
  };

  const getPositionPriority = (playerPositions) => {
    if (!playerPositions || playerPositions.length === 0) return 999;
    const priorities = { goalkeeper: 1, cb: 2, defender: 3, midfielder: 4, striker: 5 };
    const positionPriorities = playerPositions.map(pos => priorities[pos] || 999);
    return Math.min(...positionPriorities);
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="text-gray-400 text-xs">-</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7].map((star) => (
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

  const filteredPlayers = players
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = positionFilter === "all" || 
        (player.positions && player.positions.includes(positionFilter));
      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      let compareA, compareB;
      
      switch(sortField) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'rating':
          compareA = a.skill_rating || 0;
          compareB = b.skill_rating || 0;
          break;
        case 'positions':
          compareA = getPositionPriority(a.positions);
          compareB = getPositionPriority(b.positions);
          break;
        default:
          return 0;
      }
      
      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="goalkeeper">GK</SelectItem>
            <SelectItem value="cb">CB</SelectItem>
            <SelectItem value="defender">DEF</SelectItem>
            <SelectItem value="midfielder">MID</SelectItem>
            <SelectItem value="striker">STR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-96 overflow-y-auto border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 z-10">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="font-bold">
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="flex items-center hover:text-emerald-700 transition-colors"
                >
                  Name
                  <SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead className="font-bold">
                <button
                  type="button"
                  onClick={() => handleSort('rating')}
                  className="flex items-center hover:text-emerald-700 transition-colors"
                >
                  Rating
                  <SortIcon field="rating" />
                </button>
              </TableHead>
              <TableHead className="font-bold">
                <button
                  type="button"
                  onClick={() => handleSort('positions')}
                  className="flex items-center hover:text-emerald-700 transition-colors"
                >
                  Positions
                  <SortIcon field="positions" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.map((player) => (
              <TableRow
                key={player.id}
                className={`cursor-pointer transition-colors ${
                  selectedPlayerIds.includes(player.id)
                    ? 'bg-emerald-50 hover:bg-emerald-100'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onTogglePlayer(player.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedPlayerIds.includes(player.id)}
                    onCheckedChange={() => onTogglePlayer(player.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {player.name}
                  {player.is_unknown && (
                    <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 text-xs">
                      Unknown
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {player.is_unknown ? (
                    <span className="text-gray-400 text-xs">-</span>
                  ) : (
                    renderStars(player.skill_rating)
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {player.positions?.sort((a, b) => {
                      const priorities = { goalkeeper: 1, cb: 2, defender: 3, midfielder: 4, striker: 5 };
                      return (priorities[a] || 999) - (priorities[b] || 999);
                    }).map(pos => {
                      const posLabels = {
                        goalkeeper: { label: 'GK', color: 'bg-yellow-100 text-yellow-700' },
                        cb: { label: 'CB', color: 'bg-indigo-100 text-indigo-700' },
                        defender: { label: 'DEF', color: 'bg-blue-100 text-blue-700' },
                        midfielder: { label: 'MID', color: 'bg-green-100 text-green-700' },
                        striker: { label: 'STR', color: 'bg-red-100 text-red-700' }
                      };
                      const posData = posLabels[pos];
                      return posData ? (
                        <Badge key={pos} className={`${posData.color} text-xs`}>
                          {posData.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}