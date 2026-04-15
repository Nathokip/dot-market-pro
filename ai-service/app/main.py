from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import yfinance as yf
from models.lstm_model import LSTMPredictor
from models.random_forest import RandomForestPredictor
from models.prophet_model import ProphetPredictor
from services.indicator_service import IndicatorService
from services.sentiment_service import SentimentService
import logging

app = FastAPI(title="Dot Market AI Service", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
lstm_predictor = LSTMPredictor()
rf_predictor = RandomForestPredictor()
prophet_predictor = ProphetPredictor()
indicator_service = IndicatorService()
sentiment_service = SentimentService()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-prediction"}

@app.post("/predict/{symbol}")
async def predict_stock(
    symbol: str,
    days: int = 5,
    model_type: str = "ensemble"
):
    """
    Generate stock price predictions using multiple AI models
    """
    try:
        # Fetch historical data
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1y")
        
        if hist.empty:
            raise HTTPException(status_code=404, detail="Stock data not found")
        
        # Generate predictions based on model type
        predictions = {}
        
        if model_type in ["lstm", "ensemble"]:
            lstm_pred = lstm_predictor.predict(hist, days)
            predictions["lstm"] = lstm_pred
        
        if model_type in ["random_forest", "ensemble"]:
            rf_pred = rf_predictor.predict(hist, days)
            predictions["random_forest"] = rf_pred
        
        if model_type in ["prophet", "ensemble"]:
            prophet_pred = prophet_predictor.predict(hist, days)
            predictions["prophet"] = prophet_pred
        
        # Ensemble prediction (average of all models)
        if model_type == "ensemble":
            final_prediction = np.mean([list(p.values()) for p in predictions.values()], axis=0)
        else:
            final_prediction = list(predictions[model_type].values())
        
        # Calculate confidence score
        confidence = calculate_confidence(predictions)
        
        # Determine trend direction
        current_price = hist['Close'].iloc[-1]
        predicted_price = final_prediction[-1]
        trend_direction = "Bullish" if predicted_price > current_price else "Bearish"
        
        # Generate trading signal
        signal = generate_trading_signal(current_price, predicted_price, confidence)
        
        return {
            "symbol": symbol,
            "current_price": float(current_price),
            "predicted_price": float(predicted_price),
            "confidence": confidence,
            "trend": trend_direction,
            "signal": signal,
            "predictions": {
                "dates": [datetime.now() + timedelta(days=i) for i in range(1, days+1)],
                "values": final_prediction.tolist()
            },
            "model_predictions": predictions
        }
        
    except Exception as e:
        logging.error(f"Prediction error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/indicators/{symbol}")
async def get_technical_indicators(symbol: str):
    """
    Calculate technical indicators for a stock
    """
    try:
        # Fetch historical data
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="3mo")
        
        if hist.empty:
            raise HTTPException(status_code=404, detail="Stock data not found")
        
        # Calculate indicators
        indicators = indicator_service.calculate_all(hist)
        
        return {
            "symbol": symbol,
            "timestamp": datetime.now(),
            "indicators": indicators
        }
        
    except Exception as e:
        logging.error(f"Indicator calculation error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/backtest")
async def backtest_model(
    symbol: str,
    start_date: str,
    end_date: str,
    model_type: str
):
    """
    Backtest AI model on historical data
    """
    try:
        # Fetch historical data
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, end=end_date)
        
        if hist.empty:
            raise HTTPException(status_code=404, detail="Stock data not found")
        
        # Split data into train and test
        train_size = int(len(hist) * 0.8)
        train_data = hist[:train_size]
        test_data = hist[train_size:]
        
        # Train and predict based on model type
        if model_type == "lstm":
            model = LSTMPredictor()
            predictions = model.backtest(train_data, test_data)
        elif model_type == "random_forest":
            model = RandomForestPredictor()
            predictions = model.backtest(train_data, test_data)
        elif model_type == "prophet":
            model = ProphetPredictor()
            predictions = model.backtest(train_data, test_data)
        else:
            raise HTTPException(status_code=400, detail="Invalid model type")
        
        # Calculate accuracy metrics
        actual = test_data['Close'].values
        predicted = predictions['values']
        
        mape = np.mean(np.abs((actual - predicted) / actual)) * 100
        rmse = np.sqrt(np.mean((actual - predicted) ** 2))
        
        return {
            "symbol": symbol,
            "model_type": model_type,
            "test_period": {
                "start": test_data.index[0],
                "end": test_data.index[-1]
            },
            "metrics": {
                "mape": float(mape),
                "rmse": float(rmse),
                "accuracy": float(100 - mape)
            },
            "predictions": predictions,
            "actual_values": actual.tolist()
        }
        
    except Exception as e:
        logging.error(f"Backtest error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sentiment/{symbol}")
async def get_sentiment_analysis(symbol: str):
    """
    Analyze sentiment from news and social media
    """
    try:
        # Fetch news for the symbol
        news_articles = fetch_news(symbol)
        
        # Analyze sentiment using FinBERT
        sentiment_results = sentiment_service.analyze_batch(news_articles)
        
        # Calculate aggregate sentiment
        bullish_count = sum(1 for s in sentiment_results if s['label'] == 'Bullish')
        neutral_count = sum(1 for s in sentiment_results if s['label'] == 'Neutral')
        bearish_count = sum(1 for s in sentiment_results if s['label'] == 'Bearish')
        
        total = len(sentiment_results)
        sentiment_scores = {
            "bullish": bullish_count / total if total > 0 else 0,
            "neutral": neutral_count / total if total > 0 else 0,
            "bearish": bearish_count / total if total > 0 else 0
        }
        
        return {
            "symbol": symbol,
            "timestamp": datetime.now(),
            "sentiment_scores": sentiment_scores,
            "overall_sentiment": max(sentiment_scores, key=sentiment_scores.get),
            "recent_news": [
                {
                    "title": article['title'],
                    "sentiment": sentiment_results[i]['label'],
                    "confidence": sentiment_results[i]['confidence']
                }
                for i, article in enumerate(news_articles[:5])
            ]
        }
        
    except Exception as e:
        logging.error(f"Sentiment analysis error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def calculate_confidence(predictions):
    """
    Calculate confidence score based on model agreement
    """
    if len(predictions) == 1:
        return 85.0  # Default confidence for single model
    
    # Calculate standard deviation of predictions
    pred_values = [list(p.values()) for p in predictions.values()]
    std_dev = np.std(pred_values)
    
    # Higher confidence when models agree (lower std dev)
    confidence = max(50, min(100, 100 - (std_dev * 10)))
    
    return round(confidence, 2)

def generate_trading_signal(current_price, predicted_price, confidence):
    """
    Generate trading signal based on prediction and confidence
    """
    percent_change = ((predicted_price - current_price) / current_price) * 100
    
    if confidence < 70:
        return "HOLD"
    elif percent_change > 5:
        return "STRONG BUY"
    elif percent_change > 2:
        return "BUY"
    elif percent_change < -5:
        return "STRONG SELL"
    elif percent_change < -2:
        return "SELL"
    else:
        return "HOLD"

def fetch_news(symbol):
    """
    Fetch news articles for a symbol
    """
    # This would integrate with financial news APIs
    # For now, return sample data
    return [
        {
            "title": f"{symbol} reports strong quarterly earnings",
            "date": datetime.now() - timedelta(hours=2),
            "source": "Financial Times"
        },
        {
            "title": f"Analysts upgrade {symbol} to buy",
            "date": datetime.now() - timedelta(hours=5),
            "source": "Bloomberg"
        },
        {
            "title": f"{symbol} announces new product launch",
            "date": datetime.now() - timedelta(days=1),
            "source": "Reuters"
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)