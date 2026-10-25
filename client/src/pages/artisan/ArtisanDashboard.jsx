import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

function StatCard({ label, value, icon, colour }) {
  return (
    <div className={`card p-5 ${colour}`}>
      <p className="text-2xl">{icon}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="text-sm text-stone">{label}</p>
    </div>
  );
}

export default function ArtisanDashboard() {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [statsRes, productsRes] = await Promise.all([
        api.get('/artisan/dashboard'),
        api.get('/artisan/products'),
      ]);
      setStats(statsRes.data);
      setProducts(productsRes.data.products || []);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(product) {
    setProductToDelete(product);
    setFeedbackMessage('');
    setFeedbackError('');
  }

  function cancelDelete() {
    if (isDeleting) return;
    setProductToDelete(null);
  }

  async function handleDeleteConfirmed() {
    if (!productToDelete) return;
    setIsDeleting(true);
    setFeedbackMessage('');
    setFeedbackError('');

    try {
      const res = await api.delete(`/artisan/products/${productToDelete.id}`);
      const deletedId = productToDelete.id;
      const wasPublished = Boolean(productToDelete.published);
      const deletedName = productToDelete.ai_title || productToDelete.product_name;

      // Update UI state
      setProducts((prev) => prev.filter((p) => p.id !== deletedId));

      // Update stats counters
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          total_products: Math.max(0, (prev.total_products || 1) - 1),
          published: wasPublished ? Math.max(0, (prev.published || 1) - 1) : prev.published,
          drafts: !wasPublished ? Math.max(0, (prev.drafts || 1) - 1) : prev.drafts,
        };
      });

      setFeedbackMessage(res.data?.message || `"${deletedName}" has been deleted.`);
      setProductToDelete(null);
    } catch (err) {
      setFeedbackError(err.response?.data?.error || 'Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-madder border-t-transparent" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center text-madder">
        {error}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Artisan Dashboard</h1>
          <p className="text-stone text-sm mt-1">Manage your craft listings, track sales, and view stats</p>
        </div>
        <Link to="/artisan/upload" id="dashboard-add-product-btn" className="btn-primary">
          + Add product
        </Link>
      </div>

      {/* Feedback Messages */}
      {feedbackMessage && (
        <div className="mb-6 flex items-center justify-between rounded-lg border-l-4 border-teal bg-teal/10 px-4 py-3 text-teal">
          <p className="text-sm font-medium">{feedbackMessage}</p>
          <button
            type="button"
            onClick={() => setFeedbackMessage('')}
            className="text-teal/70 hover:text-teal font-bold text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {feedbackError && (
        <div className="mb-6 flex items-center justify-between rounded-lg border-l-4 border-madder bg-madder/10 px-4 py-3 text-madder">
          <p className="text-sm font-medium">{feedbackError}</p>
          <button
            type="button"
            onClick={() => setFeedbackError('')}
            className="text-madder/70 hover:text-madder font-bold text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          <StatCard label="Total products" value={stats.total_products} icon="📦" colour="" />
          <StatCard label="Published" value={stats.published} icon="✅" colour="" />
          <StatCard label="Drafts" value={stats.drafts} icon="📝" colour="" />
          <StatCard label="Total orders" value={stats.total_orders} icon="🛍️" colour="" />
        </div>
      )}

      {/* My Products Section */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">My Products</h2>
            <span className="badge badge-blue">{products.length} {products.length === 1 ? 'item' : 'items'}</span>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/20 bg-white p-12 text-center">
            <p className="text-4xl mb-3">🎨</p>
            <p className="font-semibold text-lg">No products yet</p>
            <p className="text-stone text-sm mt-1 max-w-md mx-auto">
              Upload your first handmade craft to generate an AI-powered listing and reach conscious buyers.
            </p>
            <Link to="/artisan/upload" className="btn-primary mt-5 inline-block">
              Upload your first craft
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-ink/10 overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-paper border-b border-ink/10 text-xs uppercase tracking-wider text-ink/70">
                  <tr>
                    <th className="px-4 py-3.5 text-left font-semibold">Product</th>
                    <th className="px-4 py-3.5 text-left font-semibold hidden sm:table-cell">Craft type</th>
                    <th className="px-4 py-3.5 text-left font-semibold">Price</th>
                    <th className="px-4 py-3.5 text-left font-semibold">Status</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5 bg-white">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-paper/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image_path}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover bg-stone/10 border border-ink/5 flex-shrink-0"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/48x48/f5f0e8/7c6f67?text=?';
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium line-clamp-1 text-ink">{p.ai_title || p.product_name}</p>
                            <p className="text-xs text-stone">{p.material}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell text-stone">{p.craft_type}</td>
                      <td className="px-4 py-3.5 font-semibold text-ink">
                        ₹{p.price?.toLocaleString('en-IN') || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.published ? (
                          <span className="badge badge-green">Published</span>
                        ) : (
                          <span className="badge badge-amber">Draft</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/artisan/products/${p.id}/edit`}
                            className="btn-quiet py-1 px-2.5 text-xs font-medium"
                          >
                            Edit
                          </Link>
                          {p.published ? (
                            <Link
                              to={`/products/${p.id}`}
                              className="text-teal hover:underline text-xs font-medium px-1"
                              target="_blank"
                            >
                              View
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            id={`delete-product-${p.id}`}
                            onClick={() => confirmDelete(p)}
                            className="rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 py-1 px-2.5 text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-ink/10 animate-scaleIn">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <h3 id="delete-modal-title" className="text-xl font-bold text-ink">
                Confirm Deletion
              </h3>
            </div>

            <p className="text-sm text-stone leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-ink">
                "{productToDelete.ai_title || productToDelete.product_name}"
              </span>
              ? This action cannot be undone and will permanently remove this craft listing.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                id="cancel-delete-btn"
                onClick={cancelDelete}
                disabled={isDeleting}
                className="btn-quiet text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-btn"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="btn-danger text-sm px-4 py-2 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
