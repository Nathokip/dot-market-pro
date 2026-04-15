# Dot Market Prediction — Full System Documentation

## Project Overview

The **Dot Market Prediction** system is a full-stack, machine learning-powered application designed to forecast short-term stock market trends. It is built around a three-component architecture developed as a team effort:

| Component | File | Developer |
|---|---|---|
| Data Pipeline | `ml_data_pipeline.py` | Developer 1 |
| LSTM Model Training | `train_lstm_model.py` | Developer 2 |
| REST API Backend | `app.py` | Developer 3 |

---

## System Architecture

```
[yfinance API] ---> [ml_data_pipeline.py] ---> [train_lstm_model.py] ---> [dot_market_lstm.keras]
                                                                                     |
               Frontend Dashboard <--- JSON Response <--- [app.py (FastAPI)] <-------+
```

The data flows from raw stock market prices all the way through cleaning, feature engineering, LSTM inference, and out to a clean JSON API that a frontend dashboard can consume directly.

---

## Component 1: Data Pipeline (`ml_data_pipeline.py`)

### Purpose
Fetches, cleans, engineers features from, and normalizes historical stock market data into a scaled NumPy array ready for LSTM model training or inference.

### Dependencies
- `yfinance` — Fetches historical OHLCV stock data.
- `pandas` — Data manipulation.
- `pandas_ta` — Technical indicator calculations (RSI, MACD).
- `numpy` — Numerical array output.
- `scikit-learn` — `MinMaxScaler` for normalization.

### Core Function

```python
generate_ml_dataset(ticker: str, start_date: str, end_date: str) -> Tuple[np.ndarray, MinMaxScaler]
```

#### Processing Steps

| Step | Action | Detail |
|---|---|---|
| 1 | **Data Acquisition** | Downloads OHLCV data via `yfinance`. Handles MultiIndex columns returned by newer versions. |
| 2 | **Data Cleaning** | Forward-fills missing values within the series; drops entirely empty rows (non-trading days). |
| 3 | **Feature Engineering** | Appends `RSI_14`, `MACD_12_26_9`, `MACDh_12_26_9`, `MACDs_12_26_9` using `pandas_ta`. Drops initial NaN rows caused by rolling calculations. |
| 4 | **Normalization** | `MinMaxScaler` scales all 9 features to the range `[0, 1]`. |

#### Final Feature Set (9 columns)
`Open`, `High`, `Low`, `Close`, `Volume`, `RSI_14`, `MACD_12_26_9`, `MACDh_12_26_9`, `MACDs_12_26_9`

#### Returns
- `scaled_data` (`np.ndarray`): The fully preprocessed and scaled 2D array.
- `scaler` (`MinMaxScaler`): The **fitted** scaler. **Critical** — this must be saved and used later to inverse-transform the model's output prediction back into a real dollar price.

---

## Component 2: LSTM Model Training (`train_lstm_model.py`)

### Purpose
Builds, trains, and saves a deep Long Short-Term Memory (LSTM) neural network to predict the next day's 'Close' price from a sequence of the preceding 60 days of market data.

### Dependencies
- `numpy`
- `tensorflow` / `keras`

### Functions

#### `create_sequences(data, time_steps=60, target_col_index=3)`
Converts the flat 2D array from the data pipeline into a 3D tensor of shape `(samples, time_steps, features)` that LSTM layers require.
- **Lookback period**: 60 days.
- **Target (y)**: The 'Close' price at index `3` for the next day.

#### `split_data(X, y, train_ratio=0.8)`
Splits data into an **80% training / 20% testing** split.
> ⚠️ **Data is never shuffled.** Temporal order is strictly preserved to prevent data leakage (training on future data points would give the model false accuracy).

#### `build_model(input_shape)`
Constructs the LSTM network architecture.

| Layer | Type | Units | Notes |
|---|---|---|---|
| 1 | `LSTM` | 50 | `return_sequences=True` — passes the full sequence to the next LSTM. |
| 2 | `Dropout` | — | 20% — prevents overfitting on noisy financial data. |
| 3 | `LSTM` | 50 | `return_sequences=False` — compresses sequence into a single vector. |
| 4 | `Dropout` | — | 20% — secondary regularization. |
| 5 | `Dense` | 1 | Output: the predicted scaled 'Close' price. |

**Total Parameters: 32,251**

### Compilation

| Setting | Value | Reason |
|---|---|---|
| Optimizer | `Adam` | Adaptive learning rate; performs well on RNNs. |
| Loss | `MeanSquaredError` | Standard regression loss. |
| Callback | `EarlyStopping` (patience=10) | Stops training if validation loss stops improving; restores best weights. |

### Training Configuration
- **Max Epochs**: 50
- **Batch Size**: 32
- **Validation**: `(X_test, y_test)` passed directly.

### Deliverable
The trained model is saved as `dot_market_lstm.keras` in the project root.

---

## Component 3: REST API Backend (`app.py`)

### Purpose
A FastAPI server that bridges the ML model and the frontend dashboard. Exposes a prediction endpoint that takes a ticker symbol and returns a structured JSON forecast.

### Dependencies
- `fastapi` + `uvicorn` — Web framework and ASGI server.
- `tensorflow` — For loading the saved `.keras` model.
- `numpy` — Array operations for inference.

### Running the Server
```bash
.venv/bin/python app.py
# Server starts at http://0.0.0.0:8000
```

### Startup Behavior
On boot, the server loads `dot_market_lstm.keras` into memory **once** as a global variable. This is a critical low-latency optimization — model loading is expensive (disk I/O + deserialization) and must not happen per request.

---

### Endpoint

#### `GET /api/predict/{ticker}`

Accepts a stock ticker symbol and returns a prediction for the next trading day.

**Example Request:**
```
GET /api/predict/AAPL
```

**Internal Processing Flow:**
1. Computes a 120-day date window ending today to ensure ≥ 60 valid trading days post indicator calculation.
2. Calls `generate_ml_dataset(ticker, start_date, end_date)` to get `scaled_data` and `fitted_scaler`.
3. Slices the **last 60 rows** from `scaled_data` and reshapes to `(1, 60, 9)`.
4. Passes the tensor to `model.predict()` → receives a scaled 'Close' prediction.
5. **Inverse transformation**: Places the scaled prediction into a zero-padded dummy row at index `3` (Close's position), then calls `fitted_scaler.inverse_transform()` to recover the real dollar price.
6. Compares the forecast against the last known close price to determine trend direction.
7. Recovers the last 7 days of real closing prices for chart rendering.

**Example Response:**
```json
{
    "ticker": "AAPL",
    "target_date": "2026-03-16",
    "forecasted_price": 215.43,
    "trend_direction": "Uptrend",
    "historical_chart_data": [210.10, 211.55, 209.30, 212.00, 213.87, 214.12, 214.90]
}
```

**Response Fields:**

| Field | Type | Description |
|---|---|---|
| `ticker` | `string` | The stock symbol, uppercased. |
| `target_date` | `string` (YYYY-MM-DD) | The next trading day. Skips weekends automatically. |
| `forecasted_price` | `float` | The inverse-transformed price prediction in USD. |
| `trend_direction` | `string` | `"Uptrend"` if forecast > last close, else `"Downtrend"`. |
| `historical_chart_data` | `array[float]` | Last 7 days of real closing prices for the chart line. |

**Error Responses:**

| Status Code | Scenario |
|---|---|
| `404` | Ticker symbol not found / no data returned by `yfinance`. |
| `400` | Insufficient data (< 60 trading days available). |
| `500` | Model not loaded, or an unhandled internal error. |

---

## Interactive API Documentation

FastAPI auto-generates interactive Swagger UI at:
```
http://localhost:8000/docs
```

---

## Installation & Setup

### 1. Create and activate the virtual environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install all dependencies
```bash
pip install yfinance pandas pandas_ta scikit-learn numpy tensorflow fastapi uvicorn
```

### 3. Train the model (only needs to be done once)
```bash
python train_lstm_model.py
# Saves 'dot_market_lstm.keras' to the project root
```

### 4. Start the prediction API server
```bash
python app.py
# Server runs at http://0.0.0.0:8000
```

### 5. Query a prediction
```bash
curl http://localhost:8000/api/predict/MSFT
```

---

## File Reference

| File | Role |
|---|---|
| `ml_data_pipeline.py` | Data ingestion, cleaning, feature engineering, and normalization. |
| `train_lstm_model.py` | LSTM model design, training, and save logic. |
| `app.py` | FastAPI REST API that serves predictions to the frontend. |
| `dot_market_lstm.keras` | The serialized, trained Keras model artifact. |
| `ml_data_pipeline_docs.md` | Documentation for the data pipeline component. |
| `train_lstm_model_docs.md` | Documentation for the LSTM training component. |
# dot-market-pro
