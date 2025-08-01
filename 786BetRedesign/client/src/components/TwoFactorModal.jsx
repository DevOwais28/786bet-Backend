import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export function TwoFactorModal({ isOpen, onClose }) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const { toast } = useToast();
  const { verify2FA } = useAuth();
  const [location, setLocation] = useLocation();

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    const success = await verify2FA(code);
    setIsVerifying(false);

    if (success) {
      toast({
        title: 'Success!',
        description: 'Two-factor authentication verified',
      });
      onClose();
      setLocation('/dashboard');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-emerald-500" />
            <CardTitle className="text-white">Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="2fa-code" className="text-white mb-2 block">
                Verification Code
              </Label>
              <Input
                id="2fa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-center text-2xl tracking-widest"
                placeholder="000000"
                required
              />
            </div>
            <div className="space-y-2">
              <Button
                onClick={handleVerify}
                disabled={isVerifying || code.length !== 6}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400">
                Lost your device? Use one of your backup codes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
