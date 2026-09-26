export type UGCStyleId = 'problem_solution' | 'recommendation' | 'first_impression';

export interface UGCStyleOption {
  id: UGCStyleId;
  name: string;
  tagline: string;
  description: string;
}

export const UGC_STYLES: UGCStyleOption[] = [
  {
    id: 'problem_solution',
    name: 'Problem → Solution',
    tagline: 'Hook with a relatable problem, introduce product as solution.',
    description: 'Focuses on a common struggle and positions your product as the natural answer.',
  },
  {
    id: 'recommendation',
    name: 'Product Recommendation',
    tagline: 'Casual recommendation style narration.',
    description: 'Authentic creator sharing why they recommend your product to friends.',
  },
  {
    id: 'first_impression',
    name: 'First Impression',
    tagline: 'Spontaneous discovery and unboxing style content.',
    description: 'First-use reaction highlighting key features, texture, and packaging.',
  },
];

export interface UGCGenerationParams {
  productImage: File | string;
  productName: string;
  productDescription: string;
  style: UGCStyleId;
}

export interface UGCGenerationProgressStep {
  id: string;
  label: string;
  description: string;
  estimatedDurationMs: number;
}

export const GENERATION_STEPS: UGCGenerationProgressStep[] = [
  { id: 'understanding', label: 'Understanding your product', description: 'Analyzing key features and visual identity', estimatedDurationMs: 2000 },
  { id: 'scripting', label: 'Writing your script', description: 'Crafting short-form social hook & narrative', estimatedDurationMs: 2500 },
  { id: 'voice', label: 'Recording the voice', description: 'Synthesizing audio narration with Chatterbox TTS', estimatedDurationMs: 15000 },
  { id: 'video', label: 'Creating the video', description: 'Animating product imagery with LTX Video', estimatedDurationMs: 40000 },
  { id: 'captions', label: 'Adding captions', description: 'Burning dynamic social subtitles into MP4', estimatedDurationMs: 25000 },
];

export interface UGCGenerationResult {
  videoUrl: string;
  script: string;
  styleName: string;
  productName: string;
  productImageUrl: string;
  aspectRatio: '9:16' | '16:9';
  durationSeconds: number;
}

// Convert File to Base64 Data URL if needed
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Real Livepeer Pipeline Backend Service Integration
 */
export async function generateUGC(
  params: UGCGenerationParams,
  onProgress?: (stepIndex: number) => void
): Promise<UGCGenerationResult> {
  let imageUrl: string;

  if (typeof params.productImage === 'string') {
    imageUrl = params.productImage;
  } else {
    // Convert uploaded image file to data URL or blob URL
    imageUrl = await fileToBase64(params.productImage);
  }

  // 1. Post request to backend matching exact contract:
  // { product: { image, name, description }, ugcStyle }
  const response = await fetch('/api/generate-ugc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: {
        image: imageUrl,
        name: params.productName,
        description: params.productDescription,
      },
      ugcStyle: params.style,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error ${response.status}`);
  }

  const { jobId } = await response.json();
  const selectedStyle = UGC_STYLES.find((s) => s.id === params.style) || UGC_STYLES[0];

  // 2. Poll generation status until completion
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generation-status/${jobId}`);
        if (!res.ok) return;

        const jobState = await res.json();

        if (onProgress && typeof jobState.stepIndex === 'number') {
          onProgress(jobState.stepIndex);
        }

        if (jobState.status === 'completed' && jobState.finalVideoUrl) {
          clearInterval(interval);
          resolve({
            videoUrl: jobState.finalVideoUrl,
            script: jobState.script,
            styleName: selectedStyle.name,
            productName: params.productName,
            productImageUrl: imageUrl,
            aspectRatio: '9:16',
            durationSeconds: 8,
          });
        } else if (jobState.status === 'failed') {
          clearInterval(interval);
          reject(new Error(jobState.error || 'Video generation failed'));
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 2000);
  });
}

