import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const CRAFT_TYPES = [
  'Pottery & Ceramics', 'Textile & Weaving', 'Woodcraft', 'Metal & Jewellery',
  'Painting & Art', 'Leather Craft', 'Stone Craft', 'Bamboo & Cane', 'Home Décor', 'Other'
];

const MATERIALS = [
  'Clay', 'Silk', 'Cotton', 'Wool', 'Jute', 'Leather', 'Brass', 'Copper', 'Silver',
  'Teak', 'Bamboo', 'Cane', 'Marble', 'Sandstone', 'Paper', 'Mixed media', 'Other'
];

function QualityReport({ report, score }) {
  if (!report) return null;
  const warnings = report.warnings || [];
  const colour = score >= 80 ? 'quality-excellent' : score >= 60 ? 'quality-good' : score >= 40 ? 'quality-fair' : 'quality-poor';
  const barColour = score >= 80 ? 'bg-teal' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-saffron' : 'bg-madder';

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Image Quality Analysis</h3>
        <span className={`text-lg font-bold ${colour}`}>{score}/100</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-ink/10 mb-4">
        <div className={`quality-bar-fill ${barColour}`} style={{ width: `${score}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center mb-4">
        {report.blur && (
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-stone">Sharpness</p>
            <p className={`text-sm font-bold ${report.blur.is_blurry ? 'text-madder' : 'text-teal'}`}>
              {report.blur.is_blurry ? '⚠️ Blurry' : '✓ Sharp'}
            </p>
          </div>
        )}
        {report.brightness && (
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-stone">Brightness</p>
            <p className={`text-sm font-bold ${report.brightness.label !== 'good' ? 'text-saffron' : 'text-teal'}`}>
              {report.brightness.label === 'good' ? '✓ Good' : report.brightness.label === 'too_dark' ? '⚠️ Dark' : '⚠️ Bright'}
            </p>
          </div>
        )}
        {report.resolution && (
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-stone">Resolution</p>
            <p className={`text-sm font-bold ${report.resolution.ok ? 'text-teal' : 'text-madder'}`}>
              {report.resolution.ok ? '✓ OK' : '⚠️ Low'}
            </p>
          </div>
        )}
      </div>

      {/* Colour palette */}
      {report.palette && report.palette.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-stone mb-2">Dominant colours</p>
          <div className="flex gap-2">
            {report.palette.map((c) => (
              <div key={c.hex} className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-full border border-ink/10" style={{ backgroundColor: c.hex }} />
                <span className="text-xs text-stone">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w) => (
            <p key={w} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">⚠ {w}</p>
          ))}
        </div>
      )}

      {!report.opencv_available && (
        <p className="text-xs text-stone mt-2">
          Note: OpenCV is not installed on this server. Run <code>pip install opencv-python numpy</code> to enable image analysis.
        </p>
      )}
    </div>
  );
}

function AIContentEditor({ aiContent, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(aiContent);

  const tags = (() => { try { return JSON.parse(local.ai_tags || '[]'); } catch { return []; } })();

  function handleSave() {
    onUpdate(local);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">AI-Generated Content</h3>
        <div className="flex gap-2">
          {local.generated_by && (
            <span className="badge badge-purple text-[10px]">{local.generated_by}</span>
          )}
          <button type="button" onClick={() => setEditing(!editing)} className="text-xs text-madder hover:underline">
            {editing ? 'Cancel' : '✏️ Edit'}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="field-label text-xs">Title</label>
            <input className="field-input text-sm" value={local.ai_title || ''} onChange={(e) => setLocal(p => ({ ...p, ai_title: e.target.value }))} />
          </div>
          <div>
            <label className="field-label text-xs">Description</label>
            <textarea className="field-input text-sm" rows={4} value={local.ai_description || ''} onChange={(e) => setLocal(p => ({ ...p, ai_description: e.target.value }))} />
          </div>
          <div>
            <label className="field-label text-xs">Tags (JSON array)</label>
            <input className="field-input text-sm font-mono" value={local.ai_tags || '[]'} onChange={(e) => setLocal(p => ({ ...p, ai_tags: e.target.value }))} />
          </div>
          <button type="button" onClick={handleSave} className="btn-secondary text-sm">Save edits</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-stone mb-1">Title</p>
            <p className="font-semibold">{local.ai_title}</p>
          </div>
          <div>
            <p className="text-xs text-stone mb-1">Description</p>
            <p className="text-sm leading-relaxed text-ink/80">{local.ai_description}</p>
          </div>
          <div>
            <p className="text-xs text-stone mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => <span key={t} className="badge badge-blue">{t}</span>)}
            </div>
          </div>
          {local.ai_category && (
            <div>
              <p className="text-xs text-stone mb-1">Suggested category</p>
              <span className="badge badge-green">{local.ai_category}</span>
            </div>
          )}
          {local.ai_price_min && local.ai_price_max && (
            <div>
              <p className="text-xs text-stone mb-1">Suggested price range</p>
              <p className="text-sm font-medium text-teal">
                ₹{local.ai_price_min.toLocaleString('en-IN')} – ₹{local.ai_price_max.toLocaleString('en-IN')}
                <span className="ml-2 text-xs text-stone font-normal">
                  (your price is not set automatically)
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductUpload() {
  const [step, setStep] = useState('form'); // 'form' | 'processing' | 'review' | 'done'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [material, setMaterial] = useState('');
  const [craftType, setCraftType] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [result, setResult] = useState(null); // { product, analysis, ai }
  const [editedAI, setEditedAI] = useState(null);
  const [price, setPrice] = useState('');
  const [priceError, setPriceError] = useState('');
  const [stock, setStock] = useState('1');
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadError('');
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!imageFile) { setUploadError('Please select an image.'); return; }
    if (!material) { setUploadError('Please select the material.'); return; }
    if (!craftType) { setUploadError('Please select the craft type.'); return; }

    setStep('processing');
    setUploadError('');

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('material', material);
    formData.append('craft_type', craftType);

    try {
      const { data } = await api.post('/artisan/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setEditedAI({
        ai_title: data.product.ai_title,
        ai_description: data.product.ai_description,
        ai_tags: data.product.ai_tags,
        ai_category: data.product.ai_category,
        ai_price_min: data.product.ai_price_min,
        ai_price_max: data.product.ai_price_max,
        generated_by: data.ai?.generated_by,
      });
      setPrice(data.product.ai_price_min?.toString() || '');
      setStep('review');
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Try again.';
      setUploadError(msg);
      setStep('form');
    }
  }

  async function handlePublish() {
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setPriceError('Please enter a valid price in ₹.');
      return;
    }
    setPriceError('');
    setPublishing(true);

    try {
      await api.put(`/artisan/products/${result.product.id}`, {
        ai_title: editedAI.ai_title,
        ai_description: editedAI.ai_description,
        ai_tags: editedAI.ai_tags,
        price: priceNum,
        stock: parseInt(stock) || 1,
        published: 1,
      });
      setStep('done');
    } catch (err) {
      setPriceError(err.response?.data?.error || 'Failed to publish. Try again.');
    } finally {
      setPublishing(false);
    }
  }

  if (step === 'processing') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-20">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-madder border-t-transparent" />
        <div className="text-center">
          <h2 className="text-2xl font-bold">Analysing your image…</h2>
          <p className="mt-2 text-stone">Running OpenCV quality checks and generating AI listing content.</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-teal/10 text-5xl">✅</div>
        <h1 className="text-3xl font-bold">Product published!</h1>
        <p className="mt-3 text-stone">Your craft is now live on KalaConnect.</p>
        <div className="mt-8 flex justify-center gap-4">
          <button type="button" onClick={() => { setStep('form'); setResult(null); setImageFile(null); setImagePreview(null); }} className="btn-secondary">
            Add another product
          </button>
          <button type="button" onClick={() => navigate('/artisan/dashboard')} className="btn-quiet">
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (step === 'review' && result) {
    const report = (() => { try { return JSON.parse(result.product.quality_report || 'null'); } catch { return null; } })();
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Review and publish</h1>
          <p className="mt-2 text-stone">Your image has been analysed. Review the AI suggestions, edit if needed, then publish.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: image + quality */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
              <img src={result.product.image_path} alt="Uploaded product" className="w-full object-contain max-h-80" />
            </div>
            <QualityReport report={report} score={result.product.quality_score || 70} />
          </div>

          {/* Right: AI content + publish form */}
          <div className="space-y-4">
            <AIContentEditor aiContent={editedAI} onUpdate={setEditedAI} />

            <div className="rounded-xl border border-ink/10 bg-white p-5">
              <h3 className="font-semibold text-sm mb-4">Set your price & stock</h3>
              {editedAI?.ai_price_min && editedAI?.ai_price_max && (
                <p className="text-xs text-teal mb-3">
                  💡 AI suggests ₹{editedAI.ai_price_min?.toLocaleString('en-IN')} – ₹{editedAI.ai_price_max?.toLocaleString('en-IN')} based on similar products.
                  This is a suggestion only — set your own price.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="field-label text-xs">Your price (₹) *</label>
                  <input type="number" min="1" value={price} onChange={(e) => { setPrice(e.target.value); setPriceError(''); }}
                    className="field-input text-sm" placeholder="e.g. 850" />
                  {priceError && <p className="field-error text-xs">{priceError}</p>}
                </div>
                <div>
                  <label className="field-label text-xs">Stock quantity</label>
                  <input type="number" min="1" value={stock} onChange={(e) => setStock(e.target.value)}
                    className="field-input text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" id="publish-btn" onClick={handlePublish} className="btn-primary" disabled={publishing}>
                  {publishing ? 'Publishing…' : '🚀 Publish now'}
                </button>
                <button type="button" onClick={() => navigate('/artisan/dashboard')} className="btn-quiet text-sm">
                  Save as draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Step: form
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold">Upload a product</h1>
      <p className="mt-2 text-stone mb-8">
        Select an image of your handmade product. OpenCV will analyse quality, then AI will generate the listing.
      </p>

      <form onSubmit={handleUpload} className="space-y-6">
        {/* Image drop zone */}
        <div
          className="relative rounded-xl border-2 border-dashed border-ink/20 bg-white p-8 text-center cursor-pointer hover:border-madder/50 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }}}
          onDragOver={(e) => e.preventDefault()}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="mx-auto max-h-60 rounded-lg object-contain" />
          ) : (
            <div className="py-8">
              <div className="mb-4 text-5xl">📸</div>
              <p className="font-medium text-ink">Click to upload or drag & drop</p>
              <p className="mt-1 text-sm text-stone">JPEG, PNG, WebP — max 10 MB — min 400×400px recommended</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Material */}
        <div>
          <label className="field-label" htmlFor="material">Primary material</label>
          <select id="material" value={material} onChange={(e) => setMaterial(e.target.value)} className="field-input">
            <option value="">Select material…</option>
            {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Craft type */}
        <div>
          <label className="field-label" htmlFor="craft_type">Craft type</label>
          <select id="craft_type" value={craftType} onChange={(e) => setCraftType(e.target.value)} className="field-input">
            <option value="">Select craft type…</option>
            {CRAFT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {uploadError && (
          <p className="rounded-md border-l-4 border-madder bg-madder/5 px-4 py-3 text-sm text-madder">{uploadError}</p>
        )}

        <button type="submit" id="upload-submit-btn" className="btn-primary w-full">
          📤 Analyse & generate listing
        </button>
      </form>
    </main>
  );
}
