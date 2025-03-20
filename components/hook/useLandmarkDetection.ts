import { useEffect, useRef, useCallback } from 'react';
import * as handpose from '@tensorflow-models/handpose';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import axios from 'axios';

const useLandmarkDetection = (
    videoRef: React.RefObject<HTMLVideoElement>,
    isCameraActive: boolean,
    loading: boolean,
    setGesture: (gesture: string) => void
) => {
    const modelRef = useRef<handpose.HandPose | null>(null);
    const lastSentTime = useRef<number>(0);
    const canvasRef = useRef<HTMLCanvasElement | null>(null); // Reuse canvas
    const delay = 1000;

    // Load TensorFlow.js model
    useEffect(() => {
        const loadModel = async () => {
            await tf.setBackend('webgl');
            modelRef.current = await handpose.load();
        };

        if (typeof window !== 'undefined') {
            loadModel();
        }

        return () => {
            modelRef.current = null;
        };
    }, []);

    // Initialize canvas once
    useEffect(() => {
        if (typeof window !== 'undefined' && !canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }
    }, []);

    const processFrame = useCallback(async () => {
        if (
            !isCameraActive ||
            loading ||
            !modelRef.current ||
            !videoRef.current ||
            !canvasRef.current ||
            videoRef.current.videoWidth === 0 ||
            videoRef.current.videoHeight === 0
        ) {
            requestAnimationFrame(processFrame);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            requestAnimationFrame(processFrame);
            return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');

        await sendToServer(imageData); // Await to ensure sequential processing
        requestAnimationFrame(processFrame);
    }, [isCameraActive, loading, videoRef]);

    const sendToServer = useCallback(async (imageData: string) => {
        const now = Date.now();
        if (now - lastSentTime.current < delay) {
            return;
        }
        lastSentTime.current = now;

        try {
            console.log('📤 Sending image data');
            const response = await axios.post('http://127.0.0.1:5000/predict', { image: imageData });
            const { prediction, confidence } = response.data;
            console.log(`✅ Prediction: ${prediction} (Confidence: ${confidence}%)`);

            if (confidence >= 0.80) {
                setGesture(prediction);
            } else {
                setGesture('Unknown Hand Gesture');
            }
        } catch (error) {
            console.error('❌ Error sending data to server:', error);
            if (axios.isAxiosError(error) && error.response) {
                console.log('🔥 Server Response:', error.response.data);
            }
            setGesture('Unknown Hand Gesture');
        }
    }, [setGesture]);

    useEffect(() => {
        if (isCameraActive && !loading && videoRef.current) {
            requestAnimationFrame(processFrame);
        }
    }, [isCameraActive, loading, processFrame]);

    return {};
};

export default useLandmarkDetection;