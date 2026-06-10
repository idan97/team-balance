import React, { useState, useEffect } from "react";
import { client } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Loader2, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function ImportPlayers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [gameName, setGameName] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [extractedData, setExtractedData] = useState(null);

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

  const importMutation = useMutation({
    mutationFn: async ({ file, gameName }) => {
      setStatus({ type: 'loading', message: 'Uploading file...' });
      
      // Upload file
      const { file_url } = await client.integrations.Core.UploadFile({ file });
      
      setStatus({ type: 'loading', message: 'Extracting player data...' });
      
      // Extract data with schema
      const result = await client.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  skill_rating: { type: "number" },
                  positions: {
                    type: "array",
                    items: { type: "string" }
                  },
                  is_unknown: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'error') {
        throw new Error(result.details || 'Failed to extract data from file');
      }

      const playersData = result.output?.players || result.output || [];
      
      if (!Array.isArray(playersData) || playersData.length === 0) {
        throw new Error('No valid player data found in file');
      }

      setExtractedData(playersData);
      setStatus({ type: 'loading', message: `Creating game with ${playersData.length} players...` });

      // Create game
      const game = await client.entities.Game.create({
        name: gameName || `Imported Game ${new Date().toLocaleDateString()}`
      });

      // Prepare players for bulk creation
      const playersToCreate = playersData.map(p => ({
        name: p.name,
        game_ids: [game.id],
        skill_rating: p.skill_rating || null,
        positions: p.positions || [],
        is_unknown: p.is_unknown || false
      }));

      // Bulk create players
      await client.entities.Player.bulkCreate(playersToCreate);

      // Set as selected game
      localStorage.setItem('selectedGameId', game.id);

      return { game, playersCount: playersData.length };
    },
    onSuccess: ({ game, playersCount }) => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setStatus({ 
        type: 'success', 
        message: `Successfully created game "${game.name}" with ${playersCount} players!` 
      });
      setTimeout(() => {
        navigate(createPageUrl("Players"));
      }, 2000);
    },
    onError: (error) => {
      setStatus({ 
        type: 'error', 
        message: error.message || 'Failed to import players' 
      });
    }
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus({ type: '', message: '' });
      setExtractedData(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setStatus({ type: 'error', message: 'Please select a file' });
      return;
    }
    importMutation.mutate({ file, gameName });
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
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Players"))}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Players
          </Button>

          <Card className="border-2 border-emerald-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
              <CardTitle className="text-2xl flex items-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                Import Players from File
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Instructions */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">📋 How to prepare your file:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                      <li>Export your Google Sheet/Doc as <strong>CSV</strong> or <strong>Excel</strong></li>
                      <li>Include columns: <code className="bg-blue-100 px-1 rounded">name</code> (required), <code className="bg-blue-100 px-1 rounded">skill_rating</code>, <code className="bg-blue-100 px-1 rounded">positions</code></li>
                      <li>For positions, use comma-separated values: goalkeeper, defender, cb, midfielder, striker</li>
                      <li>Skill rating should be a number (e.g., 1-7)</li>
                    </ol>
                  </CardContent>
                </Card>

                {/* Game Name */}
                <div>
                  <Label>Game Name (Optional)</Label>
                  <Input
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="My Team 2024"
                    className="mt-2"
                    disabled={importMutation.isPending}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to auto-generate a name
                  </p>
                </div>

                {/* File Upload */}
                <div>
                  <Label>Upload File</Label>
                  <div className="mt-2">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          {file ? (
                            <span className="font-semibold text-emerald-600">{file.name}</span>
                          ) : (
                            <>Click to upload <span className="font-semibold">CSV or Excel</span> file</>
                          )}
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={importMutation.isPending}
                      />
                    </label>
                  </div>
                </div>

                {/* Status Messages */}
                {status.message && (
                  <Card className={
                    status.type === 'error' ? 'bg-red-50 border-red-200' :
                    status.type === 'success' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }>
                    <CardContent className="p-4 flex items-center gap-3">
                      {status.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                      {status.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                      {status.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                      <p className={
                        status.type === 'error' ? 'text-red-800' :
                        status.type === 'success' ? 'text-green-800' :
                        'text-blue-800'
                      }>
                        {status.message}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Extracted Data Preview */}
                {extractedData && (
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardHeader>
                      <CardTitle className="text-sm">Preview - {extractedData.length} Players Found</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-48 overflow-y-auto">
                      <div className="space-y-1 text-sm">
                        {extractedData.slice(0, 10).map((player, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-emerald-800">
                            <span className="font-medium">{player.name}</span>
                            {player.skill_rating && (
                              <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded">
                                ⭐ {player.skill_rating}
                              </span>
                            )}
                            {player.positions?.length > 0 && (
                              <span className="text-xs text-emerald-600">
                                {player.positions.join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                        {extractedData.length > 10 && (
                          <p className="text-xs text-emerald-600 italic mt-2">
                            ...and {extractedData.length - 10} more players
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(createPageUrl("Players"))}
                    className="flex-1"
                    disabled={importMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={importMutation.isPending || !file}
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Import Players
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}