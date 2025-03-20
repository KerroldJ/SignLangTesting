'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export const useHandTracking = (videoElement: HTMLVideoElement | null, stream: MediaStream | null) => {
    const [prediction, setPrediction] = useState<string | null>(null);

    const SERVER_URL = 'http://localhost:5001/predict';
    const SEND_INTERVAL = 1000;

    useEffect(() => {
        if (!videoElement || !stream) return;

        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        let lastKeyFrameFeatures: number[] | null = null;
        let lastSentTime = 0;
        let previousLandmarks: any = null;

        hands.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const features = landmarks.flatMap((landmark: any) => [
                    landmark.x,
                    landmark.y,
                    landmark.z
                ]);

                if (previousLandmarks) {
                    const movement = features.reduce((sum: number, val: number, idx: number) => {
                        const diff = val - previousLandmarks[idx];
                        return sum + diff * diff;
                    }, 0);

                    if (movement > 0.01) {
                        lastKeyFrameFeatures = features;
                    }
                }
                previousLandmarks = features;

                const currentTime = Date.now();
                if (lastKeyFrameFeatures && currentTime - lastSentTime >= SEND_INTERVAL) {
                    const formData = new FormData();
                    formData.append('features', JSON.stringify(lastKeyFrameFeatures));

                    axios.post(SERVER_URL, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    }).then(response => {
                        if (response.data.prediction) {
                            setPrediction(response.data.prediction);
                        }
                    }).catch(error => {
                        console.error('Error sending to server:', error);
                    });

                    lastSentTime = currentTime;
                    lastKeyFrameFeatures = null;
                }
            }
        });

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement! });
            },
            width: 640,
            height: 480
        });
        camera.start();

        return () => {
            camera.stop();
            hands.close();
        };
    }, [videoElement, stream]);

    return { prediction };
};