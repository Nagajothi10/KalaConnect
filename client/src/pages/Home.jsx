import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const CATEGORIES = [
  { label: 'Pottery & Ceramics', emoji: '🏺', color: 'bg-amber-50 border-amber-200' },
  { label: 'Textile & Weaving', emoji: '🧵', color: 'bg-blue-50 border-blue-200' },
  { label: 'Woodcraft', emoji: '🪵', color: 'bg-yellow-50 border-yellow-200' },
  { label: 'Metal & Jewellery', emoji: '💍', color: 'bg-gray-50 border-gray-200' },
  { label: 'Painting & Art', emoji: '🎨', color: 'bg-pink-50 border-pink-200' },
  { label: 'Home Décor', emoji: '🏠', color: 'bg-green-50 border-green-200' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get('/products?limit=4').then((r) => setFeatured(r.data.products || [])).catch(() => {});
  }, []);

  return (
    <main>
      {/* Hero + Account sections together on the first page */}
      <section className="loom-hero text-white overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-14 sm:pt-20 sm:pb-16">
          <div className="max-w-3xl text-center mx-auto mb-10">
            <p className="mb-4 text-xs sm:text-sm font-medium uppercase tracking-widest text-madder/90 bg-madder/15 inline-block px-3 py-1 rounded-full border border-madder/30">
              Indian Handmade Marketplace
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] sm:text-6xl text-white">
              Every craft carries{' '}
              <span className="block sm:inline text-saffron">the hands that made it.</span>
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-white/80">
              KalaConnect connects skilled Indian artisans with customers who value authentic,
              handmade work. Upload a photograph — the listing writes itself.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link to="/products" id="hero-browse-btn" className="btn-primary text-sm sm:text-base px-6 py-2.5">
                Browse crafts →
              </Link>
            </div>
          </div>

          {/* Create Artisan Account and Create Customer Account */}
          <div className="grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
            {/* Create Artisan Account Section */}
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 sm:p-8 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-white/25 transition-all">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🎨</span>
                  <h2 className="font-display text-2xl font-bold text-white">I make things</h2>
                </div>
                <p className="text-white/80 mb-6 text-sm sm:text-base leading-relaxed">
                  List your craft, reach buyers directly, and let AI describe your work in words that sell.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/artisan/signup" id="hero-artisan-btn" className="btn-primary text-sm sm:text-base px-5 py-2.5 shadow-sm">
                  Create artisan account
                </Link>
                <Link to="/artisan/login" id="hero-artisan-login-btn" className="btn-quiet border-white/30 text-white hover:bg-white/10 text-sm sm:text-base px-5 py-2.5">
                  Sign in
                </Link>
              </div>
            </div>

            {/* Create Customer Account Section */}
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 sm:p-8 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-white/25 transition-all">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🛍️</span>
                  <h2 className="font-display text-2xl font-bold text-white">I want to buy</h2>
                </div>
                <p className="text-white/80 mb-6 text-sm sm:text-base leading-relaxed">
                  Browse handmade work, ask our AI shopping assistant, and order directly from the maker.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/customer/signup" id="hero-customer-btn" className="btn-secondary text-sm sm:text-base px-5 py-2.5 shadow-sm">
                  Create customer account
                </Link>
                <Link to="/customer/login" id="hero-customer-login-btn" className="btn-quiet border-white/30 text-white hover:bg-white/10 text-sm sm:text-base px-5 py-2.5">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Remaining Section 1: Browse by craft */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="section-title mb-8 text-center">Browse by craft</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={`/products?category=${encodeURIComponent(cat.label)}`}
              className={`card flex flex-col items-center gap-2 p-5 text-center border ${cat.color} hover:scale-105 transition-transform`}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-xs font-medium leading-tight text-ink/80">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products (when available) */}
      {featured.length > 0 && (
        <section className="bg-paper py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="section-title">Featured crafts</h2>
              <Link to="/products" className="text-sm font-medium text-madder hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Remaining Section 2: How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="section-title mb-12 text-center">How it works</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '📸', title: 'Upload a photo', desc: 'Artisans photograph their work and upload it to KalaConnect.' },
            { icon: '🤖', title: 'AI generates listing', desc: 'Gemini AI analyses the image and writes a compelling title, description, and tags.' },
            { icon: '✅', title: 'Artisan approves', desc: 'The artisan reviews, edits if needed, sets a price, and publishes.' },
            { icon: '🛍️', title: 'Customers discover', desc: 'Browse, ask our AI shopping assistant, and order directly from the maker.' },
          ].map((step) => (
            <div key={step.title} className="text-center card p-6 border border-ink/10">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-madder/10 text-3xl">
                {step.icon}
              </div>
              <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-stone">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductCard({ product }) {
  const tags = (() => { try { return JSON.parse(product.ai_tags || '[]'); } catch { return []; } })();
  return (
    <Link to={`/products/${product.id}`} className="card-product group">
      <div className="aspect-square overflow-hidden bg-stone/10">
        <img
          src={product.image_path}
          alt={product.ai_title || product.product_name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { e.target.src = 'https://placehold.co/400x400/f5f0e8/7c6f67?text=No+Image'; }}
        />
      </div>
      <div className="p-4">
        <p className="text-xs font-medium text-teal uppercase tracking-wide mb-1">
          {product.ai_category || product.craft_type}
        </p>
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-madder transition-colors">
          {product.ai_title || product.product_name}
        </h3>
        <p className="mt-2 text-lg font-bold text-ink">₹{product.price?.toLocaleString('en-IN')}</p>
        <p className="text-xs text-stone mt-1">by {product.artisan_name} · {product.district}</p>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge badge-blue text-[10px]">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
