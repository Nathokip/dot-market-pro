import tensorflow as tf
from ml_data_pipeline import generate_ml_dataset
try:
    dataset, fitted_scaler = generate_ml_dataset("AAPL", "2010-01-01", "2023-12-31")
    print(f"Success: {dataset.shape}")
except Exception as e:
    print(f"Error: {e}")
