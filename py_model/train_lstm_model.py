from ml_data_pipeline import generate_ml_dataset
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense
from tensorflow.keras.callbacks import EarlyStopping
from typing import Tuple

def create_sequences(data: np.ndarray, time_steps: int = 60, target_col_index: int = 3) -> Tuple[np.ndarray, np.ndarray]:
    """
    Transforms a 2D time-series array into 3D sequences required by Keras LSTMs.
    
    Args:
        data (np.ndarray): Scaled 2D array of features provided by Developer 1.
        time_steps (int): The lookback period (number of past days to consider). Defaults to 60.
        target_col_index (int): Index of the target variable ('Close' price) in the feature array. 
            Based on the 9 features (Open, High, Low, Close, Volume, RSI_14, MACD, MACDh, MACDs),
            'Close' is at index 3.
            
    Returns:
        Tuple[np.ndarray, np.ndarray]: 
            - X: The sequenced feature tensor of shape (samples, time_steps, features).
            - y: The target array of shape (samples,) representing the next day's 'Close' price.
    """
    X, y = [], []
    for i in range(time_steps, len(data)):
        # Extract features for the past 'time_steps' observation windows
        X.append(data[i - time_steps:i, :])
        # Extract the target value for the current day
        y.append(data[i, target_col_index])
        
    return np.array(X), np.array(y)


def split_data(X: np.ndarray, y: np.ndarray, train_ratio: float = 0.8) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Splits the sequenced dataset into training and testing partitions.
    
    Because this is financial time-series data, it is IMPERATIVE that we do not shuffle 
    the data. Temporal order must be strictly preserved to prevent data leakage 
    (training on future data to predict the past).
    
    Args:
        X (np.ndarray): Sequenced feature tensor.
        y (np.ndarray): Target array.
        train_ratio (float): Proportion of data to use for training (default 0.8).
        
    Returns:
        Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]: X_train, X_test, y_train, y_test.
    """
    split_index = int(len(X) * train_ratio)
    
    # Explicit sequential split, avoiding any shuffling implementations
    X_train, X_test = X[:split_index], X[split_index:]
    y_train, y_test = y[:split_index], y[split_index:]
    
    return X_train, X_test, y_train, y_test


def build_model(input_shape: Tuple[int, int]) -> Sequential:
    """
    Designs a deep Long Short-Term Memory (LSTM) network architecture.
    
    Architectural Choices:
    - Two sequential LSTM layers allow the network to learn higher-order temporal 
      representations. The first layer explicitly returns sequences to pass them 
      to the second layer.
    - Dropout layers (20%) are aggressively applied after each LSTM layer to 
      randomly drop units during training. This is a crucial regularization 
      technique to explicitly prevent the model from overfitting on noisy stock data.
    - Final Dense layer with 1 unit outputs the continuous, continuous scaled price prediction.
    
    Args:
        input_shape (Tuple[int, int]): Shape of the input sequences (time_steps, features),
                                       e.g., (60, 9).
        
    Returns:
        Sequential: An uncompiled Keras LSTM model.
    """
    model = Sequential()
    
    # First LSTM layer: returns full sequence to feed into the next LSTM layer
    model.add(LSTM(units=50, return_sequences=True, input_shape=input_shape))
    model.add(Dropout(0.2))
    
    # Second LSTM layer: summarizes the full sequence into a single vector
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dropout(0.2))
    
    # Output layer: a single continuous neuron for the predicted scaled 'Close' price
    model.add(Dense(units=1))
    
    return model


def main():
    # 1. Pipeline Input
    # Fetch real data using ml_data_pipeline as specified by Developer 1.
    from ml_data_pipeline import generate_ml_dataset
    print("Initializing LSTM training pipeline...")
    ticker_symbol = "AAPL"
    print(f"Fetching data for {ticker_symbol} from 2010 to 2023-12-31...")
    input_data, scaler = generate_ml_dataset(ticker_symbol, "2010-01-01", "2023-12-31")
    print(f"Received preprocessed data array of shape: {input_data.shape}")
    
    # 2. Sequence Generation (Lookback period = 60 days, 'Close' price index = 3)
    time_steps = 60
    target_index = 3
    X, y = create_sequences(input_data, time_steps=time_steps, target_col_index=target_index)
    print(f"Generated 3D input tensor of shape: {X.shape}")
    
    # 3. Train/Test Split (80% / 20%)
    X_train, X_test, y_train, y_test = split_data(X, y, train_ratio=0.8)
    print(f"Training split: {X_train.shape[0]} samples. Testing split: {X_test.shape[0]} samples.")
    
    # 4. Architecture & Compilation
    # Extract structural dimensions (time_steps, features) dynamically
    input_shape = (X_train.shape[1], X_train.shape[2])
    model = build_model(input_shape=input_shape)
    
    # Adam optimizer works well for RNNs/LSTMs, MeanSquaredError is standard for regression tasks
    model.compile(optimizer='adam', loss='mean_squared_error')
    model.summary()
    
    # EarlyStopping callback halts training if validation loss ceases to improve over 'patience' epochs,
    # ensuring the model automatically keeps the best weights (another defense against overfitting).
    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=10, 
        restore_best_weights=True,
        verbose=1
    )
    
    # 5. Training Execution
    print("\nStarting model training...")
    history = model.fit(
        X_train, y_train,
        epochs=50,
        batch_size=32,
        validation_data=(X_test, y_test),
        callbacks=[early_stop],
        verbose=1
    )
    
    # 6. Deliverable
    model_save_path = 'dot_market_lstm.keras'
    model.save(model_save_path)
    print(f"\nTraining pipeline complete. Model successfully saved as: '{model_save_path}'")

if __name__ == "__main__":
    main()
