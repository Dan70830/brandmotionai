import React, { useState, useRef } from 'react';
import { Upload, Check, Image as ImageIcon, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { UGC_STYLES } from '../services/ugcService';
import type { UGCStyleId } from '../services/ugcService';

interface CreateScreenProps {
  onGenerate: (data: {
    productImage: File | string;
    productName: string;
    productDescription: string;
    style: UGCStyleId;
  }) => void;
}

export const CreateScreen: React.FC<CreateScreenProps> = ({ onGenerate }) => {
  const [productImage, setProductImage] = useState<File | string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<UGCStyleId | null>('problem_solution');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setErrorMessage(null);
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    setProductImage(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeImage = () => {
    setProductImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFormValid =
    Boolean(productImage) &&
    productName.trim().length > 0 &&
    productDescription.trim().length > 0 &&
    Boolean(selectedStyle);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !productImage || !selectedStyle) return;

    onGenerate({
      productImage,
      productName: productName.trim(),
      productDescription: productDescription.trim(),
      style: selectedStyle,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
          AI Short-Form Generator
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 font-sans mb-3">
          Create UGC that feels native to social.
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 max-w-xl mx-auto font-normal">
          Turn your product into short-form content in minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Product Upload */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 sm:p-7 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center justify-between">
              Your product
              {previewUrl && (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Image ready
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">Upload a clear product image.</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {!previewUrl ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-neutral-900 bg-neutral-50 scale-[1.005]'
                  : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/50 hover:bg-neutral-50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center mx-auto mb-3 text-neutral-700">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 mb-1">
                Click to upload <span className="font-normal text-neutral-500">or drag and drop</span>
              </p>
              <p className="text-xs text-neutral-400">
                PNG, JPG, or WEBP up to 10MB
              </p>
            </div>
          ) : (
            <div className="relative rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-36 h-36 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-white border border-neutral-200 shadow-sm flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Product Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center justify-center sm:justify-start gap-1.5">
                  <ImageIcon className="w-4 h-4 text-neutral-500" />
                  Product image uploaded
                </h3>
                <p className="text-xs text-neutral-500">
                  This image will be used as the visual anchor for video generation.
                </p>
                <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                  >
                    Replace image
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              {errorMessage}
            </div>
          )}
        </div>

        {/* Section 2: Product Information */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 sm:p-7 shadow-sm transition-shadow hover:shadow-md space-y-5">
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Product Information
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Product name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. EcoFresh Hydrating Facial Mist"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              What does your product do?
            </label>
            <textarea
              rows={3}
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Briefly describe what it does and who it's for..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        {/* Section 3: UGC Style Selection */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 sm:p-7 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Choose a style</h2>
            <p className="text-xs sm:text-sm text-neutral-500">Select the narrative angle for your social clip.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {UGC_STYLES.map((style) => {
              const isSelected = selectedStyle === style.id;
              return (
                <div
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-md'
                      : 'border-neutral-200/90 bg-white hover:border-neutral-400 text-neutral-900 hover:bg-neutral-50/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        Style
                      </span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-white text-neutral-950' : 'border border-neutral-300 text-transparent group-hover:border-neutral-400'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <h3 className={`text-base font-bold mb-1 tracking-tight ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                      {style.name}
                    </h3>
                    <p className={`text-xs leading-relaxed ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                      {style.tagline}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generate Button CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full py-4 rounded-xl font-extrabold text-base tracking-tight flex items-center justify-center gap-2 transition-all shadow-md ${
              isFormValid
                ? 'bg-neutral-950 hover:bg-neutral-800 text-white cursor-pointer hover:shadow-lg active:scale-[0.995]'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
            }`}
          >
            Generate UGC
            <ArrowRight className="w-5 h-5" />
          </button>
          {!isFormValid && (
            <p className="text-center text-xs text-neutral-600 mt-2 font-medium">
              Please upload a product image, name, description, and style to enable generation.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
