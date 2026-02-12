document.getElementById("cropForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const N = parseFloat(document.getElementById("n").value);
    const P = parseFloat(document.getElementById("p").value);
    const K = parseFloat(document.getElementById("k").value);
    const temperature = parseFloat(document.getElementById("temperature").value);
    const humidity = parseFloat(document.getElementById("humidity").value);
    const ph = parseFloat(document.getElementById("ph").value);

    // Add your crop images here
    const cropImages = {
        "rice": "rice.jpg",
        "wheat": "wheat.jpg",
        "maize": "maize.jpeg",
        "cotton": "cotton.jpg"
    };

    fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ N, P, K, temperature, humidity, ph })
    })
        .then(res => res.json())
        .then(data => {
            const resultBox = document.getElementById("result");
            resultBox.style.display = "block";
            resultBox.innerHTML = `
            <div style="margin-bottom: 12px;">
                <span style="display:block; font-size:14px; color:#95a0b5; margin-bottom:4px;">Recommended Crop</span>
                <strong style="font-size:24px; color:#fff;">${data.crop}</strong>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
                <span style="display:block; font-size:14px; color:#95a0b5; margin-bottom:4px;">Recommended Fertilizer</span>
                <strong style="font-size:22px; color:#4ade80;">${data.fertilizer}</strong>
            </div>
        `;

            // Show crop image
            const cropName = data.crop.toLowerCase();

            if (cropImages[cropName] && cropImages[cropName] !== "") {
                document.getElementById("cropImage").src = cropImages[cropName];
                document.getElementById("cropImageBox").style.display = "block";
            } else {
                document.getElementById("cropImageBox").style.display = "none";
            }
        })
        .catch(err => {
            alert("Error connecting to backend. Is it running?");
        });
});
