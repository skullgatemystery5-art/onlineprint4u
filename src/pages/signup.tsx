import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
  }, [navigate, redirect]);

  return null;
}
