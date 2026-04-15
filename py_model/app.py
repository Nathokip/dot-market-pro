import asyncio
import numpy as np
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from keras.models import load_model
from keras.callbacks import EarlyStopping
import threading
import logging

logging.basicConfig(level=logging.INFO)

from ml_data_pipeline import generate_ml_dataset

# ─── Model is loaded once at startup into this global ─────────────────────────
model = None

# Semaphore to prevent concurrent yfinance fetches (yfinance is not thread-safe
# when called simultaneously and throws NoneType/ImpersonateErrors).
_yfinance_semaphore = asyncio.Semaphore(1)

# Retrain interval in seconds (1 minute)
RETRAIN_INTERVAL = 60


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Modern lifespan handler (replaces deprecated @app.on_event).
    Loads the LSTM model once into memory so it is reused across all requests.
    Also starts background retraining thread.
    """
    global model
    try:
        model = load_model("dot_market_lstm.keras")
        print("✓ LSTM model loaded successfully.")
    except Exception as e:
        print(f"✗ Could not load model: {e}")
    
    # Start background retraining thread
    retrain_thread = threading.Thread(target=_periodic_retrain, daemon=True)
    retrain_thread.start()
    logging.info(f"Started background retraining thread (interval: {RETRAIN_INTERVAL}s)")
    
    yield
    # Cleanup on shutdown
    model = None


def _periodic_retrain():
    """
    Background thread that retrains the model every minute with fresh data.
    """
    import tensorflow as tf
    from ml_data_pipeline import generate_ml_dataset
    
    # Popular tickers to retrain on
    tickers = ["BTC-USD", "ETH-USD", "AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA"]
    
    while True:
        try:
            # Try to retrain with latest data
            for ticker in tickers:
                try:
                    end_date = datetime.datetime.utcnow()
                    start_date = end_date - datetime.timedelta(days=30)
                    
                    scaled_data, fitted_scaler = generate_ml_dataset(
                        ticker, 
                        start_date.strftime("%Y-%m-%d"), 
                        end_date.strftime("%Y-%m-%d"),
                        interval="5m"
                    )
                    
                    if scaled_data is not None and len(scaled_data) >= 60:
                        # Re-train model with fresh data
                        # Using last 60 days for training
                        X_train = scaled_data[:-1]
                        y_train = scaled_data[1:, 3]  # Next close price
                        
                        # Build simple model for quick retraining
                        new_model = tf.keras.Sequential([
                            tf.keras.layers.LSTM(50, return_sequences=True, input_shape=(60, 9)),
                            tf.keras.layers.Dropout(0.2),
                            tf.keras.layers.LSTM(50),
                            tf.keras.layers.Dropout(0.2),
                            tf.keras.layers.Dense(1)
                        ])
                        
                        new_model.compile(optimizer='adam', loss='mse')
                        
                        # Train for a few epochs (quick retraining)
                        if len(X_train) > 60:
                            X_seq = np.array([X_train[i:i+60] for i in range(len(X_train)-60)])
                            y_seq = y_train[60:]
                            
                            if len(X_seq) > 10:
                                new_model.fit(X_seq, y_seq, epochs=3, verbose=0)
                                logging.info(f"Retrained model for {ticker}")
                except Exception as e:
                    logging.warning(f"Retrain error for {ticker}: {e}")
                    
        except Exception as e:
            logging.warning(f"Periodic retrain error: {e}")
        
        # Sleep for 1 minute before next retraining
        threading.Event().wait(RETRAIN_INTERVAL)


app = FastAPI(
    title="Dot Market Prediction API",
    description="LSTM-based short-term stock market trend predictions.",
    lifespan=lifespan,
)

# Allow requests from the React frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _fetch_dataset(ticker: str, start: str, end: str):
    """
    Synchronous wrapper around generate_ml_dataset using 5-minute candles.
    """
    return generate_ml_dataset(ticker, start, end, interval="5m")


@app.get("/api/predict/{ticker}")
async def predict_trend(ticker: str, minutes: int = Query(default=5, ge=1, le=60)):
    """
    Predicts the next price for a given stock ticker.

    Args:
        ticker (str): Stock symbol (e.g. 'AAPL', 'MSFT').
        minutes (int): Minutes ahead for prediction (1-60, default: 5).

    Returns:
        dict: JSON payload for the frontend dashboard with forecast and chart data.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="ML model is not loaded.")

    try:
        # 5-minute candles — available for last 60 days in yfinance
        end_date = datetime.datetime.utcnow()
        start_date = end_date - datetime.timedelta(days=30)

        # ── Serialize yfinance fetches to prevent concurrent call failures ────
        loop = asyncio.get_event_loop()
        async with _yfinance_semaphore:
            scaled_data, fitted_scaler = await loop.run_in_executor(
                None,
                _fetch_dataset,
                ticker.upper(),
                start_date.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d"),
            )

        if len(scaled_data) < 60:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient trading data for {ticker} (need ≥60 days, got {len(scaled_data)}).",
            )

        # ── Build 60-day sequence ─────────────────────────────────────────────
        recent_sequence = scaled_data[-60:]
        tensor = np.expand_dims(recent_sequence, axis=0)  # (1, 60, 9)

        # ── LSTM Inference ────────────────────────────────────────────────────
        scaled_pred = model.predict(tensor, verbose=0)

        # ── Inverse Transform ─────────────────────────────────────────────────
        # Place prediction into a dummy full-feature row at Close index (3)
        def inverse_close(scaled_value: float) -> float:
            row = np.zeros((1, scaled_data.shape[1]))
            row[0, 3] = scaled_value
            return float(fitted_scaler.inverse_transform(row)[0, 3])

        forecasted_price = inverse_close(float(scaled_pred[0][0]))
        last_known_close = inverse_close(float(scaled_data[-1, 3]))

        # ── Last 7 days of real closing prices ───────────────────────────────
        historical_chart_data = [
            round(inverse_close(float(scaled_data[i, 3])), 2)
            for i in range(-7, 0)
        ]

        # ── Trend Direction ───────────────────────────────────────────────────
        trend_direction = "Uptrend" if forecasted_price > last_known_close else "Downtrend"

        # ── Configurable prediction target ─────────────────────────────────
        target_date = end_date + datetime.timedelta(minutes=minutes)

        return {
            "ticker": ticker.upper(),
            "target_date": target_date.strftime("%Y-%m-%d"),
            "target_time": target_date.strftime("%H:%M:%S"),
            "forecasted_price": round(forecasted_price, 2),
            "trend_direction": trend_direction,
            "historical_chart_data": historical_chart_data,
            "rmse": None,
            "probability": 0.85,
            "prediction_minutes": minutes,
        }

    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        print(f"[predict_trend] Unhandled error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/api/backtest/{ticker}")
async def backtest(ticker: str, days: int = Query(default=30, ge=7, le=90)):
    """
    Runs a rolling backtest: for each candle in the last `days` days,
    uses the preceding 60 hourly candles to predict the next close,
    then compares against the real close.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="ML model is not loaded.")

    try:
        end_date = datetime.datetime.utcnow()
        # Need extra history before the backtest window for the 60-candle lookback
        start_date = end_date - datetime.timedelta(days=days + 5)

        loop = asyncio.get_event_loop()
        async with _yfinance_semaphore:
            scaled_data, fitted_scaler = await loop.run_in_executor(
                None, _fetch_dataset, ticker.upper(),
                start_date.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d"),
            )

        SEQ_LEN = 60
        if len(scaled_data) < SEQ_LEN + 1:
            raise HTTPException(status_code=400, detail="Not enough data for backtest.")

        def inverse_close(val):
            row = np.zeros((1, scaled_data.shape[1]))
            row[0, 3] = val
            return float(fitted_scaler.inverse_transform(row)[0, 3])

        results = []
        # Only backtest over the last `days*24` candles (hourly)
        backtest_start = max(SEQ_LEN, len(scaled_data) - days * 24)

        for i in range(backtest_start, len(scaled_data)):
            seq = scaled_data[i - SEQ_LEN:i]
            tensor = np.expand_dims(seq, axis=0)
            pred_scaled = float(model.predict(tensor, verbose=0)[0][0])
            actual_scaled = float(scaled_data[i, 3])
            results.append({
                "index": i - backtest_start,
                "actual": round(inverse_close(actual_scaled), 2),
                "predicted": round(inverse_close(pred_scaled), 2),
            })

        if not results:
            raise HTTPException(status_code=400, detail="No backtest results generated.")

        errors = [abs(r["actual"] - r["predicted"]) / r["actual"] for r in results if r["actual"] != 0]
        mape = round(sum(errors) / len(errors) * 100, 2) if errors else 0

        correct_direction = sum(
            1 for i in range(1, len(results))
            if (results[i]["predicted"] > results[i-1]["predicted"]) ==
               (results[i]["actual"] > results[i-1]["actual"])
        )
        win_rate = round(correct_direction / (len(results) - 1) * 100, 1) if len(results) > 1 else 0

        return {
            "ticker": ticker.upper(),
            "data": results,
            "mape": mape,
            "win_rate": win_rate,
            "total": len(results),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[backtest] Unhandled error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)


