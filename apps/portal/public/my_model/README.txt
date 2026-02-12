This folder is where you should place your trained model files.
1. Go to https://teachablemachine.withgoogle.com/train/image
2. Train your model with classes like "Rice Blast", "Healthy Maize", etc.
3. Click "Export Model" -> "TensorFlow.js" -> "Download" -> "Download my model".
4. Unzip the downloaded file.
5. Copy `model.json`, `metadata.json`, and `weights.bin` into this folder (`public/my_model/`).
