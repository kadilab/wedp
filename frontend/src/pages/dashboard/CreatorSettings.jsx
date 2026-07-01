import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatorStore } from '../../stores/creatorStore';
import { resolveAssetUrl } from '../../utils/assets';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  PhotoIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

export default function CreatorSettings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const {
    creatorProfile,
    loading,
    fetchCreatorProfile,
    updateCreatorProfile,
    uploadProfileImage,
  } = useCreatorStore();

  const [form, setForm] = useState({ displayName: '', bio: '', website: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!creatorProfile) {
      fetchCreatorProfile().catch(() => {});
    }
  }, [creatorProfile, fetchCreatorProfile]);

  useEffect(() => {
    if (creatorProfile) {
      setForm({
        displayName: creatorProfile.displayName || '',
        bio: creatorProfile.bio || '',
        website: creatorProfile.website || '',
      });
    }
  }, [creatorProfile]);

  const initials = (creatorProfile?.displayName || form.displayName || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir un fichier image');
      return;
    }
    setUploading(true);
    try {
      await uploadProfileImage(file);
      toast.success('Photo de profil mise à jour');
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de l'envoi de l'image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      toast.error('Le nom du créateur est requis');
      return;
    }
    setSaving(true);
    try {
      await updateCreatorProfile({
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        website: form.website.trim(),
      });
      toast.success('Profil mis à jour');
      navigate('/creator-dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Échec de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !creatorProfile) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-56 bg-gray-200 rounded" />
        <div className="h-64 w-full bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/creator-dashboard')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
          aria-label="Retour"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-bold text-gray-900">Modifier mon profil</h1>
          <p className="text-gray-600 text-sm">Ces informations sont visibles sur la marketplace</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {creatorProfile?.profileImage ? (
            <img
              src={resolveAssetUrl(creatorProfile.profileImage)}
              alt={creatorProfile.displayName}
              className="w-20 h-20 rounded-2xl object-cover ring-1 ring-gray-100 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-primary-600">{initials}</span>
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <PhotoIcon className="w-4 h-4" />
              {uploading ? 'Envoi…' : 'Changer la photo'}
            </button>
            <p className="text-xs text-gray-400 mt-1">JPG ou PNG, max 5 Mo</p>
          </div>
        </div>

        {/* Display name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Nom du créateur <span className="text-red-500">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Votre nom public"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Biographie
          </label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Parlez-nous de vous et de votre style…"
            rows="4"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
          />
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Site web
          </label>
          <div className="relative">
            <GlobeAltIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="website"
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://votre-site.com"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        {/* Verification note */}
        {creatorProfile?.verificationStatus === 'VERIFIED' && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
            <CheckBadgeIcon className="w-5 h-5" />
            Votre profil est vérifié.
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/creator-dashboard')}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
