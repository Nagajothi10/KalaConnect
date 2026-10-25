import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function Cart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  async function loadCart() {
    try {
      const { data } = await api.get('/customer/cart');
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load cart.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQuantity(cartId, qty) {
    try {
      if (qty < 1) {
        await api.delete(`/customer/cart/${cartId}`);
      } else {
        await api.put(`/customer/cart/${cartId}`, { quantity: qty });
      }
      loadCart();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update cart.');
    }
  }

  async function handleCheckout() {
    setChecking(true);
    setError('');
    try {
      await api.post('/customer/orders/checkout');
      setSuccess('Order placed! Thank you for your purchase. 🎉');
      setItems([]);
      setTotal(0);
      setTimeout(() => navigate('/customer/orders'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Checkout failed. Try again.');
    } finally {
      setChecking(false);
    }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-madder border-t-transparent" /></div>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Your cart</h1>

      {error && <p className="mb-4 rounded-md border-l-4 border-madder bg-madder/5 px-4 py-3 text-sm text-madder">{error}</p>}
      {success && <p className="mb-4 rounded-md border-l-4 border-teal bg-teal/5 px-4 py-3 text-sm text-teal">{success}</p>}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 bg-white p-12 text-center">
          <p className="text-5xl mb-3">🛒</p>
          <p className="font-semibold text-lg">Your cart is empty</p>
          <p className="text-stone text-sm mt-2 mb-6">Discover handmade crafts from across India.</p>
          <Link to="/products" className="btn-secondary">Browse crafts</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Cart items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.cart_id} className="card flex gap-4 p-4">
                <img src={item.image_path} alt={item.title} className="h-20 w-20 rounded-lg object-cover bg-stone/10 shrink-0"
                  onError={(e) => { e.target.src = 'https://placehold.co/80x80/f5f0e8/7c6f67?text=?'; }} />
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_id}`} className="font-semibold text-sm hover:text-madder line-clamp-2">
                    {item.title || item.product_name}
                  </Link>
                  <p className="text-xs text-stone mt-0.5">by {item.artisan_name} · {item.craft_type}</p>
                  <p className="font-bold text-ink mt-1">₹{item.price?.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2 rounded-lg border border-ink/15 bg-white">
                    <button type="button" className="px-2.5 py-1 text-ink hover:text-madder" onClick={() => updateQuantity(item.cart_id, item.quantity - 1)}>−</button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button type="button" className="px-2.5 py-1 text-ink hover:text-madder" onClick={() => updateQuantity(item.cart_id, item.quantity + 1)}>+</button>
                  </div>
                  <p className="text-xs text-stone">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="card p-6 h-fit">
            <h2 className="font-bold text-lg mb-4">Order summary</h2>
            <div className="space-y-2 text-sm mb-4">
              {items.map((item) => (
                <div key={item.cart_id} className="flex justify-between">
                  <span className="text-stone line-clamp-1 flex-1 mr-2">{item.title || item.product_name} ×{item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-ink/10 pt-4 flex justify-between font-bold">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <button
              type="button"
              id="checkout-btn"
              onClick={handleCheckout}
              disabled={checking}
              className="btn-secondary w-full mt-4"
            >
              {checking ? 'Processing…' : '✅ Place order'}
            </button>
            <p className="text-xs text-stone text-center mt-3">Payments handled offline with the artisan.</p>
          </div>
        </div>
      )}
    </main>
  );
}
