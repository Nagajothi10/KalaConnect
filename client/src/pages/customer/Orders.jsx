import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/customer/orders')
      .then((r) => setOrders(r.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-madder border-t-transparent" /></div>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Your orders</h1>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 bg-white p-12 text-center">
          <p className="text-5xl mb-3">📦</p>
          <p className="font-semibold text-lg">No orders yet</p>
          <p className="text-stone text-sm mt-2 mb-6">Start browsing handmade crafts.</p>
          <Link to="/products" className="btn-secondary">Browse crafts</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.order_id} className="card flex gap-4 p-5">
              <img src={order.image_path} alt={order.title} className="h-16 w-16 rounded-lg object-cover bg-stone/10 shrink-0"
                onError={(e) => { e.target.src = 'https://placehold.co/64x64/f5f0e8/7c6f67?text=?'; }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link to={`/products/${order.product_id}`} className="font-semibold hover:text-madder line-clamp-1">
                      {order.title || order.product_name}
                    </Link>
                    <p className="text-xs text-stone mt-0.5">by {order.artisan_name} · {order.district}, {order.state}</p>
                  </div>
                  <span className={`badge shrink-0 ${order.status === 'pending' ? 'badge-amber' : 'badge-green'}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span>Qty: {order.quantity}</span>
                  <span className="font-semibold">₹{(order.price_at_order * order.quantity).toLocaleString('en-IN')}</span>
                  <span className="text-stone text-xs">{new Date(order.order_date).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
