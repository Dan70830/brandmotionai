import { useState } from 'react';
import { Header } from './components/Header';
import { CreateScreen } from './components/CreateScreen';
import { GenerationScreen } from './components/GenerationScreen';
import { ResultScreen } from './components/ResultScreen';
import { generateUGC } from './services/ugcService';
import type {
  UGCStyleId,
  UGCGenerationParams,
  UGCGenerationResult,
} from './services/ugcService';

type AppStep = 'create' | 'generating' | 'result';

export function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('create');
  const [params, setParams] = useState<UGCGenerationParams | null>(null);
  const [result, setResult] = useState<UGCGenerationResult | null>(null);
  const [progressStepIndex, setProgressStepIndex] = useState<number>(0);

  const handleStartGeneration = async (data: {
    productImage: File | string;
    productName: string;
    productDescription: string;
    style: UGCStyleId;
  }) => {
    setParams(data);
    setCurrentStep('generating');
    setProgressStepIndex(0);

    try {
      const res = await generateUGC(data, (stepIdx) => {
        setProgressStepIndex(stepIdx);
      });
      setResult(res);
      setCurrentStep('result');
    } catch (err) {
      console.error('Generation failed:', err);
      setCurrentStep('create');
    }
  };

  const handleCreateAnother = () => {
    setParams(null);
    setResult(null);
    setProgressStepIndex(0);
    setCurrentStep('create');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col font-sans">
      <Header onLogoClick={handleCreateAnother} />

      <main className="flex-1">
        {currentStep === 'create' && (
          <CreateScreen onGenerate={handleStartGeneration} />
        )}

        {currentStep === 'generating' && params && (
          <GenerationScreen
            productImage={params.productImage}
            productName={params.productName}
            style={params.style}
            currentStepIndex={progressStepIndex}
          />
        )}

        {currentStep === 'result' && result && (
          <ResultScreen result={result} onCreateAnother={handleCreateAnother} />
        )}
      </main>

      <footer className="py-6 border-t border-neutral-200/60 bg-[#FAF9F5] text-center text-xs text-neutral-500 font-medium">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>UGC Studio — AI Short-Form Content Generator</span>
          <span className="text-neutral-600">Powered by Livepeer Agent</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
