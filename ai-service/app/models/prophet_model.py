import numpy as np
import pandas as pd
from prophet import Prophet
import warnings
warnings.filterwarnings('ignore')

class ProphetPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        
    def prepare_data(self, data):
        """
        Prepare data for Prophet
        """
        df = pd.DataFrame()
        df['ds'] = data.index
        df['y'] = data['Close'].values
        df['ds'] = pd.to_datetime(df['ds'])
        return df
    
    def train(self, data):
        """
        Train Prophet model on historical data
        """
        df = self.prepare_data(data)
        
        self.model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True,
            changepoint_prior_scale=0.05
        )
        
        self.model.fit(df)
        
        return self.model
    
    def predict(self, data, days=5):
        """
        Predict future prices
        """
        if self.model is None:
            self.train(data)
        
        future = self.model.make_future_dataframe(periods=days)
        forecast = self.model.predict(future)
        
        predictions = forecast['yhat'].iloc[-days:].values
        
        return {f"day_{i+1}": float(predictions[i]) for i in range(days)}
    
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
        self.train(data)