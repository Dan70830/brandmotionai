import React, { useEffect, useState } from 'react';
import { Check, Loader2, Sparkles, Package } from 'lucide-react';
import { GENERATION_STEPS, UGC_STYLES } from '../services/ugcService';
import type { UGCStyleId } from '../services/ugcService';

interface GenerationScreenProps {
  productImage: File | string;
  productName: string;
  style: UGCStyleId;
  currentStepIndex: number;
}

export const GenerationScreen: React.FC<GenerationScreenProps> = ({
  productImage,
  productName,
  style,
  currentStepIndex,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const selectedStyleObj = UGC_STYLES.find((s) => s.id === style);

  useEffect(() => {
    if (typeof productImage === 'string') {
      setPreviewUrl(productImage);
    } else {
      const url = URL.createObjectURL(productImage);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [productImage]);

  const progressPercent = Math.min(
    100,
    Math.round(((currentStepIndex + 0.5) / GENERATION_STEPS.length) * 100)
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700 mb-4 animate-pulse-subtle">
          <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
          AI Video Pipeline Active
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 mb-2">
          Creating your BrandMotion Video
        </h1>
        <p className="text-sm sm:text-base text-neutral-600">
          We're turning your product into a short-form video.
        </p>
      </div>

      {/* Product Context Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 mb-8 shadow-sm flex items-center gap-4 text-left max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden flex-shrink-0">
          {previewUrl ? (
            <img src={previewUrl} alt={productName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400">
              <Package className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-0.5">
            {selectedStyleObj?.name || 'UGC Video'}
          </span>
          <h3 className="text-sm font-bold text-neutral-900 truncate">{productName}</h3>
          <p className="text-xs text-neutral-600 font-medium">Generating 9:16 social clip</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-lg mx-auto mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-2">
          <span>Pipeline Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-neutral-200/80 overflow-hidden">
          <div
            className="h-full bg-neutral-950 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sequential Progress Stages */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-sm text-left max-w-lg mx-auto space-y-4">
        {GENERATION_STEPS.map((step, index) => {
          const isDone = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3.5 p-3 rounded-xl transition-all duration-300 ${
                isCurrent
                  ? 'bg-neutral-50 border border-neutral-200/80 shadow-xs'
                  : 'border border-transparent'
              }`}
            >
              {/* Step Icon */}
              <div className="mt-0.5 flex-shrink-0">
                {isDone && (
                  <div className="w-6 h-6 rounded-full bg-neutral-950 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                {isCurrent && (
                  <div className="w-6 h-6 rounded-full bg-neutral-950 text-white flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                )}
                {isPending && (
                  <div className="w-6 h-6 rounded-full border-2 border-neutral-300 bg-white flex items-center justify-center text-xs font-bold text-neutral-600">
                    {index + 1}
                  </div>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`text-sm font-bold tracking-tight ${
                    isCurrent
                      ? 'text-neutral-950'
                      : isDone
                      ? 'text-neutral-800'
                      : 'text-neutral-600'
                  }`}
                >
                  {step.label}
                </h4>
                <p
                  className={`text-xs ${
                    isCurrent
                      ? 'text-neutral-600 font-medium'
                      : isDone
                      ? 'text-neutral-500'
                      : 'text-neutral-600'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
