import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TwoFactorSetup() {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSetup2FA = async () => {
    try {
      setLoading(true);
      const response = await apiService.setup2FA();
      setQrCode(response.qrCode);
      setSecret(response.secret);
      setBackupCodes(response.backupCodes);
      setStep('verify');
    } catch (error) {
      toast({
        title: 'Setup Failed',
        description: 'Failed to setup 2FA. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setLoading(true);
      const response = await apiService.verify2FASetup(verificationCode);
      if (response.verified) {
        toast({
          title: '2FA Enabled',
          description: 'Two-factor authentication has been successfully enabled.',
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Invalid verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (step === 'setup') {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Enable Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              2FA adds an extra step to your login process by requiring a code from your phone.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <Button
              onClick={handleSetup2FA}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Setup 2FA
        </CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          {qrCode && <QRCodeSVG value={qrCode} size={200} />}
        </div>
        
        <div className="space-y-2">
          <Label className="text-white">Secret Key (Manual Entry)</Label>
          <div className="flex gap-2">
            <Input 
              value={secret} 
              readOnly 
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Button
              size="sm"
              onClick={() => copyToClipboard(secret, 'secret')}
              variant="outline"
            >
              {copiedCode === 'secret' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Backup Codes</Label>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <div key={index} className="flex items-center gap-2 bg-slate-700 p-2 rounded">
                <span className="text-sm font-mono text-white">{code}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(code, `backup-${index}`)}
                >
                  {copiedCode === `backup-${index}` ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400">
            Save these codes in a secure place. You can use them if you lose access to your authenticator app.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verification-code" className="text-white">
            Verification Code
          </Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="bg-slate-700 border-slate-600 text-white"
            maxLength={6}
          />
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleVerify2FA}
            disabled={loading || verificationCode.length !== 6}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Verifying...' : 'Verify & Enable'}
          </Button>
          <Button
            onClick={() => setStep('setup')}
            variant="outline"
            className="w-full"
          >
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
