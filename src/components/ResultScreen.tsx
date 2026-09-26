import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, RefreshCw, Check, Share2, Maximize2 } from 'lucide-react';
import type { UGCGenerationResult } from '../services/ugcService';

interface ResultScreenProps {
  result: UGCGenerationResult;
  onCreateAnother: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ result, onCreateAnother }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [result]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.videoUrl;
    link.download = `${result.productName.toLowerCase().replace(/\s+/g, '-')}-ugc-video.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(result.script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-700 mb-3">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          Generation Complete
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 mb-2">
          Your UGC is ready
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 max-w-md mx-auto">
          Short-form video generated for {result.productName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Responsive Video Player Column */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-xl group">
            {/* Video Element */}
            <video
              ref={videoRef}
              src={result.videoUrl}
              poster={result.productImageUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              playsInline
              loop
              className="w-full h-auto max-h-[540px] object-contain mx-auto"
            />

            {/* Overlay Play Button when Paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-neutral-950/80 hover:bg-neutral-950 text-white flex items-center justify-center backdrop-blur-sm transition-transform duration-200 hover:scale-110 shadow-lg border border-white/20 cursor-pointer"
              >
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </button>
            )}

            {/* Video Control Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/50 to-transparent p-4 transition-opacity duration-200 opacity-90 group-hover:opacity-100">
              {/* Scrubber */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white mb-2"
              />

              <div className="flex items-center justify-between text-white text-xs font-medium">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="hover:text-neutral-300 transition-colors cursor-pointer">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>
                  <button onClick={toggleMute} className="hover:text-neutral-300 transition-colors cursor-pointer">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span>
                    {formatTime(currentTime)} / {formatTime(duration || 8)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={toggleFullscreen} className="hover:text-neutral-300 transition-colors cursor-pointer">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Metadata & Actions Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1">
                UGC Style
              </span>
              <span className="inline-block px-3 py-1 rounded-lg bg-neutral-100 text-neutral-900 font-extrabold text-sm border border-neutral-200">
                {result.styleName}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Generated Script
                </span>
                <button
                  onClick={copyScript}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" /> Copy script
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-sm font-medium text-neutral-800 leading-relaxed italic">
                "{result.script}"
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-sm tracking-tight flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.995] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download video
            </button>

            <button
              onClick={onCreateAnother}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-900 font-extrabold text-sm border border-neutral-300 tracking-tight flex items-center justify-center gap-2 shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-neutral-500" />
              Create another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
