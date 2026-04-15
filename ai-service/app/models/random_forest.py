import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
import warnings
warnings.filterwarnings('ignore')

class RandomForestPredictor:
    def __init__(self, n_estimators=100, sequence_length=30):
        self.n_estimators = n_estimators
        self.sequence_length = sequence_length
        self.model = None
        self.scaler = MinMaxScaler()
        
    def prepare_data(self, data, sequence_length):
        """
        Prepare data for Random Forest training
        """
        prices = data['Close'].values.reshape(-1, 1)
        scaled_prices = self.scaler.fit_transform(prices)
        
        X, y = [], []
        for i in range(sequence_length, len(scaled_prices)):
            X.append(scaled_prices[i-sequence_length:i, 0])
            y.append(scaled_prices[i, 0])
        
        return np.array(X), np.array(y)
    
    def train(self, data):
        """
        Train Random Forest model on historical data
        """
        X, y = self.prepare_data(data, self.sequence_length)
        
        split = int(0.8 * len(X))
        X_train, X_val = X[:split], X[split:]
        y_train, y_val = y[:split], y[split:]
        
        self.model = RandomForestRegressor(
            n_estimators=self.n_estimators,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train, y_train)
        
        return self.model.score(X_val, y_val)
    
    def predict(self, data, days=5):
        """
        Predict future prices
        """
        if self.model is None:
            self.train(data)
        
        last_sequence = data['Close'].values[-self.sequence_length:].reshape(-1, 1)
        last_sequence_scaled = self.scaler.transform(last_sequence)
        
        predictions = []
        current_sequence = last_sequence_scaled.copy()
        
        for _ in range(days):
            current_sequence_reshaped = current_sequence.reshape(1, -1)
            next_price_scaled = self.model.predict(current_sequence_reshaped)[0]
            
            predictions.append(next_price_scaled)
            current_sequence = np.roll(current_sequence, -1)
            current_sequence[-1] = next_price_scaled
        
        predictions = np.array(predictions).reshape(-1, 1)
        predictions = self.scaler.inverse_transform(predictions)
        
        return {f"day_{i+1}": float(predictions[i, 0]) for i in range(days)}
    
    def backtest(self, train_data, test_data):
        """
        Backtest model on historical data
        """
        self.train(train_data)
        
        predictions = []
        for i in range(len(test_data)):
            historical_data = pd.concat([train_data, test_data[:i]])
            pred = self.predict(historical_data, days=1)
            predictions.append(pred['day_1'])
        
        return {
            'values': predictions,
            'dates': test_data.index.tolist()
        }
    
    def retrain(self, data):
        """
        Retrain the model with fresh data
        """
        prices = data['Close'].values.reshape(-1, 1)
        self.scaler = MinMaxScaler()
        scaled_prices = self.scaler.fit_transform(prices)
        
        X, y = [], []
        for i in range(self.sequence_length, len(scaled_prices)):
            X.append(scaled_prices[i-self.sequence_length:i, 0])
            y.append(scaled_prices[i, 0])
        
        X = np.array(X)
        y = np.array(y)
        
        split = int(0.85 * len(X))
        X_train, X_val = X[:split], X[split:]
        y_train, y_val = y[:split], y[split:]
        
        self.model = RandomForestRegressor(
            n_estimators=self.n_estimators,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train, y_train)