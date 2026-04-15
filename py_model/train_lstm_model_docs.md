# LSTM Model Training Pipeline (`train_lstm_model.py`)

## Overview
This script builds, trains, and saves a Deep Learning model specifically designed for financial time-series forecasting. It implements a Long Short-Term Memory (LSTM) neural network using Keras and TensorFlow. The model takes sequential market data (preprocessed by the data pipeline) and predicts the scaled 'Close' price for the next day.

## Dependencies
- `numpy`: Array manipulations and sequence generation.
- `tensorflow`: The core deep learning framework.
- `tensorflow.keras`: Used for the high-level neural network API (Sequential model, LSTM, Dropout, Dense layers, and EarlyStopping).

## Architecture & Process Flow

The pipeline executes through several key phases:

### 1. Sequence Generation
Before training, the 2D dataset must be converted into a 3D tensor shape `(samples, time_steps, features)` that LSTM layers expect.
- **Function**: `create_sequences`
- **Lookback Period (`time_steps`)**: Defaults to 60 days. This means the model examines the previous 60 days of market data to predict the target for day 61.
- **Target Variable**: The next day's 'Close' price (extracted from index `3` of the feature array).

### 2. Temporal Train/Test Split
- **Function**: `split_data`
- Divides the sequences into an 80% training set and a 20% testing set.
- **Crucial Rule**: The data is strictly split sequentially. It is *not* shuffled, as preserving the chronological order is mandatory in time-series forecasting to avoid "looking into the future" (data leakage).

### 3. Model Architecture
- **Function**: `build_model`
- The sequential architecture consists of:
  - **LSTM Layer 1 (50 units)**: With `return_sequences=True` so it passes its full output sequence to the next layer.
  - **Dropout Layer (20%)**: Randomly ignores 20% of the neurons during training to explicitly prevent overfitting on mathematical noise naturally found in stock movements.
  - **LSTM Layer 2 (50 units)**: Summarizes the information learned from the sequence.
  - **Dropout Layer (20%)**: Secondary regularization.
  - **Dense Layer (1 unit)**: The output node that predicts the continuous scaled target value.

### 4. Compilation and Training
- **Optimizer**: `Adam`, dynamically adjusts learning rates and works well with Recurrent Neural Networks (RNNs).
- **Loss Function**: `MeanSquaredError (MSE)`, the standard loss function for continuous regression targets.
- **Early Stopping**: Monitors the validation loss (`val_loss`) during training. If the model fails to improve for 10 consecutive epochs (`patience=10`), training halts early and the best weights are automatically restored. This saves compute time and serves as a final defense against overfitting.

### 5. Deliverable
- Once training completes, the model is serialized and saved directly to the project directory as `dot_market_lstm.keras`. This model can later be loaded and used for predictions in the trading platform alongside the fitted scaler from the data pipeline.
