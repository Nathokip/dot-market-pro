import pandas as pd
import logging

class IndicatorService:
    def __init__(self):
        self.cache = {}
    
    def calculate_all(self, data):
        """
        Calculate all technical indicators
        """
        close = data['Close']
        
        # Simple Moving Average
        sma_20 = close.rolling(window=20).mean().iloc[-1]
        sma_50 = close.rolling(window=50).mean().iloc[-1]
        
        # Exponential Moving Average
        ema_12 = close.ewm(span=12, adjust=False).mean().iloc[-1]
        ema_26 = close.ewm(span=26, adjust=False).mean().iloc[-1]
        
        # MACD
        macd = ema_12 - ema_26
        signal_line = macd.ewm(span=9, adjust=False).mean().iloc[-1]
        
        # RSI
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = (100 - (100 / (1 + rs))).iloc[-1]
        
        # Bollinger Bands
        sma = close.rolling(window=20).mean()
        std = close.rolling(window=20).std()
        upper_band = (sma + (std * 2)).iloc[-1]
        lower_band = (sma - (std * 2)).iloc[-1]
        
        return {
            "sma_20": float(sma_20),
            "sma_50": float(sma_50),
            "ema_12": float(ema_12),
            "ema_26": float(ema_26),
            "macd": float(macd.iloc[-1]),
            "macd_signal": float(signal_line),
            "rsi": float(rsi),
            "bollinger_upper": float(upper_band),
            "bollinger_lower": float(lower_band),
            "bollinger_middle": float(sma.iloc[-1])
        }