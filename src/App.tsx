import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, CheckCircle, Play, Info, ArrowLeft, RefreshCw, X, Image as ImageIcon } from 'lucide-react';
import * as GSPLAT from 'gsplat';

// --- Types ---
type AppState = 'welcome' | 'capture' | 'processing' | 'viewer';

interface CapturedImage {
    id: string;
    url: string;
}

const SAMPLE_SPLAT_URL = 'https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k-mini.splat';

const SYNTHETIC_IMAGES = [
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1581092921461-7d156820573e?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800&auto=format&fit=crop&q=60',
];

// --- Main App ---
export default function App() {
    const [state, setState] = useState<AppState>('welcome');
    const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
    const [progress, setProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState('Extracting features...');

    const startNewCapture = () => {
        setCapturedImages([]);
        setState('capture');
    };

    const startProcessing = () => {
        setState('processing');
        simulateProcessing();
    };

    const simulateProcessing = () => {
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += Math.random() * 5;
            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);
                setTimeout(() => setState('viewer'), 1000);
            }
            setProgress(Math.floor(currentProgress));

            if (currentProgress < 30) setProcessingStatus('Feature Extraction...');
            else if (currentProgress < 60) setProcessingStatus('Structure from Motion...');
            else if (currentProgress < 90) setProcessingStatus('Gaussian Optimization...');
            else setProcessingStatus('Finalizing mesh...');
        }, 150);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-black overflow-hidden relative">
            <AnimatePresence mode="wait">
                {state === 'welcome' && (
                    <WelcomeView key="welcome" onStart={startNewCapture} onUpload={() => setState('viewer')} />
                )}
                {state === 'capture' && (
                    <CameraView
                        key="capture"
                        images={capturedImages}
                        onCapture={(url) => setCapturedImages(prev => [{ id: Date.now().toString(), url }, ...prev])}
                        onDone={startProcessing}
                        onCancel={() => setState('welcome')}
                        isSynthetic={false} // Prioritize real camera for iPhone testing
                    />
                )}
                {state === 'processing' && (
                    <ProcessingView
                        key="processing"
                        progress={progress}
                        status={processingStatus}
                        imageCount={capturedImages.length}
                    />
                )}
                {state === 'viewer' && (
                    <SplatViewer key="viewer" onBack={() => setState('welcome')} />
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Views ---

function WelcomeView({ onStart, onUpload }: { onStart: () => void, onUpload: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        >
            <div className="w-24 h-24 accent-gradient rounded-3xl mb-8 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                <Camera size={48} color="white" />
            </div>
            <h1 className="text-5xl font-bold mb-4 gradient-text tracking-tight">SplatCam</h1>
            <p className="text-gray-400 mb-12 max-w-xs leading-relaxed">
                Turn your physical world into high-fidelity 3D Gaussian Splats directly from your iPhone.
            </p>

            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button onClick={onStart} className="btn-primary py-4 text-lg">
                    Start New Scan
                </button>
                <button onClick={onUpload} className="glass py-4 rounded-full font-semibold border-white/10 text-white/80 hover:bg-white/10 transition-colors">
                    View Gallery
                </button>
            </div>

            <div className="mt-16 flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest font-semibold">
                <Info size={14} /> Powered by Gaussian Splatting
            </div>
        </motion.div>
    );
}

function CameraView({ images, onCapture, onDone, onCancel, isSynthetic = false }: {
    images: CapturedImage[],
    onCapture: (url: string) => void,
    onDone: () => void,
    onCancel: () => void,
    isSynthetic?: boolean
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        if (isSynthetic) return;

        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false
                });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error("Camera error:", err);
                setCameraError("Camera access denied or unavailable. Using Synthetic Mode.");
            }
        }
        setupCamera();
        return () => {
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [isSynthetic]);

    const takePhoto = () => {
        if (isSynthetic || cameraError) {
            // Use a synthetic image from our list
            const mockupUrl = SYNTHETIC_IMAGES[images.length % SYNTHETIC_IMAGES.length];
            onCapture(mockupUrl);
            return;
        }

        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);
            onCapture(canvas.toDataURL('image/jpeg', 0.8));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center h-full relative bg-[#0a0a0a]"
        >
            {(!isSynthetic && !cameraError) ? (
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-full h-full absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-50" />
                    <div className="relative z-10 glass p-8 rounded-3xl max-w-xs">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <ImageIcon size={32} className="text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Synthetic Capture</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Camera is disabled for this session. Use the shutter button below to capture high-fidelity synthetic images for reconstruction.
                        </p>
                    </div>
                </div>
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera UI Overlays */}
            <div className="absolute inset-x-0 top-0 p-6 flex justify-between items-center glass-dark">
                <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10"><X size={24} /></button>
                <div className="text-sm font-bold tracking-widest">{images.length} PHOTOS TAKEN</div>
                <div className="w-10" />
            </div>

            {/* Viewfinder crosshair */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 bg-white/50 rounded-full" />
                </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center glass-dark">
                <div className="flex items-center justify-between w-full mb-8">
                    <div className="w-16 h-16 rounded-xl border-2 border-white/20 overflow-hidden bg-black/50 flex items-center justify-center">
                        {images.length > 0 ? (
                            <img src={images[0].url} className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon size={24} className="text-white/20" />
                        )}
                    </div>

                    <button onClick={takePhoto} className="capture-btn">
                        <div className="capture-btn-inner" />
                    </button>

                    <button
                        onClick={onDone}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${images.length >= 5 ? 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/40' : 'bg-white/10 opacity-30 cursor-not-allowed'}`}
                        disabled={images.length < 5}
                    >
                        <CheckCircle size={32} />
                    </button>
                </div>
                <p className="text-xs text-white/60 uppercase tracking-widest">Take at least 5 photos for reconstruction</p>
            </div>
        </motion.div>
    );
}

function ProcessingView({ progress, status, imageCount }: { progress: number, status: string, imageCount: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050505]"
        >
            <div className="relative w-48 h-48 mb-12">
                {/* Infinite rotating circles for a techy look */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 border-4 border-purple-500/20 rounded-full border-t-purple-500"
                />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-bold">{progress}%</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Status</span>
                </div>
            </div>

            <div className="text-center w-full max-w-xs">
                <h2 className="text-2xl font-semibold mb-2">{status}</h2>
                <p className="text-gray-500 text-sm mb-8">Processing {imageCount} high-resolution captures via cloud GPU...</p>

                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full accent-gradient"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </motion.div>
    );
}

function SplatViewer({ onBack }: { onBack: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        container.appendChild(canvas);

        const scene = new GSPLAT.Scene();
        const camera = new GSPLAT.Camera();
        const renderer = new GSPLAT.WebGLRenderer(canvas);
        const controls = new GSPLAT.OrbitControls(camera, canvas);

        async function loadSplat() {
            try {
                await GSPLAT.Loader.LoadAsync(SAMPLE_SPLAT_URL, scene, (p: number) => {
                    // Can track loading progress here if needed
                });
                setIsLoading(false);
            } catch (err) {
                console.error("Splat loading error:", err);
            }
        }

        loadSplat();

        let frameId: number;
        const animate = () => {
            controls.update();
            renderer.render(scene, camera);
            frameId = requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener("resize", handleResize);
        handleResize();

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener("resize", handleResize);
            container.innerHTML = '';
            renderer.dispose();
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full bg-black relative"
        >
            <div ref={containerRef} className="flex-1" />

            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-10">
                    <RefreshCw className="animate-spin mb-4 text-indigo-500" size={48} />
                    <p className="text-lg font-semibold">Streaming 3D Data...</p>
                    <p className="text-sm text-gray-500">Connecting to point cloud network</p>
                </div>
            )}

            {/* Viewer Overlay UI */}
            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center pointer-events-none">
                <button
                    onClick={onBack}
                    className="p-3 rounded-full glass-dark pointer-events-auto hover:bg-white/10 transition-all border border-white/5 shadow-xl"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="px-4 py-2 rounded-full glass-dark text-[10px] font-bold tracking-[0.2em] border border-white/5 pointer-events-auto">
                    3D GAUSSIAN SPLAT • L3-A1
                </div>
                <div className="w-10" />
            </div>

            <div className="absolute bottom-8 inset-x-0 flex justify-center pointer-events-none">
                <div className="glass-dark px-6 py-4 rounded-3xl flex gap-8 border border-white/10 pointer-events-auto shadow-2xl">
                    <button className="flex flex-col items-center gap-1 group">
                        <div className="p-2 rounded-full group-hover:bg-white/10 transition-colors">
                            <Play size={20} className="text-white/80" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Animate</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 group">
                        <div className="p-2 rounded-full group-hover:bg-white/10 transition-colors">
                            <Upload size={20} className="text-white/80" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Share</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
