import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { readApiError } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';

export default function CustomerLogin() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/products';

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((p) => ({ ...p, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!values.email.trim() || !values.password) { setFormError('Enter your email and password.'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/customer/login', values);
      signIn(data.token, data.user);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(readApiError(error).message);
    } finally { setSubmitting(false); }
  }

  return (
    <main className="grid min-h-[calc(100vh-69px)] lg:grid-cols-[2fr_3fr]">
      <aside className="loom-field hidden flex-col justify-end p-10 text-white lg:flex">
        <h1 className="max-w-measure font-display text-4xl font-extrabold leading-tight">
          Welcome back to the marketplace.
        </h1>
        <p className="mt-5 max-w-measure leading-relaxed text-white/70">
          Sign in to browse, use the AI shopping assistant, and manage your orders.
        </p>
      </aside>
      <section className="px-6 py-12 sm:px-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-3xl font-bold">Customer sign in</h2>
          <p className="mt-2 text-stone">
            New here?{' '}
            <Link to="/customer/signup" className="text-madder underline underline-offset-4">Create an account</Link>.
          </p>
          {formError && <p className="mt-6 rounded-md border-l-4 border-madder bg-madder/5 px-4 py-3 text-madder" role="alert">{formError}</p>}
          <form className="mt-8 grid gap-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="field-label" htmlFor="c-login-email">Email address</label>
              <input id="c-login-email" name="email" type="email" autoComplete="email"
                value={values.email} onChange={handleChange} className="field-input" />
            </div>
            <div>
              <label className="field-label" htmlFor="c-login-password">Password</label>
              <PasswordInput
                id="c-login-password"
                name="password"
                autoComplete="current-password"
                value={values.password}
                onChange={handleChange}
              />
            </div>
            <button type="submit" id="customer-login-submit" className="btn-secondary" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
