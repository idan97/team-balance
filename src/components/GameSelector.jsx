import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function GameSelector({ currentGame, onGameChange }) {
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_stars: 7,
    shared_with_emails: []
  });
  const [emailInput, setEmailInput] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: myGames = [] } = useQuery({
    queryKey: ['myGames', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Game.filter({ created_by: user.email }, '-created_date');
    },
    enabled: !!user
  });

  const { data: sharedGames = [] } = useQuery({
    queryKey: ['sharedGames', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allGames = await base44.entities.Game.list('-created_date');
      return allGames.filter(game => 
        game.shared_with_emails && game.shared_with_emails.includes(user.email)
      );
    },
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Game.create(data),
    onSuccess: (newGame) => {
      queryClient.invalidateQueries({ queryKey: ['myGames'] });
      setShowCreateDialog(false);
      resetForm();
      selectGame(newGame);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Game.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGames'] });
      queryClient.invalidateQueries({ queryKey: ['sharedGames'] });
      queryClient.invalidateQueries({ queryKey: ['currentGame'] });
      setShowEditDialog(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', max_stars: 7, shared_with_emails: [] });
    setEmailInput('');
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      alert('Please enter a game name');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      alert('Please enter a game name');
      return;
    }
    updateMutation.mutate({ id: currentGame.id, data: formData });
  };

  const selectGame = (game) => {
    localStorage.setItem('selectedGameId', game.id);
    if (onGameChange) onGameChange(game);
    window.location.reload();
  };

  const openEditDialog = () => {
    if (currentGame) {
      setFormData({
        name: currentGame.name,
        description: currentGame.description || '',
        max_stars: currentGame.max_stars || 7,
        shared_with_emails: currentGame.shared_with_emails || []
      });
      setShowEditDialog(true);
    }
  };

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (formData.shared_with_emails.includes(email)) {
      alert('This email is already added');
      return;
    }

    setFormData({
      ...formData,
      shared_with_emails: [...formData.shared_with_emails, email]
    });
    setEmailInput('');
  };

  const handleRemoveEmail = (email) => {
    setFormData({
      ...formData,
      shared_with_emails: formData.shared_with_emails.filter(e => e !== email)
    });
  };

  const allGames = [...myGames, ...sharedGames];
  const isOwner = currentGame && currentGame.created_by === user?.email;

  return (
    <>
      <div className="mb-6 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full md:w-auto border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-left justify-between min-w-[200px]"
            >
              <span className="font-semibold text-emerald-900">
                {currentGame ? currentGame.name : 'Select Game'}
              </span>
              <ChevronDown className="w-4 h-4 ml-2 text-emerald-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {myGames.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">My Games</div>
                {myGames.map(game => (
                  <DropdownMenuItem
                    key={game.id}
                    onClick={() => selectGame(game)}
                    className={currentGame?.id === game.id ? 'bg-emerald-50' : ''}
                  >
                    <span className="font-medium">{game.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            
            {sharedGames.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Shared with Me</div>
                {sharedGames.map(game => (
                  <DropdownMenuItem
                    key={game.id}
                    onClick={() => selectGame(game)}
                    className={currentGame?.id === game.id ? 'bg-emerald-50' : ''}
                  >
                    <span className="font-medium">{game.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Game
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {currentGame && isOwner && (
          <Button
            variant="outline"
            size="icon"
            onClick={openEditDialog}
            className="border-emerald-200 hover:bg-emerald-50"
            title="Edit Game"
          >
            <Settings className="w-4 h-4 text-emerald-700" />
          </Button>
        )}
      </div>

      {/* Create Game Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Game Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Sunday League"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Max Star Rating</Label>
              <Input
                type="number"
                min="3"
                max="10"
                value={formData.max_stars}
                onChange={(e) => setFormData({ ...formData, max_stars: parseInt(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Players will be rated from 1 to {formData.max_stars} stars
              </p>
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Weekend games with friends..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={createMutation.isPending}
            >
              Create Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Game Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Game Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Sunday League"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Max Star Rating</Label>
              <Input
                type="number"
                min="3"
                max="10"
                value={formData.max_stars}
                onChange={(e) => setFormData({ ...formData, max_stars: parseInt(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Players will be rated from 1 to {formData.max_stars} stars
              </p>
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Weekend games with friends..."
                className="mt-2"
              />
            </div>
            <div>
              <Label>Share with Others</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="email@example.com"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                />
                <Button type="button" onClick={handleAddEmail} variant="outline">
                  Add
                </Button>
              </div>
              {formData.shared_with_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.shared_with_emails.map(email => (
                    <div key={email} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="hover:text-emerald-900"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}