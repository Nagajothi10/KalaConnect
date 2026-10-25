import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { readApiError } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';

const EMPTY = { name: '', dob: '', email: '', phone: '', password: '', district: '', state: '', address: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Enter your name.';
  if (!v.dob) e.dob = 'Choose your date of birth.';
  else if (new Date(v.dob) > new Date()) e.dob = 'Date of birth must be in the past.';
  if (!v.email.trim()) e.email = 'Enter your email.';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email.';
  if (!v.phone.trim()) e.phone = 'Enter your phone.';
  else if (!PHONE_RE.test(v.phone.trim())) e.phone = 'Enter 7 to 15 digits.';
  if (!v.password) e.password = 'Choose a password.';
  else if (v.password.length < 8) e.password = 'Use at least 8 characters.';
  if (!v.district.trim()) e.district = 'Enter your district.';
  if (!v.state.trim()) e.state = 'Enter your state.';
  if (!v.address.trim()) e.address = 'Enter your address.';
  return e;
}

export default function CustomerSignup() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((p) => ({ ...p, [name]: value }));
    setErrors((p) => (p[name] ? { ...p, [name]: undefined } : p));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate(values);
    if (Object.keys(found).length > 0) { setErrors(found); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/customer/signup', values);
      signIn(data.token, data.user);
      navigate('/products', { replace: true });
    } catch (error) {
      const { message, fields } = readApiError(error);
      setFormError(message);
      setErrors(fields);
    } finally { setSubmitting(false); }
  }

  function field(name, label, type = 'text', extra = {}) {
    const invalid = Boolean(errors[name]);
    return (
      <div>
        <label className="field-label" htmlFor={`c-${name}`}>{label}</label>
        {type === 'password' ? (
          <PasswordInput
            id={`c-${name}`}
            name={name}
            autoComplete="new-password"
            value={values[name]}
            onChange={handleChange}
            invalid={invalid}
            errorId={invalid ? `c-${name}-error` : undefined}
            className={`field-input ${invalid ? 'field-input-error' : ''}`}
            {...extra}
          />
        ) : (
          <input id={`c-${name}`} name={name} type={type} value={values[name]} onChange={handleChange}
            aria-invalid={invalid} className={`field-input ${invalid ? 'field-input-error' : ''}`} {...extra} />
        )}
        {invalid && <p className="field-error" id={`c-${name}-error`}>{errors[name]}</p>}
      </div>
    );
  }

  return (
    <main className="grid min-h-[calc(100vh-69px)] lg:grid-cols-[2fr_3fr]">
      <aside className="loom-field hidden flex-col justify-end p-10 text-white lg:flex">
        <h1 className="max-w-measure font-display text-4xl font-extrabold leading-tight">
          Discover crafts made just for you.
        </h1>
        <p className="mt-5 max-w-measure leading-relaxed text-white/70">
          Browse hundreds of authentic Indian handmade products and ask our AI shopping assistant to help you find the perfect piece.
        </p>
      </aside>
      <section className="px-6 py-12 sm:px-12 overflow-y-auto">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold">Create a customer account</h2>
          <p className="mt-2 text-stone">
            Already registered?{' '}
            <Link to="/customer/login" className="text-madder underline underline-offset-4">Sign in instead</Link>.
          </p>
          {formError && <p className="mt-6 rounded-md border-l-4 border-madder bg-madder/5 px-4 py-3 text-madder" role="alert">{formError}</p>}
          <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
            <div className="sm:col-span-2">{field('name', 'Full name', 'text', { autoComplete: 'name' })}</div>
            {field('dob', 'Date of birth', 'date', { max: new Date().toISOString().slice(0, 10) })}
            {field('phone', 'Phone number', 'tel')}
            {field('email', 'Email address', 'email', { autoComplete: 'email' })}
            {field('password', 'Password', 'password')}
            {field('district', 'District')}
            {field('state', 'State')}
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="c-address">Address</label>
              <textarea id="c-address" name="address" rows={3} value={values.address} onChange={handleChange}
                className={`field-input ${errors.address ? 'field-input-error' : ''}`} />
              {errors.address && <p className="field-error">{errors.address}</p>}
            </div>
            <div className="sm:col-span-2">
              <button type="submit" id="customer-signup-submit" className="btn-secondary w-full sm:w-auto" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
