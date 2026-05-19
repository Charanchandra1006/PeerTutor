import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) navigate('/register');
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const timer = resendTimer > 0 && setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on complete
    if (newOtp.every(d => d) && value) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: code || otp.join('') });
      const { user, accessToken, refreshToken } = res.data;
      login(user, accessToken, refreshToken);
      toast.success('Email verified! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New OTP sent!');
      setResendTimer(60);
    } catch (err) {
      toast.error('Failed to resend OTP');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white font-bold text-2xl shadow-lg mb-6">
          ✉️
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
        <p className="text-gray-500 mb-8">
          We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>
        </p>

        <div className="card !p-8">
          <div className="flex justify-center gap-3 mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-14 w-12 rounded-xl border-2 border-gray-200 text-center text-2xl font-bold text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              />
            ))}
          </div>

          <button
            onClick={() => handleVerify()}
            className="btn-primary w-full !py-3 mb-4"
            disabled={loading || otp.some(d => !d)}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Email'}
          </button>

          <p className="text-sm text-gray-500">
            Didn't receive the code?{' '}
            {resendTimer > 0 ? (
              <span className="text-gray-400">Resend in {resendTimer}s</span>
            ) : (
              <button onClick={handleResend} className="font-medium text-brand-600 hover:text-brand-700">
                Resend OTP
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
