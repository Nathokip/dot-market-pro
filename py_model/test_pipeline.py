import yfinance as yf
import pandas as pd
import pandas_ta as ta
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from ml_data_pipeline import generate_ml_dataset

print("Imports done")
dataset, fitted_scaler = generate_ml_dataset("AAPL", "2020-01-01", "2023-01-01")
print("Function done")
