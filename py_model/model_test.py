import tensorflow as tf

# Load the model
model = tf.keras.models.load_model("dot_market_lstm.keras")

# Verify it's working
model.summary()