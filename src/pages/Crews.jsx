import React, { useState, useEffect } from "react";
import { client } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trophy, Users, Calendar, Share2, Loader2, Edit, Trash2, LogIn, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Crews() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCrew, setEditingCrew] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_stars: 7,
    shared_with_emails: []
  });
  const [emailInput, setEmailInput] = useState('');
  const queryClient = useQueryClient();

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

  const { data: myCrews = [], isLoading } = useQuery({
    queryKey: ['myCrews', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await client.entities.Crew.filter({ created_by: user.email }, '-created_date');
    },
    enabled: !!user
  });

  const { data: sharedCrews = [] } = useQuery({
    queryKey: ['sharedCrews', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allCrews = await client.entities.Crew.list('-created_date');
      return allCrews.filter(crew =>
        crew.shared_with_emails && crew.shared_with_emails.includes(user.email)
      );
    },
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => client.entities.Crew.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCrews'] });
      setShowForm(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Crew.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCrews'] });
      queryClient.invalidateQueries({ queryKey: ['sharedCrews'] });
      setShowForm(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.entities.Crew.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCrews'] });
    }
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', max_stars: 7, shared_with_emails: [] });
    setEditingCrew(null);
    setEmailInput('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a crew name');
      return;
    }

    if (editingCrew) {
      updateMutation.mutate({ id: editingCrew.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (crew) => {
    setEditingCrew(crew);
    setFormData({
      name: crew.name,
      description: crew.description || '',
      max_stars: crew.max_stars,
      shared_with_emails: crew.shared_with_emails || []
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure? This will delete all players and matches in this crew.')) {
      deleteMutation.mutate(id);
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

  const selectCrew = (crew) => {
    localStorage.setItem('selectedCrewId', crew.id);
    navigate(createPageUrl("Home"));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-emerald-600" />
              My Crews
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage your soccer crews/leagues
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Crew
          </Button>
        </motion.div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="border-2 border-emerald-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                  <CardTitle>{editingCrew ? 'Edit Crew' : 'Create New Crew'}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label>Crew Name</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Sunday League"
                          required
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

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          resetForm();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingCrew ? 'Update Crew' : 'Create Crew'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Crews */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">My Crews</h2>
              {myCrews.length === 0 ? (
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-12 text-center">
                    <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No crews yet</h3>
                    <p className="text-gray-600 mb-6">Create your first crew to get started</p>
                    <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-5 h-5 mr-2" />
                      Create First Crew
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myCrews.map(crew => (
                    <motion.div
                      key={crew.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="border-2 border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300">
                        <CardHeader className="bg-gradient-to-br from-emerald-50 to-green-50">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Trophy className="w-5 h-5" />
                            {crew.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="space-y-3 text-sm mb-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Star className="w-4 h-4" />
                              Rating: 1-{crew.max_stars} stars
                            </div>
                            {crew.shared_with_emails?.length > 0 && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Share2 className="w-4 h-4" />
                                Shared with {crew.shared_with_emails.length} {crew.shared_with_emails.length === 1 ? 'person' : 'people'}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => selectCrew(crew)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <LogIn className="w-4 h-4 mr-2" />
                              Open
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(crew)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(crew.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Crews */}
            {sharedCrews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Shared with Me</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sharedCrews.map(crew => (
                    <motion.div
                      key={crew.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="border-2 border-blue-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300">
                        <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-600" />
                            {crew.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="space-y-3 text-sm mb-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Star className="w-4 h-4" />
                              Rating: 1-{crew.max_stars} stars
                            </div>
                            <div className="text-xs text-gray-500">
                              Owner: {crew.created_by}
                            </div>
                          </div>
                          <Button
                            onClick={() => selectCrew(crew)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <LogIn className="w-4 h-4 mr-2" />
                            Open
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
