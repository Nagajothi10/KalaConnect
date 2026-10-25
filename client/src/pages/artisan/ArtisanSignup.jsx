import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { readApiError } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';

const EMPTY = { name: '', dob: '', email: '', phone: '', password: '', district: '', state: '', address: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter your name.';
  if (!values.dob) errors.dob = 'Choose your date of birth.';
  else if (new Date(values.dob) > new Date()) errors.dob = 'Date of birth must be in the past.';
  if (!values.email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!values.phone.trim()) errors.phone = 'Enter your phone number.';
  else if (!PHONE_RE.test(values.phone.trim())) errors.phone = 'Enter 7 to 15 digits.';
  if (!values.password) errors.password = 'Choose a password.';
  else if (values.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (!values.district.trim()) errors.district = 'Enter your district.';
  if (!values.state.trim()) errors.state = 'Enter your state.';
  if (!values.address.trim()) errors.address = 'Enter your address.';
  return errors;
}

export default function ArtisanSignup() {
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
      const { data } = await api.post('/artisan/signup', values);
      signIn(data.token, data.user);
      navigate('/artisan/upload', { replace: true });
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
        <label className="field-label" htmlFor={name}>{label}</label>
        {type === 'password' ? (
          <PasswordInput
            id={name}
            name={name}
            value={values[name]}
            onChange={handleChange}
            invalid={invalid}
            errorId={invalid ? `${name}-error` : undefined}
            className={`field-input ${invalid ? 'field-input-error' : ''}`}
            {...extra}
          />
        ) : (
          <input id={name} name={name} type={type} value={values[name]} onChange={handleChange}
            aria-invalid={invalid} aria-describedby={invalid ? `${name}-error` : undefined}
            className={`field-input ${invalid ? 'field-input-error' : ''}`} {...extra} />
        )}
        {invalid && <p className="field-error" id={`${name}-error`}>{errors[name]}</p>}
      </div>
    );
  }

  return (
    <main className="grid min-h-[calc(100vh-69px)] lg:grid-cols-[2fr_3fr]">
      <aside className="loom-field hidden flex-col justify-end p-10 text-white lg:flex">
        <h1 className="max-w-measure font-display text-4xl font-extrabold leading-tight">
          Your work, listed the way you would describe it.
        </h1>
        <p className="mt-5 max-w-measure leading-relaxed text-white/70">
          Upload a photograph and a few details. AI writes the listing. You approve it.
        </p>
        <div className="mt-8 flex gap-4 text-sm text-white/50">
          <span>🤖 AI-powered listings</span>
          <span>📸 OpenCV quality checks</span>
        </div>
      </aside>

      <section className="px-6 py-12 sm:px-12 overflow-y-auto">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold">Create your artisan account</h2>
          <p className="mt-2 text-stone">
            Already registered?{' '}
            <Link to="/artisan/login" className="text-madder underline underline-offset-4">Sign in instead</Link>.
          </p>

          {formError && (
            <p className="mt-6 rounded-md border-l-4 border-madder bg-madder/5 px-4 py-3 text-madder" role="alert">
              {formError}
            </p>
          )}

          <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
            <div className="sm:col-span-2">{field('name', 'Full name', 'text', { autoComplete: 'name' })}</div>
            {field('dob', 'Date of birth', 'date', { max: new Date().toISOString().slice(0, 10) })}
            {field('phone', 'Phone number', 'tel', { autoComplete: 'tel' })}
            {field('email', 'Email address', 'email', { autoComplete: 'email' })}
            {field('password', 'Password', 'password', { autoComplete: 'new-password' })}
            {field('district', 'District')}
            {field('state', 'State')}
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="address">Address</label>
              <textarea id="address" name="address" rows={3} value={values.address} onChange={handleChange}
                aria-invalid={Boolean(errors.address)}
                className={`field-input ${errors.address ? 'field-input-error' : ''}`} />
              {errors.address && <p className="field-error">{errors.address}</p>}
            </div>
            <div className="sm:col-span-2">
              <button type="submit" id="artisan-signup-submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
                {submitting ? 'Creating your account…' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
