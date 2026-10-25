import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const CATEGORIES = ['Pottery & Ceramics', 'Textile & Weaving', 'Woodcraft', 'Metal & Jewellery', 'Painting & Art', 'Home Décor', 'Leather Craft', 'Stone Craft', 'Bamboo & Cane'];

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [page, setPage] = useState(1);
  const inputRef = useRef(null);
  const LIMIT = 12;

  function fetchProducts(params = {}) {
    setLoading(true);
    const query = new URLSearchParams({
      ...(params.q !== undefined ? params : { q, category }),
      page: params.page || page,
      limit: LIMIT,
    });
    // Clean empty params
    [...query.entries()].forEach(([k, v]) => { if (!v) query.delete(k); });

    api.get(`/products?${query.toString()}`)
      .then((r) => {
        setProducts(r.data.products || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const catParam = searchParams.get('category') || '';
    const qParam = searchParams.get('q') || '';
    setCategory(catParam);
    setQ(qParam);
    setPage(1);
    fetchProducts({ q: qParam, category: catParam, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearchParams({ q, category });
  }

  function handleCategoryClick(cat) {
    const next = category === cat ? '' : cat;
    setCategory(next);
    setPage(1);
    setSearchParams({ q, category: next });
  }

  function handlePageChange(p) {
    setPage(p);
    fetchProducts({ page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search crafts, materials, titles…"
          className="field-input flex-1"
          id="product-search"
        />
        <button type="submit" className="btn-primary shrink-0">Search</button>
      </form>

      {/* Category filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryClick(cat)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-madder text-white'
                : 'bg-white border border-ink/15 text-ink hover:border-madder hover:text-madder'
            }`}
          >
            {cat}
          </button>
        ))}
        {category && (
          <button type="button" onClick={() => handleCategoryClick(category)} className="rounded-full px-4 py-1.5 text-xs font-medium bg-ink/5 text-stone hover:text-ink">
            ✕ Clear filter
          </button>
        )}
      </div>

      {/* Results header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {category || q ? (
            <>{total} result{total !== 1 ? 's' : ''} {q && `for "${q}"`} {category && `in ${category}`}</>
          ) : (
            `All crafts (${total})`
          )}
        </h1>
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-madder border-t-transparent" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 bg-white py-20 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">No products found</p>
          <p className="text-stone text-sm mt-2">Try different search terms or browse all categories.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePageChange(p)}
              className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                page === p ? 'bg-madder text-white' : 'border border-ink/15 hover:border-madder hover:text-madder'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
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
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <p className="text-[10px] font-semibold text-teal uppercase tracking-wide mb-1">
          {product.ai_category || product.craft_type}
        </p>
        <h2 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-madder transition-colors">
          {product.ai_title || product.product_name}
        </h2>
        <p className="mt-2 text-base font-bold text-ink">₹{product.price?.toLocaleString('en-IN')}</p>
        <p className="text-xs text-stone mt-0.5">by {product.artisan_name} · {product.district}</p>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => <span key={tag} className="badge badge-blue text-[10px]">{tag}</span>)}
          </div>
        )}
      </div>
    </Link>
  );
}
