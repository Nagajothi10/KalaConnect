import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/artisan/products/${id}`)
      .then((r) => setProduct(r.data.product))
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(field, value) {
    setProduct((p) => ({ ...p, [field]: value }));
    setSuccess('');
  }

  async function handleSave(publish = undefined) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = {
        ai_title: product.ai_title,
        ai_description: product.ai_description,
        ai_tags: product.ai_tags,
        price: parseFloat(product.price) || 0,
        stock: parseInt(product.stock) || 1,
        material: product.material,
        craft_type: product.craft_type,
      };
      if (publish !== undefined) body.published = publish ? 1 : 0;
      await api.put(`/artisan/products/${id}`, body);
      setSuccess(publish !== undefined
        ? (publish ? 'Product published!' : 'Saved as draft.')
        : 'Changes saved.');
      if (publish !== undefined) {
        const updated = await api.get(`/artisan/products/${id}`);
        setProduct(updated.data.product);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/artisan/products/${id}`);
      navigate('/artisan/dashboard');
    } catch {
      setError('Failed to delete.');
      setDeleting(false);
    }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-madder border-t-transparent" /></div>;
  if (error && !product) return <div className="mx-auto max-w-lg px-6 py-20 text-center text-madder">{error}</div>;

  const qualityReport = (() => { try { return JSON.parse(product?.quality_report || 'null'); } catch { return null; } })();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Edit product</h1>
        <div className="flex gap-2">
          {product.published
            ? <span className="badge badge-green">Published</span>
            : <span className="badge badge-amber">Draft</span>}
        </div>
      </div>

      {error && <p className="mb-4 rounded-md border-l-4 border-madder bg-madder/5 px-4 py-3 text-sm text-madder">{error}</p>}
      {success && <p className="mb-4 rounded-md border-l-4 border-teal bg-teal/5 px-4 py-3 text-sm text-teal">{success}</p>}

      <div className="grid gap-6 sm:grid-cols-[1fr_2fr]">
        <div>
          <img src={product.image_path} alt="" className="w-full rounded-xl object-cover aspect-square bg-stone/10"
            onError={(e) => { e.target.src = 'https://placehold.co/300x300/f5f0e8/7c6f67?text=No+Image'; }} />
          {product.quality_score != null && (
            <div className="mt-3 rounded-lg border border-ink/10 bg-white p-3 text-center">
              <p className="text-xs text-stone">Quality score</p>
              <p className="text-2xl font-bold text-teal">{product.quality_score}/100</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="field-label">Title</label>
            <input className="field-input" value={product.ai_title || ''} onChange={(e) => handleChange('ai_title', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={4} value={product.ai_description || ''} onChange={(e) => handleChange('ai_description', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Tags (JSON array)</label>
            <input className="field-input font-mono text-sm" value={product.ai_tags || '[]'} onChange={(e) => handleChange('ai_tags', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Price (₹)</label>
              <input type="number" min="0" className="field-input" value={product.price || ''} onChange={(e) => handleChange('price', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Stock</label>
              <input type="number" min="0" className="field-input" value={product.stock || ''} onChange={(e) => handleChange('stock', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Material</label>
              <input className="field-input" value={product.material || ''} onChange={(e) => handleChange('material', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Craft type</label>
              <input className="field-input" value={product.craft_type || ''} onChange={(e) => handleChange('craft_type', e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" onClick={() => handleSave()} className="btn-quiet text-sm" disabled={saving}>Save changes</button>
            {!product.published
              ? <button type="button" onClick={() => handleSave(true)} className="btn-primary text-sm" disabled={saving}>🚀 Publish</button>
              : <button type="button" onClick={() => handleSave(false)} className="btn-quiet text-sm" disabled={saving}>Unpublish</button>
            }
            <button type="button" onClick={handleDelete} className="btn-danger text-sm ml-auto" disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
