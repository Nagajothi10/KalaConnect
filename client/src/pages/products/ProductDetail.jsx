import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { readApiError } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    setCartSuccess(false);
    setCartMessage('');

    api.get(`/products/${id}`)
      .then((res) => {
        if (!isMounted) return;
        setProduct(res.data.product);
        setSimilar(res.data.similar || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(readApiError(err, 'Craft not found.'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id]);

  async function handleAddToCart(e) {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/customer/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    if (role !== 'customer') {
      setError('Please sign in with a Customer account to add items to your cart.');
      return;
    }

    setAddingToCart(true);
    setError('');
    try {
      await api.post('/customer/cart', {
        product_id: product.id,
        quantity: Math.max(1, parseInt(quantity) || 1),
      });
      setCartSuccess(true);
      setCartMessage('Added to your cart!');
    } catch (err) {
      setError(readApiError(err, 'Failed to add item to cart.'));
    } finally {
      setAddingToCart(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-madder border-t-transparent" />
        <p className="mt-4 text-stone text-sm">Loading craft details...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="card p-8">
          <p className="text-xl font-bold text-madder">Product Unavailable</p>
          <p className="mt-2 text-stone">{error}</p>
          <Link to="/products" className="btn-primary mt-6 inline-block">
            ← Back to browse crafts
          </Link>
        </div>
      </div>
    );
  }

  if (!product) return null;

  let tags = [];
  try {
    tags = typeof product.ai_tags === 'string' ? JSON.parse(product.ai_tags) : (product.ai_tags || []);
  } catch (_) {
    tags = [];
  }

  let report = null;
  try {
    report = typeof product.quality_report === 'string' ? JSON.parse(product.quality_report) : product.quality_report;
  } catch (_) {
    report = null;
  }

  const title = product.ai_title || product.product_name;
  const inStock = product.stock > 0;
  const imageSrc = product.image_path?.startsWith('http')
    ? product.image_path
    : `/uploads/${product.image_path?.replace(/^.*[\\\/]/, '')}`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-stone">
        <Link to="/" className="hover:text-madder transition-colors">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-madder transition-colors">Browse</Link>
        <span>/</span>
        <span className="text-ink font-medium truncate max-w-xs">{title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Left: Product Image & Quality Badge */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-stone/20 bg-stone/5 shadow-sm group">
            <img
              src={imageSrc}
              alt={title}
              className="w-full object-cover max-h-[520px] transition-transform duration-300 group-hover:scale-102"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/600x600/f5f0e8/1a1614?text=Craft+Image';
              }}
            />

            {product.quality_score && (
              <div className="absolute top-4 right-4 rounded-full bg-white/95 px-3 py-1 shadow-sm backdrop-blur-sm border border-stone/20 text-xs font-semibold flex items-center gap-1.5 text-ink">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                OpenCV Quality: {Math.round(product.quality_score)}%
              </div>
            )}
          </div>

          {/* Palette chips if available */}
          {report?.palette && Array.isArray(report.palette) && report.palette.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-stone">Natural tones:</span>
              <div className="flex gap-1.5">
                {report.palette.map((p, i) => (
                  <span
                    key={i}
                    title={`${p.hex} (${p.pct}%)`}
                    style={{ backgroundColor: p.hex }}
                    className="inline-block h-5 w-5 rounded-full border border-stone/30 shadow-xs"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Details, Artisan info & Buy action */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-200">
                {product.ai_category || product.craft_type}
              </span>
              <span className="rounded-full bg-stone/10 px-2.5 py-0.5 text-xs text-stone">
                {product.material}
              </span>
            </div>

            <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl leading-tight">
              {title}
            </h1>

            {/* Artisan card */}
            <div className="mt-4 flex items-center gap-3 border-y border-stone/15 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-madder text-white font-bold text-sm shadow-sm">
                {product.artisan_name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Handmade by {product.artisan_name}</p>
                <p className="text-xs text-stone">
                  📍 {product.district}, {product.state}
                </p>
              </div>
            </div>

            {/* Price & Stock */}
            <div className="mt-6 flex items-baseline gap-4">
              <span className="font-display text-4xl font-extrabold text-madder">
                ₹{Number(product.price).toLocaleString('en-IN')}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {inStock ? `In stock (${product.stock} available)` : 'Sold out'}
              </span>
            </div>

            {/* Description */}
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink/70">Craft Story</h3>
              <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-line bg-paper/60 p-4 rounded-xl border border-stone/15">
                {product.ai_description || 'Authentic handcrafted piece crafted with traditional care.'}
              </p>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tags.map((tag, idx) => (
                  <span key={idx} className="rounded-md bg-stone/10 px-2 py-0.5 text-xs text-ink/70">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Add to cart section */}
          <div className="mt-8 border-t border-stone/15 pt-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {cartSuccess && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                <span>✓ {cartMessage}</span>
                <Link to="/customer/cart" className="font-bold underline ml-2">
                  View Cart →
                </Link>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-stone/30 bg-white">
                <button
                  type="button"
                  className="px-3 py-2 text-stone hover:text-ink disabled:opacity-30"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!inStock || quantity <= 1}
                >
                  -
                </button>
                <span className="px-3 py-2 text-sm font-semibold text-ink min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="px-3 py-2 text-stone hover:text-ink disabled:opacity-30"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={!inStock || quantity >= product.stock}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                id="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={!inStock || addingToCart}
                className="btn-primary flex-1 py-3 text-center text-sm font-bold disabled:opacity-50"
              >
                {addingToCart ? 'Adding...' : inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-stone">
              Direct support for local Indian artisans • Secure checkout
            </p>
          </div>
        </div>
      </div>

      {/* Similar crafts */}
      {similar.length > 0 && (
        <section className="mt-16 border-t border-stone/15 pt-10">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">
            More handcrafted {product.craft_type}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {similar.map((item) => {
              const itemImg = item.image_path?.startsWith('http')
                ? item.image_path
                : `/uploads/${item.image_path?.replace(/^.*[\\\/]/, '')}`;
              return (
                <Link
                  key={item.id}
                  to={`/products/${item.id}`}
                  className="card group overflow-hidden p-3 transition-transform hover:-translate-y-1"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-stone/5">
                    <img
                      src={itemImg}
                      alt={item.ai_title || item.product_name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="mt-2 text-xs font-semibold text-ink truncate">
                    {item.ai_title || item.product_name}
                  </h4>
                  <p className="text-xs text-madder font-bold mt-1">₹{item.price}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
