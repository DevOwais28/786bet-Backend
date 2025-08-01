import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export function GameSettings() {
  const [settings, setSettings] = useState({
    minBet: 10,
    maxBet: 1000,
    houseEdge: 0.03,
    maxMultiplier: 100,
    roundDuration: 30
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/game-settings');
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Failed to fetch game settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/admin/game-settings', settings);
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    const numValue = parseFloat(value);
    setSettings(prev => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue
    }));
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Game Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">Loading settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Game Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-zinc-400">Minimum Bet</Label>
            <Input
              type="number"
              value={settings.minBet}
              onChange={(e) => handleChange('minBet', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              min="1"
            />
          </div>

          <div>
            <Label className="text-zinc-400">Maximum Bet</Label>
            <Input
              type="number"
              value={settings.maxBet}
              onChange={(e) => handleChange('maxBet', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              min={settings.minBet}
            />
          </div>

          <div>
            <Label className="text-zinc-400">House Edge (%)</Label>
            <Input
              type="number"
              value={settings.houseEdge * 100}
              onChange={(e) => handleChange('houseEdge', e.target.value / 100)}
              className="bg-zinc-800 border-zinc-700 text-white"
              min="0"
              max="10"
              step="0.1"
            />
          </div>

          <div>
            <Label className="text-zinc-400">Maximum Multiplier</Label>
            <Input
              type="number"
              value={settings.maxMultiplier}
              onChange={(e) => handleChange('maxMultiplier', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              min="1"
              max="1000"
            />
          </div>

          <div>
            <Label className="text-zinc-400">Round Duration (seconds)</Label>
            <Input
              type="number"
              value={settings.roundDuration}
              onChange={(e) => handleChange('roundDuration', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              min="10"
              max="300"
            />
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold text-black hover:bg-yellow-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <div className="text-sm text-zinc-400 space-y-2">
          <p><strong>Current House Edge:</strong> {(settings.houseEdge * 100).toFixed(1)}%</p>
          <p><strong>Expected Revenue per $1000 bet:</strong> ${(settings.houseEdge * 1000).toFixed(2)}</p>
          <p><strong>Max Possible Win:</strong> ${(settings.maxBet * settings.maxMultiplier).toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
