export function getPrediction() {
  const price = 180 + Math.random() * 10;
  const confidence = 85 + Math.random() * 10;
  const bullish = Math.random() > 0.5;

  return {
    current: 182.4,
    predicted: price.toFixed(2),
    confidence: confidence.toFixed(1),
    trend: bullish ? "Bullish" : "Bearish",
    sentiment: bullish ? "Positive" : "Negative",
  };
}