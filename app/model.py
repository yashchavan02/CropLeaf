import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
from tensorflow import keras

_model = None

def get_model():
    global _model
    if _model is None:
        _model = tf.keras.models.load_model("CropLeaf-C1.h5")
        _model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
        print("CropLeaf-C1 Model loaded successfully")
    return _model
