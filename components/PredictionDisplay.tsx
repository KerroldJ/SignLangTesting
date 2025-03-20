'use client';

interface PredictionDisplayProps {
    prediction: string | null;
}

const PredictionDisplay: React.FC<PredictionDisplayProps> = ({ prediction }) => {
    return (
        <div className="flex flex-col items-center">
            {prediction && (
                <div className="mt-4 p-3 bg-gray-200 rounded text-black font-bold">
                    Prediction: {prediction}
                </div>
            )}
        </div>
    );
};

export default PredictionDisplay;