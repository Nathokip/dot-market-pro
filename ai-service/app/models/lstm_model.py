import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
import warnings
warnings.filterwarnings('ignore')

class LSTMPredictor:
    def __init__(self, sequence_length=60, batch_size=32, epochs=50):
        self.sequence_length = sequence_length
        self.batch_size = batch_size
        self.epochs = epochs
        self.model = None
        self.scaler = MinMaxScaler()
        
    def prepare_data(self, data, sequence_length):
        """
        Prepare data for LSTM training
        """
        # Use close prices
        prices = data['Close'].values.reshape(-1, 1)
        
        # Scale the data
        scaled_prices = self.scaler.fit_transform(prices)
        
        X, y = [], []
        for i in range(sequence_length, len(scaled_prices)):
            X.append(scaled_prices[i-sequence_length:i, 0])
            y.append(scaled_prices[i, 0])
        
        X = np.array(X)
        y = np.array(y)
        
        # Reshape X for LSTM (samples, time steps, features)
        X = X.reshape((X.shape[0], X.shape[1], 1))
        
        return X, y
    
    def build_model(self, input_shape):
        """
        Build LSTM model architecture
        """
        model = Sequential([
            LSTM(units=50, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(units=50, return_sequences=True),
            Dropout(0.2),
            LSTM(units=50),
            Dropout(0.2),
            Dense(units=1)
        ])
        
        model.compile(optimizer=Adam(learning_rate=0.001), loss='mean_squared_error')
        return model
    
    def train(self, data):
        """
        Train LSTM model on historical data
        """
        # Prepare data
        X, y = self.prepare_data(data, self.sequence_length)
        
        # Split into train and validation
        split = int(0.8 * len(X))
        X_train, X_val = X[:split], X[split:]
        y_train, y_val = y[:split], y[split:]
        
        # Build and train model
        self.model = self.build_model((X_train.shape[1], 1))
        
        history = self.model.fit(
            X_train, y_train,
            epochs=self.epochs,
            batch_size=self.batch_size,
            validation_data=(X_val, y_val),
            verbose=0
        )
        
        return history
    
    def predict(self, data, days=5):
        """
        Predict future prices
        """
        if self.model is None:
            self.train(data)
        
        # Get last sequence_length days
        last_sequence = data['Close'].values[-self.sequence_length:].reshape(-1, 1)
        last_sequence_scaled = self.scaler.transform(last_sequence)
        
        predictions = []
        current_sequence = last_sequence_scaled.copy()
        
        for _ in range(days):
            # Reshape for LSTM
            current_sequence_reshaped = current_sequence.reshape((1, self.sequence_length, 1))
            
            # Predict next day
            next_price_scaled = self.model.predict(current_sequence_reshaped, verbose=0)[0, 0]
            
            # Store prediction
            predictions.append(next_price_scaled)
            
            # Update sequence for next prediction
            current_sequence = np.roll(current_sequence, -1)
            current_sequence[-1] = next_price_scaled
        
        # Inverse transform predictions
        predictions = np.array(predictions).reshape(-1, 1)
        predictions = self.scaler.inverse_transform(predictions)
        
        return {f"day_{i+1}": float(predictions[i, 0]) for i in range(days)}
    
    def backtest(self, train_data, test_data):
        """
        Backtest model on historical data
        """
        # Train on training data
        self.train(train_data)
        
        # Predict on test data
        predictions = []
        for i in range(len(test_data)):
            # Get historical data up to this point
            historical_data = pd.concat([train_data, test_data[:i]])
            
            # Predict next day
            pred = self.predict(historical_data, days=1)
            predictions.append(pred['day_1'])
        
        return {
            'values': predictions,
            'dates': test_data.index.tolist()
        }